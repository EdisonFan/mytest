#!/usr/bin/env python3
"""用微软 Edge TTS 逐句合成旁白，按每句 6 秒对齐成 60 秒音轨。

在 GitHub Actions runner 上执行（cwd = 仓库根目录）。
输出：tts-output/narration.m4a
"""
import asyncio
import pathlib
import subprocess

import edge_tts

ROOT = pathlib.Path(__file__).resolve().parent.parent
LINES = (ROOT / "tts-worker" / "fable.txt").read_text(encoding="utf-8").strip().splitlines()
OUT = ROOT / "tts-output"
OUT.mkdir(exist_ok=True)

VOICE = "zh-CN-XiaoxiaoNeural"
SEG = 6.0


async def synth(i: int, text: str) -> pathlib.Path:
    p = OUT / f"seg{i:02d}.mp3"
    await edge_tts.Communicate(text, VOICE, rate="-8%").save(str(p))
    return p


def duration(p: pathlib.Path) -> float:
    r = subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=nw=1:nk=1", str(p),
    ])
    return float(r.decode().strip())


async def main() -> None:
    segs = []
    for i, text in enumerate(LINES, 1):
        src = await synth(i, text)
        d = duration(src)
        if d > 5.8:
            tempo = max(0.5, min(1.0, 5.8 / d))
            af = f"atempo={tempo:.4f},apad,atrim=duration={SEG}"
        else:
            af = f"apad,atrim=duration={SEG}"
        dst = OUT / f"pad{i:02d}.m4a"
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", str(src),
             "-af", af, "-c:a", "aac", "-b:a", "128k", str(dst)],
            check=True,
        )
        segs.append(dst)
        print(f"[{i:02d}] 语音 {d:.2f}s -> 对齐 {SEG}s  {text[:20]}")

    lst = OUT / "concat.txt"
    lst.write_text("".join(f"file '{p.name}'\n" for p in segs), encoding="utf-8")
    final = OUT / "narration.m4a"
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
         "-i", str(lst), "-c", "copy", str(final)],
        check=True,
    )
    print(f"完成：{final}  {final.stat().st_size} bytes  共 {len(LINES)} 句")


if __name__ == "__main__":
    asyncio.run(main())
