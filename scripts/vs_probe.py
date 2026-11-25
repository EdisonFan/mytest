#!/usr/bin/env python3
"""VoiceStudio MCP Worker PoC — 在 GitHub Actions runner 内部调用本地后端。

遵守 docs/install/agent.md 的验收顺序：
  /health → /openapi.json → voices/models → 生成短音频并探测输出。
所有响应与失败原因都落盘，绝不假报成功。
"""
import base64
import json
import os
import pathlib
import sys
import time
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:3900"
KEY = os.environ.get("OMNI_KEY", "")
OUT = pathlib.Path("rendered/voicestudio-poc")
OUT.mkdir(parents=True, exist_ok=True)

H = {"Authorization": f"Bearer {KEY}", "Accept": "application/json"}


def call(method, path, body=None, extra=None, timeout=120):
    url = BASE + path
    data = json.dumps(body).encode() if body is not None else None
    headers = dict(H)
    if data:
        headers["Content-Type"] = "application/json"
    if extra:
        headers.update(extra)
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read().decode("utf-8", "replace")
            hdrs = dict(r.headers)
            return r.status, raw, hdrs
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace"), dict(e.headers)
    except Exception as e:
        return -1, f"{type(e).__name__}: {e}", {}


def save(name, obj, raw=False):
    p = OUT / name
    if raw:
        p.write_text(obj if isinstance(obj, str) else json.dumps(obj, indent=2, ensure_ascii=False), encoding="utf-8")
    else:
        p.write_text(json.dumps(obj, indent=2, ensure_ascii=False, default=str), encoding="utf-8")
    print(f"  saved {name} ({p.stat().st_size:,} B)")


def parse_mcp(raw):
    """响应可能是 application/json，也可能是 SSE: event: message\\ndata: {...}"""
    raw = raw.strip()
    if raw.startswith("{"):
        return json.loads(raw)
    for line in raw.splitlines():
        if line.startswith("data:"):
            s = line[5:].strip()
            if s.startswith("{"):
                return json.loads(s)
    raise ValueError(f"unparseable MCP response: {raw[:300]}")


def note(msg):
    print(msg, flush=True)
    with (OUT / "steps.log").open("a", encoding="utf-8") as f:
        f.write(msg + "\n")


def wait_health():
    note("== 等待 /health（官方验收第 1 步）==")
    deadline = time.time() + 420
    while time.time() < deadline:
        st, body, _ = call("GET", "/health", timeout=15)
        if st == 200:
            note(f"  HTTP 200: {body[:300]}")
            save("health.json", {"status": st, "body": body[:4000]}, raw=False)
            return True
        note(f"  {st} {body[:160]}")
        time.sleep(8)
    save("health.json", {"status": "timeout", "last": body[:1000]})
    return False


def mcp_handshake():
    note("== MCP streamable-HTTP 握手 ==")
    hdr = {
        "Accept": "application/json, text/event-stream",
        "Content-Type": "application/json",
    }
    st, raw, rh = call("POST", "/mcp", {
        "jsonrpc": "2.0", "id": 1, "method": "initialize",
        "params": {
            "protocolVersion": "2025-06-18",
            "capabilities": {},
            "clientInfo": {"name": "gh-actions-voicestudio-poc", "version": "1.0"},
        },
    }, extra=hdr, timeout=60)
    note(f"  initialize -> HTTP {st}")
    if st not in (200, 202, 204):
        save("mcp-initialize.txt", f"HTTP {st}\n{raw[:2000]}", raw=True)
        return None
    init = None
    try:
        init = parse_mcp(raw)
    except Exception as e:
        note(f"  initialize 解析失败: {e}")
    sid = None
    for k, v in rh.items():
        if k.lower() == "mcp-session-id":
            sid = v
    note(f"  session-id: {'有' if sid else '无'}  serverInfo: {json.dumps((init or {}).get('result', {}).get('serverInfo', {}), ensure_ascii=False)[:200]}")
    save("mcp-initialize.json", {"http": st, "session_id": bool(sid), "response": init or raw[:2000]})

    sess = {"mcp-session-id": sid} if sid else {}
    sess.update(hdr)
    call("POST", "/mcp", {"jsonrpc": "2.0", "method": "notifications/initialized"}, extra=sess, timeout=30)

    st2, raw2, _ = call("POST", "/mcp", {
        "jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}
    }, extra=sess, timeout=60)
    note(f"  tools/list -> HTTP {st2}")
    tools = []
    try:
        res = parse_mcp(raw2)
        tools = [t.get("name") for t in res.get("result", {}).get("tools", [])]
    except Exception as e:
        note(f"  tools/list 解析失败: {e}")
    note(f"  发现 {len(tools)} 个工具: {tools}")
    save("mcp-tools.json", {"http": st2, "tools": tools, "raw_head": raw2[:3000]})
    return sess if tools else None


def fingerprint_for(repo_id):
    """AcceptRequest 要求 v2:<64hex>，从 acceptance / details 端点取当前条款指纹。"""
    for path in (f"/models/licenses/acceptance/{repo_id}",
                 f"/models/licenses/details/{repo_id}"):
        st, raw, _ = call("GET", path, timeout=60)
        if st == 200:
            try:
                o = json.loads(raw)
                fp = o.get("fingerprint") or o.get("current", {}).get("fingerprint")
                if fp:
                    return fp, o
            except Exception:
                pass
    return None, {}


def accept_licences(repo_ids):
    """显式接受模型条款。仅限用户授权的临时 runner 非商用 PoC，全程留痕。

    OmniVoice 上游标注 CC-BY-NC（非商用）+ Higgs Audio 2 + Meta Llama 3，
    正式使用请在 Model Catalogue 自行复核。
    """
    results = []
    for repo_id in dict.fromkeys(repo_ids):
        fp, detail = fingerprint_for(repo_id)
        note(f"== 模型许可: {repo_id} ==")
        note(f"  fingerprint: {fp}")
        note(f"  license: {json.dumps(detail.get('license', detail.get('license_info', {})), ensure_ascii=False)[:220]}")
        if not fp:
            results.append({"repo_id": repo_id, "ok": False, "reason": "no fingerprint"})
            continue
        st, raw, _ = call("POST", "/models/licenses/accept",
                          {"repo_id": repo_id, "fingerprint": fp, "accepted": True},
                          timeout=60)
        note(f"  accept -> HTTP {st}: {raw[:240]}")
        results.append({"repo_id": repo_id, "ok": st in (200, 201, 204),
                        "http": st, "fingerprint": fp, "response": raw[:1200]})
    save("licence-accept.json", {
        "scope": "用户授权的临时 runner 非商用 PoC；不代表用户对正式环境的许可决定",
        "results": results,
    })
    return all(r["ok"] for r in results) if results else False


def repos_from_error(text):
    """从 403 错误里抽出 'Licence not accepted for A, B' 的仓库列表。"""
    import re
    m = re.search(r"Licence not accepted for ([^.]+)", text, re.I)
    if not m:
        return ["k2-fsa/OmniVoice"]
    return [x.strip() for x in m.group(1).split(",")
            if re.match(r"^[\w.-]+/[\w.-]+$", x.strip())]


def install_default_model(repo_id="k2-fsa/OmniVoice"):
    """显式安装模型并轮询状态，官方 agent.md 第 5 步。"""
    note(f"== POST /models/install {repo_id} ==")
    st, raw, _ = call("POST", "/models/install", {"repo_id": repo_id}, timeout=120)
    note(f"  HTTP {st}: {raw[:300]}")
    save("model-install-start.json", {"http": st, "response": raw[:2000]})
    deadline = time.time() + 1500
    while time.time() < deadline:
        st2, raw2, _ = call("GET", "/models/install/status", timeout=60)
        low = raw2.lower()
        if '"failed"' in low or '"error"' in low:
            note(f"  install status 失败: {raw2[:400]}")
            break
        st3, raw3, _ = call("GET", "/models", timeout=60)
        try:
            models = json.loads(raw3).get("models", [])
            hit = next((m for m in models if m.get("repo_id") == repo_id), None)
            if hit and hit.get("installed"):
                note(f"  ✓ installed=true, {hit.get('size_on_disk_bytes', 0):,} B on disk")
                save("model-install-status.json", {"installed": True, "entry": hit})
                return True
        except Exception:
            pass
        note(f"  安装中… status {raw2[:160]}")
        time.sleep(20)
    save("model-install-status.json", {"installed": False, "last_status": raw2[:2000] if 'raw2' in dir() else ""})
    return False


def extract_wav(obj):
    """从 MCP tools/call 的嵌套响应里挖出 wav_base64 / audio_url / output_path。"""
    hits = []

    def walk(o):
        if isinstance(o, dict):
            for k, v in o.items():
                if k in ("wav_base64", "audio_base64", "base64") and isinstance(v, str) and len(v) > 200:
                    hits.append(("base64", v))
                if k in ("audio_url", "output_path") and isinstance(v, str):
                    hits.append((k, v))
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)
        elif isinstance(o, str) and o.lstrip().startswith("{"):
            try:
                walk(json.loads(o))
            except Exception:
                pass
    walk(obj)
    return hits


def generate_via_mcp(sess):
    note("== MCP tools/call: generate_speech ==")
    text = ("Hello from a GitHub Actions runner. This is VoiceStudio speaking "
            "through its MCP endpoint. The backend is local, the worker is remote.")
    st, raw, _ = call("POST", "/mcp", {
        "jsonrpc": "2.0", "id": 3, "method": "tools/call",
        "params": {"name": "generate_speech", "arguments": {
            "text": text, "format": "wav",
        }},
    }, extra=sess, timeout=1800)
    note(f"  generate_speech -> HTTP {st}, 响应 {len(raw):,} B")
    save("mcp-generate-response.txt", raw[:20000], raw=True)
    if st != 200:
        return False
    try:
        res = parse_mcp(raw)
    except Exception as e:
        note(f"  解析失败: {e}")
        return False
    if "error" in res or res.get("result", {}).get("isError"):
        note(f"  工具返回错误: {json.dumps(res, ensure_ascii=False)[:600]}")
        return False
    hits = extract_wav(res)
    note(f"  提取到 {len(hits)} 个音频字段: {[k for k, _ in hits]}")
    for kind, val in hits:
        if kind == "base64":
            try:
                data = base64.b64decode(val)
                p = OUT / "voicestudio-mcp-speech.wav"
                p.write_bytes(data)
                note(f"  ✓ 写出 WAV {p.stat().st_size:,} B, 头部 {data[:12]!r}")
                return p.stat().st_size > 44 and b"RIFF" in data[:12]
            except Exception as e:
                note(f"  base64 解码失败: {e}")
    return False


def generate_via_rest():
    note("== 回退：REST POST /v1/audio/speech ==")
    st, raw, hdrs = call("POST", "/v1/audio/speech", {
        "model": "tts-1", "voice": "alloy",
        "input": "Hello from a GitHub Actions runner, via the REST compatibility endpoint.",
        "response_format": "wav",
    }, timeout=1200)
    note(f"  REST -> HTTP {st}, {len(raw):,} B, content-type={hdrs.get('Content-Type', '')}")
    if st == 200 and ("audio" in hdrs.get("Content-Type", "") or raw[:4] == "RIFF"):
        # urllib 已把二进制 decode 成 str，改用独立请求取字节
        req = urllib.request.Request(BASE + "/v1/audio/speech",
            data=json.dumps({"model": "tts-1", "voice": "alloy",
                             "input": "Hello from a GitHub Actions runner, via the REST compatibility endpoint.",
                             "response_format": "wav"}).encode(),
            method="POST", headers={**H, "Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=1200) as r:
            data = r.read()
        p = OUT / "voicestudio-rest-speech.wav"
        p.write_bytes(data)
        note(f"  ✓ 写出 WAV {p.stat().st_size:,} B, 头部 {data[:12]!r}")
        return b"RIFF" in data[:12] and len(data) > 44
    save("rest-generate-response.txt", f"HTTP {st}\n{raw[:4000]}", raw=True)
    return False


def run():
    ok = wait_health()
    if not ok:
        note("!! 后端未就绪，后续步骤跳过")
        save("summary.json", {"health": False, "reason": "backend not ready"})
        return 1

    note("== /openapi.json（官方验收第 2 步：发现真实契约）==")
    st, raw, _ = call("GET", "/openapi.json", timeout=90)
    note(f"  HTTP {st}, {len(raw):,} B")
    save("openapi.json", raw[:2_000_000], raw=True)
    paths = []
    if st == 200:
        try:
            paths = sorted(json.loads(raw).get("paths", {}).keys())
            interesting = [p for p in paths if any(k in p.lower() for k in
                           ("model", "speech", "voice", "health", "clone"))]
            save("openapi-paths.json", {"total": len(paths), "interesting": interesting[:120]})
            note(f"  {len(paths)} 条路由，其中 {len(interesting)} 条与本任务相关")
        except Exception as e:
            note(f"  openapi 解析失败: {e}")

    note("== 发现 voices / models ==")
    for path in ("/v1/audio/voices", "/v1/models", "/models"):
        st, raw, _ = call("GET", path, timeout=60)
        note(f"  GET {path} -> HTTP {st}, {len(raw):,} B")
        save("discover-" + path.strip("/").replace("/", "_") + ".json",
             {"http": st, "body": raw[:12000]}, raw=False)

    sess = mcp_handshake()
    if sess:
        st, raw, _ = call("POST", "/mcp", {
            "jsonrpc": "2.0", "id": 9, "method": "tools/call",
            "params": {"name": "check_health", "arguments": {}},
        }, extra=sess, timeout=120)
        note(f"  MCP check_health -> HTTP {st}: {raw[:300]}")
        save("mcp-check-health.txt", raw[:4000], raw=True)

    # 官方规则：下载模型前先报体积与许可。此处是用户已授权的临时 runner PoC，
    # 把已知最小候选与默认模型的体积/许可写进日志，不落到用户机器。
    save("model-plan.json", {
        "note": "用户授权的一次性 PoC；模型落在临时 runner，不落到用户机器",
        "candidates": [
            {"repo_id": "KittenML/kitten-tts-mini-0.8", "size_gb": 0.08,
             "license": "apache-2.0 (上游元数据)", "project_flag": "unreviewed / commercial_use=false",
             "engines": ["kittentts"], "capability": "8 个预置英文音色，非克隆"},
            {"repo_id": "k2-fsa/OmniVoice", "size_gb": 2.4,
             "license": "见 LICENSE-NOTICE.md", "project_flag": "默认引擎",
             "engines": ["omnivoice"], "capability": "声音克隆 / 设计，首次 generate 自动下载"},
        ],
        "chosen": "先让 generate_speech 走官方默认路径（自动下载 ~2.3GB OmniVoice）；失败再回退 REST",
    })

    audio_ok = False
    licences_accepted = False
    model_installed = False

    if sess:
        # 先试一次，拿回真实错误（官方要求先发现契约，不臆造 repo_id）
        audio_ok = generate_via_mcp(sess)
        if not audio_ok:
            err = (OUT / "mcp-generate-response.txt").read_text(
                encoding="utf-8", errors="replace")
            repos = repos_from_error(err)
            note(f"  403 点名的仓库: {repos}")
            licences_accepted = accept_licences(repos)
            if licences_accepted:
                model_installed = install_default_model("k2-fsa/OmniVoice")
                audio_ok = generate_via_mcp(sess)
    if not audio_ok:
        audio_ok = generate_via_rest()

    summary = {
        "health": True,
        "mcp_handshake": bool(sess),
        "licences_accepted": licences_accepted,
        "model_installed": model_installed,
        "audio_generated": audio_ok,
        "audio_files": sorted(p.name for p in OUT.glob("*.wav")),
        "runner": {"os": os.uname().sysname, "arch": os.uname().machine},
    }
    save("summary.json", summary)
    note("== 汇总 ==" + json.dumps(summary, ensure_ascii=False))
    return 0 if audio_ok else 2


if __name__ == "__main__":
    if "--wait" in sys.argv:
        sys.exit(0 if wait_health() else 1)
    else:
        sys.exit(run())
