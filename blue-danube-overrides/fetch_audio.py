#!/usr/bin/env python3
"""在 GitHub Actions runner 上，从 Wikimedia Commons 取标注为 public domain 的
《蓝色多瑙河》真实录音。本地沙盒出口连不上 wikimedia.org，所以这一步必须在 runner 上跑。

用法: python3 fetch_audio.py <输出路径>
"""
import json
import sys
import urllib.parse
import urllib.request

OUT = sys.argv[1] if len(sys.argv) > 1 else "blue-danube.mp3"
UA = "remotion-music-viz-demo/1.0 (educational demo; contact: github.com/EdisonFan)"

# Commons 分类 "Audio files of An der schönen blauen Donau" 里的 US Marine Band 录音。
# 多个写法是同一演奏的不同上传版本，逐个尝试，取第一个能解析到的。
TITLES = [
    'File:"An der schönen, blauen Donau" performed by the U.S.Marine Band.mp3',
    'File:"An der schönen, blauen Donau", performed by the US Marine Band.mp3',
    'File:"An der schönen, blauen Donau" performed by the US Marine Band.mp3',
    'File:"An der schönen, blauen Donau" performed by the U.S. Marine Band.mp3',
]


def api_url(title):
    return (
        "https://commons.wikimedia.org/w/api.php"
        "?action=query&format=json&prop=imageinfo&iiprop=url&titles="
        + urllib.parse.quote(title, safe="")
    )


def get(url, timeout=120):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


for title in TITLES:
    try:
        data = json.loads(get(api_url(title), timeout=60))
        pages = data.get("query", {}).get("pages", {})
        found = None
        for p in pages.values():
            if "imageinfo" in p:
                found = p["imageinfo"][0]["url"]
                break
        if not found:
            print(f"未解析到 URL: {title}")
            continue
        print("Commons 直链:", found)
        blob = get(found, timeout=300)
        if len(blob) < 1_000_000:
            print(f"文件过小({len(blob)} B)，跳过")
            continue
        # MP3 帧同步或 ID3 头
        if not (blob[:3] == b"ID3" or blob[:2] in (b"\xff\xfb", b"\xff\xf3", b"\xff\xf2")):
            print(f"文件头不像 MP3: {blob[:8]!r}，跳过")
            continue
        with open(OUT, "wb") as f:
            f.write(blob)
        print(f"OK  {title}  ->  {OUT}  ({len(blob):,} B)")
        sys.exit(0)
    except Exception as e:  # noqa: BLE001
        print(f"尝试失败 {title}: {type(e).__name__}: {e}")

print("ERROR: 所有候选音源均未能取得", file=sys.stderr)
sys.exit(1)
