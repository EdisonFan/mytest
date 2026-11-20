#!/usr/bin/env python3
"""在 GitHub Actions runner 上，取《蓝色多瑙河》的真实公有领域录音。

本地沙盒出口连不上 wikimedia.org / archive.org，所以这一步必须在 runner 上跑。
诊断同时写到 rendered/blue-danube/fetch-audio.log，失败也能被 workflow 收集。

用法: python3 fetch_audio.py <输出路径>
"""
import json
import os
import pathlib
import sys
import urllib.parse
import urllib.request

OUT = sys.argv[1] if len(sys.argv) > 1 else "blue-danube.mp3"
UA = "remotion-music-viz-demo/1.0 (educational demo; contact: github.com/EdisonFan)"
LOG = pathlib.Path("rendered/blue-danube/fetch-audio.log")
LOG.parent.mkdir(parents=True, exist_ok=True)
_logf = open(LOG, "w", encoding="utf-8")


def say(*a):
    line = " ".join(str(x) for x in a)
    print(line, flush=True)
    _logf.write(line + "\n")
    _logf.flush()


def get(url, timeout=120):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def looks_like_mp3(blob):
    return blob[:3] == b"ID3" or blob[:2] in (
        b"\xff\xfb", b"\xff\xf3", b"\xff\xf2", b"\xff\xfa", b"\xff\xe3",
    )


def save(blob, label):
    if len(blob) < 500_000:
        say(f"  文件过小({len(blob):,} B)，跳过 {label}")
        return False
    if not looks_like_mp3(blob):
        say(f"  文件头不像 MP3: {blob[:12]!r}，跳过 {label}")
        return False
    with open(OUT, "wb") as f:
        f.write(blob)
    say(f"OK  {label}  ->  {OUT}  ({len(blob):,} B)")
    return True


# ---- 源 1：Wikimedia Commons，US Marine Band 管乐录音（PD-USGov）----
TITLES = [
    'File:"An der schönen, blauen Donau" performed by the U.S.Marine Band.mp3',
    'File:"An der schönen, blauen Donau", performed by the US Marine Band.mp3',
    'File:"An der schönen, blauen Donau" performed by the US Marine Band.mp3',
    'File:"An der schönen, blauen Donau" performed by the U.S. Marine Band.mp3',
]
say("=== 源 1: Wikimedia Commons API ===")
for title in TITLES:
    try:
        api = (
            "https://commons.wikimedia.org/w/api.php"
            "?action=query&format=json&prop=imageinfo&iiprop=url&titles="
            + urllib.parse.quote(title, safe="")
        )
        data = json.loads(get(api, timeout=60))
        pages = data.get("query", {}).get("pages", {})
        found = next(
            (p["imageinfo"][0]["url"] for p in pages.values() if "imageinfo" in p),
            None,
        )
        say(f"  {title[:60]}... -> {found or '未解析到 URL'}")
        if not found:
            continue
        blob = get(found, timeout=300)
        if save(blob, "Commons / US Marine Band"):
            sys.exit(0)
    except Exception as e:  # noqa: BLE001
        say(f"  尝试失败: {type(e).__name__}: {e}")

# ---- 源 2：Commons Special:FilePath 重定向 ----
say("=== 源 2: Commons Special:FilePath ===")
for title in TITLES[:2]:
    name = title.replace("File:", "")
    try:
        u = "https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(
            name, safe=""
        )
        say("  GET", u[:120])
        blob = get(u, timeout=300)
        if save(blob, "Commons Special:FilePath"):
            sys.exit(0)
    except Exception as e:  # noqa: BLE001
        say(f"  尝试失败: {type(e).__name__}: {e}")

# ---- 源 3：Internet Archive，PD Mark 1.0 录音 ----
say("=== 源 3: archive.org (Public Domain Mark 1.0) ===")
for item in ["AnDerSchnemBlauenDonau", "BlueDanubeWaltz_201811"]:
    try:
        meta = json.loads(get(f"https://archive.org/metadata/{item}", timeout=60))
        files = [f["name"] for f in meta.get("files", []) if f["name"].lower().endswith(".mp3")]
        say(f"  {item}: mp3 候选 {files[:6]}")
        for name in files[:6]:
            u = f"https://archive.org/download/{item}/{urllib.parse.quote(name)}"
            try:
                blob = get(u, timeout=300)
                if save(blob, f"archive.org/{item}/{name}"):
                    sys.exit(0)
            except Exception as e:  # noqa: BLE001
                say(f"    {name}: {type(e).__name__}: {e}")
    except Exception as e:  # noqa: BLE001
        say(f"  metadata 失败 {item}: {type(e).__name__}: {e}")

say("ERROR: 所有候选音源均未能取得")
_logf.close()
sys.exit(1)
