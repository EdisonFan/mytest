import React from "react";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import captionsJson from "./captions.json";
import type { Caption } from "./types";
import { Art } from "./Illustrations";
import { SentenceCaptions } from "./SentenceCaptions";

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

  const enter = spring({
    frame,
    fps,
    config: { damping: 16, stiffness: 110, mass: 0.9 },
  });
  const scale = interpolate(enter, [0, 1], [0.84, 1]);
  const rise = interpolate(enter, [0, 1], [64, 0]);
  const artOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });
  const sceneFade = interpolate(frame, [total - 10, total - 1], [1, 0], {
    extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: PAPER, opacity: sceneFade }}>
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
      <SentenceCaptions captions={[caption]} emphasis={isFinale} />
    </AbsoluteFill>
  );
};

/** 60s / 30fps / 1920x1080，一句字幕 = 一个 6 秒场景 */
export const CrowVideo: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
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
    </AbsoluteFill>
  );
};
