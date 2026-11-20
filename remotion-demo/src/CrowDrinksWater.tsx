import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import captionsJson from "./captions.json";
import type { Caption } from "./types";
import { Art } from "./Illustrations";
import { SentenceCaptions } from "./SentenceCaptions";
import {
  HOUSE_EASE,
  IrisWipe,
  ParticleBurst,
  PulseRings,
  SPRING_BOUNCY,
  StaggerPebbles,
  WaveBand,
} from "./Effects";

const captions = captionsJson as Caption[];
const PAPER = "#F5EBD7";
const INK = "#45403A";
const RED = "#D65A4A";

const ProgressDots: React.FC<{ active: number }> = ({ active }) => (
  <div
    style={{
      position: "absolute",
      top: 58,
      left: 0,
      width: "100%",
      display: "flex",
      justifyContent: "center",
      gap: 18,
    }}
  >
    {captions.map((c, i) => (
      <div
        key={c.startMs}
        style={{
          width: i === active ? 22 : 14,
          height: i === active ? 22 : 14,
          borderRadius: 99,
          backgroundColor: i === active ? RED : INK,
          opacity: i === active ? 1 : i < active ? 0.4 : 0.18,
        }}
      />
    ))}
  </div>
);

const Scene: React.FC<{ index: number; caption: Caption }> = ({ index, caption }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const total = 6 * fps;
  const isFinale = index === captions.length - 1;

  // 过冲弹簧入场：弹过头再回稳，比线性淡入更有生命感
  const enter = spring({ frame, fps, config: SPRING_BOUNCY });
  const scale = interpolate(enter, [0, 1], [0.82, 1]);
  const rise = interpolate(enter, [0, 1], [72, 0]);
  const artOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });
  const sceneFade = interpolate(frame, [total - 10, total - 1], [1, 0], {
    extrapolateLeft: "clamp",
  });

  // 结尾轻微相机震动（参考 RVE camera-shake，衰减）
  const shakeT = isFinale ? Math.max(0, 1 - frame / 45) : 0;
  const shakeX = Math.sin(frame * 1.7) * 7 * shakeT;
  const shakeY = Math.cos(frame * 2.3) * 5 * shakeT;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: PAPER,
        opacity: sceneFade,
        transform: `translate(${shakeX}px, ${shakeY}px)`,
      }}
    >
      <ProgressDots active={index} />
      <div
        style={{
          position: "absolute",
          top: 120,
          left: 510,
          width: 900,
          height: 600,
          opacity: artOpacity,
          transform: `translateY(${rise}px) scale(${scale})`,
        }}
      >
        <Art index={index} frame={frame} />
      </div>

      {/* 第 4 句「丢石子」与第 8 句「摆石子圈」：级联石子雨 */}
      {index === 3 || index === 7 ? (
        <StaggerPebbles count={index === 3 ? 8 : 6} />
      ) : null}

      {/* 收尾句：粒子爆发 */}
      {isFinale ? <ParticleBurst startFrame={18} /> : null}

      <SentenceCaptions captions={[caption]} emphasis={isFinale} />
      <IrisWipe />
    </AbsoluteFill>
  );
};

/** 60s / 30fps / 1920x1080，一句字幕 = 一个 6 秒场景 */
export const CrowVideo: React.FC = () => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const fadeOut = interpolate(frame, [60 * fps - 20, 60 * fps - 1], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: HOUSE_EASE,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      {/* 微软 TTS 生成的 10 句旁白，由 workflow 放进 public/ */}
      <Audio
        src={staticFile("narration.m4a")}
        volume={(f) =>
          interpolate(f, [0, 15], [0, 1], { extrapolateRight: "clamp" }) * fadeOut
        }
      />

      {captions.map((caption, i) => (
        <Sequence
          key={caption.startMs}
          name={`第${i + 1}句 · ${caption.text.slice(0, 8)}`}
          from={i * 6 * fps}
          durationInFrames={6 * fps}
        >
          <Scene index={i} caption={caption} />
        </Sequence>
      ))}

      {/* 全片常驻：真实音频驱动的波形带 + 随拍跳动的「水滴音符」脉冲环 */}
      <WaveBand />
      <PulseRings x={1700} y={300} intensity={1} />
    </AbsoluteFill>
  );
};
