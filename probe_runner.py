import subprocess, re, urllib.request, ssl
from pathlib import Path
ctx=ssl.create_default_context()
UA={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0 Safari/537.36"}
def sh(cmd,t=120):
    try:
        p=subprocess.run(cmd,shell=True,capture_output=True,text=True,timeout=t)
        return p.returncode,(p.stdout+p.stderr).strip()
    except Exception as e: return -1,f"{type(e).__name__}: {str(e)[:120]}"
def get(u,t=30):
    try:
        req=urllib.request.Request(u,headers=UA)
        with urllib.request.urlopen(req,timeout=t,context=ctx) as r: return r.read().decode("utf-8",errors="ignore"),r.status
    except Exception as e: return f"{type(e).__name__}: {str(e)[:120]}",0

L=["# CNB 同步方案验证（GitHub Actions runner 执行）",""]
TARGET="https://cnb.cool/tencent/cherry-markdown/cherry-markdown.git"

L.append("## A. CNB 的 git 协议（公开仓库，只读）")
L.append("")
for label,cmd in [("git ls-remote HEAD",f"git ls-remote {TARGET} HEAD"),
                  ("git ls-remote refs/heads/dev",f"git ls-remote {TARGET} refs/heads/dev"),
                  ("git ls-remote --heads (前5行)",f"git ls-remote --heads {TARGET} | head -5")]:
    rc,out=sh(cmd,90)
    L.append(f"### {label}")
    L.append(f"- exit={rc}")
    for line in out.splitlines()[:6]: L.append(f"  `{line[:150]}`")
    L.append("")
rc,out=sh(f"git clone --depth 1 {TARGET} /tmp/cnbrepo",150)
L.append(f"### git clone --depth 1")
L.append(f"- exit={rc} | log: {out[-180:].replace(chr(10),' ')}")
if rc==0:
    n=len(list(Path('/tmp/cnbrepo').rglob('*')))
    top=", ".join(sorted(x.name for x in Path('/tmp/cnbrepo').iterdir())[:10])
    L.append(f"- 条目数={n} | 顶层: {top}")
L.append("")

L.append("## B. tencentcom/git-sync 镜像")
L.append("")
rc,out=sh("docker pull tencentcom/git-sync",240)
L.append(f"- `docker pull tencentcom/git-sync` -> exit={rc} | {out[-220:].replace(chr(10),' ')}")
if rc==0:
    for label,cmd in [("inspect Env","docker inspect --format '{{json .Config.Env}}' tencentcom/git-sync"),
                      ("inspect Entrypoint/Cmd","docker inspect --format '{{json .Config.Entrypoint}} {{json .Config.Cmd}}' tencentcom/git-sync"),
                      ("run --help","docker run --rm tencentcom/git-sync --help")]:
        rc2,o2=sh(cmd,90)
        L.append(f"- **{label}** -> exit={rc2}")
        for line in o2.splitlines()[:12]: L.append(f"  `{line[:200]}`")
    L.append("")
    L.append("### 从镜像内查找参数定义（PLUGIN_ 全集）")
    rc3,o3=sh("docker run --rm --entrypoint sh tencentcom/git-sync -c 'ls -la / && (grep -rho \"PLUGIN_[A-Z_]*\" / 2>/dev/null | sort -u | head -60)'",120)
    L.append(f"- exit={rc3}")
    for line in o3.splitlines()[:60]: L.append(f"  `{line[:180]}`")
else:
    L.append("- 镜像拉取失败，跳过后续（不阻塞其它验证）")
L.append("")

L.append("## C. CNB 官方文档 / OpenAPI")
L.append("")
for u in ["https://api.cnb.cool/", "https://docs.cnb.cool/",
          "https://docs.cnb.cool/zh/guide/repo-mirror.html",
          "https://docs.cnb.cool/zh/guide/token.html"]:
    txt,code=get(u,30)
    L.append(f"- `{u}` -> HTTP {code} | {len(txt)} 字符")
    for kw in ["git-sync","同步","token","Access Token","仓库同步","mirror"]:
        m=re.search(rf".{{0,60}}{re.escape(kw)}.{{0,110}}",txt,re.I|re.S)
        if m: L.append(f"  - [{kw}] …{' '.join(m.group(0).split())[:170]}…")
L.append("")
L.append("## D. 结论所需：无凭证写 CNB 会停在哪一层")
L.append("")
rc,out=sh("git ls-remote https://cnb.cool/tencent/cherry-markdown/cherry-markdown.git 2>&1 | head -3",60)
L.append(f"- 匿名只读 exit={rc}（成功=公开仓库可读）")
L.append("- 推送需 CNB 的访问令牌（本轮未提供，不尝试写入，避免误操作）")
L.append("")
Path("cnb-probe-result.md").write_text("\n".join(L),encoding="utf-8")
print("\n".join(L))
