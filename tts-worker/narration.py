#!/usr/bin/env python3
"""微软 Edge TTS 旁白合成 Worker（v3：不依赖系统 ffprobe/ffmpeg 命令）。

在 GitHub Actions runner 上执行（cwd = 仓库根目录）：
  - 逐句调用微软 TTS 生成 MP3
  - 用 imageio-ffmpeg 自带的 ffmpeg 统一转成 24kHz 单声道 WAV
  - 纯 Python wave 模块把每句补齐/截断到 6 秒并拼接成 60 秒音轨
  - 输出 tts-output/narration.m4a（失败则回退 narration.wav）

依赖：edge-tts、mutagen、imageio-ffmpeg（均由 pip 安装）
"""
import asyncio
import pathlib
import subprocess
import wave

import edge_tts
import imageio_ffmpeg
from mutagen.mp3 import MP3

ROOT = pathlib.Path(__file__).resolve().parent.parent
LINES = (ROOT / "tts-worker" / "fable.txt").read_text(encoding="utf-8").strip().splitlines()
OUT = ROOT / "tts-output"
OUT.mkdir(exist_ok=True)

VOICE = "zh-CN-XiaoxiaoNeural"
RATE = "-8%"
SEG = 6.0
SR = 24000
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()


async def synth(i: int, text: str) -> pathlib.Path:
    p = OUT / f"seg{i:02d}.mp3"
    for attempt in range(3):
        try:
            await edge_tts.Communicate(text, VOICE, rate=RATE).save(str(p))
            if p.exists() and p.stat().st_size > 1000:
                return p
        except Exception as exc:  # 网络抖动 / 服务端限流
            print(f"  第{i}句第{attempt + 1}次重试：{exc}")
        await asyncio.sleep(1.5)
    raise RuntimeError(f"第 {i} 句语音合成失败")


def to_wav(src: pathlib.Path, dst: pathlib.Path, tempo: float) -> None:
    cmd = [FFMPEG, "-y", "-loglevel", "error", "-i", str(src)]
    if tempo < 1.0:
        cmd += ["-af", f"atempo={tempo:.4f}"]
    cmd += ["-ar", str(SR), "-ac", "1", "-c:a", "pcm_s16le", str(dst)]
    subprocess.run(cmd, check=True)


def read_pcm(p: pathlib.Path) -> bytes:
    with wave.open(str(p), "rb") as w:
        assert w.getframerate() == SR and w.getnchannels() == 1
        return w.readframes(w.getnframes())


async def main() -> None:
    target_bytes = int(SR * SEG) * 2  # 16bit 单声道
    pieces = []

    for i, text in enumerate(LINES, 1):
        mp3 = await synth(i, text)
        dur = MP3(mp3).info.length
        tempo = max(0.5, min(1.0, (SEG - 0.2) / dur)) if dur > SEG - 0.2 else 1.0
        wav = OUT / f"seg{i:02d}.wav"
        to_wav(mp3, wav, tempo)

        pcm = read_pcm(wav)
        if len(pcm) < target_bytes:
            pcm += b"\x00" * (target_bytes - len(pcm))
        else:
            pcm = pcm[:target_bytes]
        pieces.append(pcm)
        print(f"[{i:02d}] 语音 {dur:.2f}s → 对齐 {SEG}s  语速系数 {tempo:.2f}  {text[:18]}")

    wav_all = OUT / "narration.wav"
    with wave.open(str(wav_all), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(b"".join(pieces))
    print(f"拼接完成：{wav_all.name}  {wav_all.stat().st_size} bytes")

    m4a = OUT / "narration.m4a"
    try:
        subprocess.run(
            [FFMPEG, "-y", "-loglevel", "error", "-i", str(wav_all),
             "-c:a", "aac", "-b:a", "128k", str(m4a)],
            check=True,
        )
        print(f"AAC 封装完成：{m4a.name}  {m4a.stat().st_size} bytes")
    except subprocess.CalledProcessError as exc:
        print(f"AAC 封装失败，回退 WAV：{exc}")

    # 清理中间文件，避免污染仓库
    for p in OUT.glob("seg*"):
        p.unlink()
    (OUT / "concat.txt").unlink(missing_ok=True)


if __name__ == "__main__":
    asyncio.run(main())
