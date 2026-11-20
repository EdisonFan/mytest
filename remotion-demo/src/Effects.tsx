import React from "react";
import {
  Easing,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  useAudioData,
  visualizeAudioWaveform,
} from "@remotion/media-utils";

/** 统一动效 token（参考 Onda 的 motion language，别在组件里硬编码数值） */
export const SPRING_SMOOTH = { damping: 200 } as const;
export const SPRING_BOUNCY = { damping: 8, stiffness: 150 } as const;
export const SPRING_SNAPPY = { damping: 20, stiffness: 200 } as const;
export const STAGGER = 5;
export const HOUSE_EASE = Easing.bezier(0.16, 1, 0.3, 1);

const INK = "#45403A";
const RED = "#D65A4A";
const ORANGE = "#E39A3C";
const BLUE = "#4A78B0";
const PAPER = "#F5EBD7";

const clamp = (x: number) => Math.max(0, Math.min(1, x));

/**
 * 底部波形带：真实音频驱动（visualizeAudioWaveform），音频还没解码完时
 * 退化为按句节奏的 sin 波，保证任何一帧都不空。
 * 参考 remotion.dev/docs/media-utils/visualize-audio-waveform
 */
export const WaveBand: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const audioData = useAudioData(staticFile("narration.m4a"));
  const SAMPLES = 64;
  const H = 110;

  const wave = React.useMemo(() => {
    if (audioData) {
      return visualizeAudioWaveform({
        fps,
        frame,
        audioData,
        numberOfSamples: SAMPLES,
        windowInSeconds: 1 / fps,
      });
    }
    return Array.from({ length: SAMPLES }, (_, i) =>
      Math.sin((i / SAMPLES) * Math.PI * 7 + frame * 0.16) * 0.32,
    );
  }, [audioData, fps, frame]);

  const points = wave.map((v, i) => {
    const x = (i / (SAMPLES - 1)) * width;
    // 语音能量低，按官方示例做 4 倍增益再 clamp
    const amp = Math.max(-1, Math.min(1, v * 4));
    const y = H / 2 + (amp * H) / 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const d = "M" + points.join(" L");

  return (
    <svg
      width={width}
      height={H}
      style={{ position: "absolute", bottom: 0, left: 0, opacity: 0.42 }}
    >
      <path d={d} stroke={BLUE} strokeWidth={4} fill="none" strokeLinejoin="round" />
      <line x1={0} y1={H / 2} x2={width} y2={H / 2} stroke={INK} strokeWidth={1} opacity={0.18} />
    </svg>
  );
};

/**
 * 跳动「水滴音符」+ 六道同心脉冲环。
 * 参考 Remotion Lab「脈衝光環視覺化」：beat = sin²(phase)，中心随拍缩放；
 * 6 个环按 startFrame 依次外扩、变细、淡出。
 */
export const PulseRings: React.FC<{ x: number; y: number; intensity?: number }> = ({
  x,
  y,
  intensity = 1,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const PULSE_INTERVAL = 18;
  const RING_COUNT = 6;
  const beatPhase = (frame % PULSE_INTERVAL) / PULSE_INTERVAL;
  const beat = Math.pow(Math.sin(beatPhase * Math.PI), 2) * intensity;
  const centerScale = 1 + beat * 0.16;

  return (
    <svg
      width={360}
      height={360}
      viewBox="0 0 360 360"
      style={{ position: "absolute", left: x - 180, top: y - 180 }}
    >
      {Array.from({ length: RING_COUNT }, (_, i) => {
        const start = i * (PULSE_INTERVAL / RING_COUNT);
        const progress = clamp((frame - start) / 50);
        const r = 20 + progress * 150;
        const opacity = (1 - progress) * 0.45;
        return (
          <circle
            key={i}
            cx={180}
            cy={180}
            r={r}
            stroke={BLUE}
            strokeWidth={3 - progress * 2}
            fill="none"
            opacity={opacity}
          />
        );
      })}
      {/* 14 根波形棒，高度随 frame 与索引偏移正弦起伏 */}
      {Array.from({ length: 14 }, (_, i) => {
        const bx = 96 + i * 13;
        const h = 10 + Math.abs(Math.sin(frame * 0.12 + i * 0.7)) * 34 * (0.5 + beat);
        return (
          <rect
            key={i}
            x={bx}
            y={180 - h / 2}
            width={6}
            height={h}
            rx={3}
            fill={i % 3 === 0 ? RED : BLUE}
            opacity={0.65}
          />
        );
      })}
      {/* 中心水滴 = 这版寓言的「跳动音符」 */}
      <g transform={`translate(180 180) scale(${centerScale})`}>
        <path
          d="M0 -34 C 18 -10, 26 0, 26 12 A 26 26 0 0 1 -26 12 C -26 0, -18 -10, 0 -34 Z"
          fill={BLUE}
          opacity={0.9}
        />
        <circle cx={-8} cy={6} r={5} fill={PAPER} opacity={0.75} />
      </g>
    </svg>
  );
};

/** 级联石子雨：每颗独立弹簧 + 轻旋转，参考官方 STAGGER 与 RVE bounce 模板 */
export const StaggerPebbles: React.FC<{ count?: number }> = ({ count = 8 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <svg
      width={1920}
      height={1080}
      style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}
    >
      {Array.from({ length: count }, (_, i) => {
        const p = spring({
          frame,
          fps,
          delay: i * STAGGER,
          config: SPRING_BOUNCY,
          durationInFrames: 34,
        });
        const x = 690 + i * 62;
        const y = interpolate(p, [0, 1], [150, 690]);
        const rot = interpolate(p, [0, 1], [-140, 18]);
        const size = 13 + (i % 3) * 5;
        return (
          <g key={i} transform={`translate(${x} ${y}) rotate(${rot})`} opacity={clamp(p * 2)}>
            <ellipse rx={size} ry={size * 0.72} fill={i % 2 ? ORANGE : INK} />
            <ellipse rx={size * 0.42} ry={size * 0.3} cx={-3} cy={-3} fill={PAPER} opacity={0.35} />
          </g>
        );
      })}
    </svg>
  );
};

/** 结尾粒子爆发，参考 RVE particle-explosion.tsx */
export const ParticleBurst: React.FC<{ startFrame?: number }> = ({ startFrame = 20 }) => {
  const frame = useCurrentFrame();
  const t = clamp((frame - startFrame) / 55);
  const eased = 1 - Math.pow(1 - t, 3);
  return (
    <svg
      width={1920}
      height={1080}
      style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}
    >
      {Array.from({ length: 28 }, (_, i) => {
        const a = (i / 28) * Math.PI * 2 + i * 0.17;
        const dist = 60 + eased * (320 + (i % 5) * 40);
        const x = 960 + Math.cos(a) * dist;
        const y = 470 + Math.sin(a) * dist * 0.68;
        const r = 5 + (i % 4) * 3;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={r * (1 - eased * 0.55)}
            fill={[RED, ORANGE, BLUE, INK][i % 4]}
            opacity={1 - eased}
          />
        );
      })}
    </svg>
  );
};

/** 句间 iris 揭幕转场，参考 RVE iris-transition / Onda clockWipe */
export const IrisWipe: React.FC = () => {
  const frame = useCurrentFrame();
  const r = interpolate(frame, [0, 14], [150, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: HOUSE_EASE,
  });
  if (r <= 0.5) return null;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: PAPER,
        clipPath: `circle(${r}% at 50% 48%)`,
      }}
    />
  );
};
