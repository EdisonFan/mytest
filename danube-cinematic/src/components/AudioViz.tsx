import React from 'react';
import {
  createSmoothSvgPath,
  useWindowedAudioData,
  visualizeAudio,
  visualizeAudioWaveform,
} from '@remotion/media-utils';
import {AbsoluteFill, staticFile, useVideoConfig} from 'remotion';
import {processFrequencyData} from '../helpers/process-frequency-data';
import {C, FONT_FAMILY, FPS} from '../theme';
import {breathe, clamp01, ip, mixColor} from '../lib/motion';
import {makeParticles, project} from '../lib/particles';

const AUDIO = staticFile('blue-danube.mp3');

/** 所有可视化共用同一份解码窗口；frame 必须传「全局帧」，不能用 Sequence 相对帧。 */
const useSpectrum = (frame: number, samples = 128): number[] => {
  const {fps} = useVideoConfig();
  const {audioData, dataOffsetInSeconds} = useWindowedAudioData({
    src: AUDIO,
    frame,
    fps,
    windowInSeconds: 30,
  });
  if (!audioData) return [];
  return visualizeAudio({
    fps,
    frame,
    audioData,
    numberOfSamples: samples,
    optimizeFor: 'speed',
    dataOffsetInSeconds,
  });
};

const useWaveform = (frame: number): number[] => {
  const {fps} = useVideoConfig();
  const {audioData, dataOffsetInSeconds} = useWindowedAudioData({
    src: AUDIO,
    frame,
    fps,
    windowInSeconds: 30,
  });
  if (!audioData) return [];
  return visualizeAudioWaveform({
    fps,
    frame,
    audioData,
    numberOfSamples: 2048,
    windowInSeconds: 1,
    channel: 0,
    dataOffsetInSeconds,
  });
};

const bassOf = (values: number[]): number => {
  if (!values.length) return 0;
  const low = values.slice(0, 32);
  return clamp01((low.reduce((a, b) => a + b, 0) / low.length) * 3);
};

/* ─────────────── 1. 序曲：确定性 3D 粒子星河 ─────────────── */
export const Starfield: React.FC<{readonly frame: number}> = ({frame}) => {
  const {width, height} = useVideoConfig();
  const pts = React.useMemo(() => makeParticles(240), []);
  const cx = width / 2;
  const cy = height / 2 - 30;
  const radius = 350;
  const proj = pts.map((p) => project(p, frame, FPS, cx, cy, radius, 0.16));

  const links: React.ReactNode[] = [];
  for (let i = 0; i < proj.length; i += 9) {
    const a = proj[i];
    const b = proj[(i + 17) % proj.length];
    links.push(
      <line
        key={`l${i}`}
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke={C.cyan}
        strokeWidth={0.7}
        opacity={0.09 * Math.min(a.alpha, b.alpha)}
      />,
    );
  }

  return (
    <AbsoluteFill>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {links}
        {proj.map((q, i) => {
          const r = (1.4 + q.scale * 1.9) * (pts[i].phase > 0.94 ? 2.4 : 1);
          const col = mixColor(C.blue, C.gold, (q.depth + 1) / 2);
          return (
            <g key={i} opacity={q.alpha}>
              {pts[i].phase > 0.94 ? (
                <circle cx={q.x} cy={q.y} r={r * 3.4} fill={col} opacity={0.12} />
              ) : null}
              <circle cx={q.x} cy={q.y} r={r} fill={col} />
            </g>
          );
        })}
      </svg>
      {/* 中心呼吸光核 */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(300px 300px at 50% 47%, rgba(127,227,255,0.13) 0%, transparent 70%)`,
          transform: `scale(${breathe(frame, 120, 0.08)})`,
        }}
      />
    </AbsoluteFill>
  );
};

/* ─────────────── 2. 第一圆舞曲：透视频谱环 ─────────────── */
export const SpectrumRing: React.FC<{readonly frame: number; readonly start: number}> = ({
  frame,
  start,
}) => {
  const {width, height} = useVideoConfig();
  const raw = useSpectrum(frame, 256);
  const barsData = raw.length ? processFrequencyData(raw, 72) : [];
  const bass = bassOf(raw);
  const local = frame - start;
  const reveal = ip(local, [0, 28], [0, 1]);
  const cx = width / 2;
  const cy = height / 2 - 20;
  const R = 238;
  const spin = (frame / FPS) * 0.12;
  const bars: React.ReactNode[] = [];

  for (let i = 0; i < 72; i++) {
    const v = barsData[i] ?? 0;
    const a = (i / 72) * Math.PI * 2 + spin;
    const len = (34 + 250 * v) * reveal;
    const r0 = R;
    const r1 = R + len;
    const r2 = R - len * 0.42;
    const col = mixColor(C.blue, C.gold, i / 71);
    const op = 0.35 + 0.65 * v;
    bars.push(
      <g key={i} opacity={op}>
        <line
          x1={cx + Math.cos(a) * r0}
          y1={cy + Math.sin(a) * r0}
          x2={cx + Math.cos(a) * r1}
          y2={cy + Math.sin(a) * r1}
          stroke={col}
          strokeWidth={5.5}
          strokeLinecap="round"
        />
        {/* 镜像内环 */}
        <line
          x1={cx + Math.cos(a) * r0}
          y1={cy + Math.sin(a) * r0}
          x2={cx + Math.cos(a) * r2}
          y2={cy + Math.sin(a) * r2}
          stroke={mixColor(C.cyan, C.blue, i / 71)}
          strokeWidth={2.6}
          strokeLinecap="round"
          opacity={0.55}
        />
      </g>,
    );
  }

  return (
    <AbsoluteFill>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* 刻度环 */}
        {[R - 16, R + 8].map((rr, k) => (
          <circle
            key={k}
            cx={cx}
            cy={cy}
            r={rr}
            fill="none"
            stroke={C.cyan}
            strokeWidth={1}
            opacity={0.18}
            strokeDasharray="3 12"
            transform={`rotate(${(frame * 0.35) % 360} ${cx} ${cy})`}
          />
        ))}
        {bars}
        {/* 中心唱片：低频驱动缩放 */}
        <g transform={`translate(${cx} ${cy})`}>
          <circle r={128 + bass * 26} fill="none" stroke={C.gold} strokeWidth={1.5} opacity={0.5} />
          <circle r={104} fill="#061428" stroke={C.blue} strokeWidth={2} opacity={0.9} />
          {[0, 1, 2, 3, 4].map((k) => (
            <circle
              key={k}
              r={32 + k * 16}
              fill="none"
              stroke={C.cyan}
              strokeWidth={0.8}
              opacity={0.13}
            />
          ))}
          <g transform={`rotate(${(frame * 1.4) % 360})`}>
            <line x1={0} y1={-98} x2={0} y2={98} stroke={C.gold} strokeWidth={1} opacity={0.35} />
          </g>
          <circle r={9} fill={C.gold} />
        </g>
      </svg>
    </AbsoluteFill>
  );
};

/* ─────────────── 3. 第二圆舞曲：三层波形丝带 ─────────────── */
export const WaveRibbons: React.FC<{readonly frame: number; readonly start: number}> = ({
  frame,
  start,
}) => {
  const {width, height} = useVideoConfig();
  const wave = useWaveform(frame);
  const local = frame - start;
  const reveal = ip(local, [0, 24], [0, 1]);
  const H = 430;
  const cy = height / 2 - 10;
  const layers = [
    {amp: 1.0, widthStroke: 3.2, color: C.cyan, op: 0.95, shift: 0},
    {amp: 0.66, widthStroke: 2.2, color: C.blue, op: 0.7, shift: 0.45},
    {amp: 0.34, widthStroke: 1.6, color: C.gold, op: 0.5, shift: 0.9},
  ];

  const paths = layers.map((L) => {
    const points = wave.length
      ? wave.map((y, i) => ({
          x: (i / (wave.length - 1)) * width,
          y: H / 2 + (y * H * 0.44 * L.amp + Math.sin(i / 90 + frame / 28 + L.shift) * 16 * L.amp),
        }))
      : [
          {x: 0, y: H / 2},
          {x: width, y: H / 2},
        ];
    return createSmoothSvgPath({points});
  });

  return (
    <AbsoluteFill>
      <svg
        width={width}
        height={H}
        viewBox={`0 0 ${width} ${H}`}
        style={{position: 'absolute', top: cy - H / 2, opacity: reveal}}
      >
        {layers.map((L, i) => (
          <g key={i}>
            {/* 用大 stroke 低 opacity 模拟辉光，避开逐帧 SVG filter */}
            <path d={paths[i]} fill="none" stroke={L.color} strokeWidth={L.widthStroke * 7} opacity={0.06} strokeLinecap="round" />
            <path d={paths[i]} fill="none" stroke={L.color} strokeWidth={L.widthStroke} opacity={L.op} strokeLinecap="round" />
          </g>
        ))}
        <line x1={0} y1={H / 2} x2={width} y2={H / 2} stroke={C.white} strokeWidth={1} opacity={0.12} />
      </svg>
      {/* 上下两条缓慢移动的装饰线 */}
      {[-1, 1].map((s) => (
        <div
          key={s}
          style={{
            position: 'absolute',
            left: 0,
            width: '100%',
            top: cy + s * (H / 2 + 42),
            height: 1,
            background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)`,
            opacity: 0.35,
            transform: `scaleX(${breathe(frame, 180, 0.12)})`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

/* ─────────────── 4. 三拍子圆环 + 跳动音符 ─────────────── */
export const WaltzRings: React.FC<{readonly frame: number; readonly start: number}> = ({
  frame,
  start,
}) => {
  const {width, height} = useVideoConfig();
  const raw = useSpectrum(frame, 128);
  const bass = bassOf(raw);
  const local = frame - start;
  const reveal = ip(local, [0, 20], [0, 1]);
  const cx = width / 2;
  const cy = height / 2 - 20;

  // 华尔兹 3/4：每 0.42s 一拍，三拍一轮，依次点亮三个环
  const beatDur = 0.42;
  const t = frame / FPS / beatDur;
  const beat = Math.floor(t) % 3;
  const phase = t - Math.floor(t);
  const rings = [0, 1, 2].map((i) => {
    const pulse = i === beat ? Math.pow(Math.sin(Math.PI * phase), 2) : 0;
    const s = 1 + 0.16 * pulse * (0.55 + bass);
    return {i, pulse, s, r: 150 + i * 92};
  });

  // 确定性音符粒子：角度按索引算，不用 Math.random
  const notes = Array.from({length: 22}, (_, i) => {
    const a = (i / 22) * Math.PI * 2;
    const drift = (frame * 0.55 + i * 23) % 360;
    const r = 330 + ((i * 37 + drift) % 150);
    return {
      x: cx + Math.cos(a + frame / 190) * r,
      y: cy + Math.sin(a + frame / 190) * r * 0.62 - ((frame * 0.8 + i * 29) % 90),
      glyph: i % 3 === 0 ? '♫' : '♪',
      size: 22 + (i % 4) * 7,
      op: 0.18 + 0.55 * bass,
    };
  });

  return (
    <AbsoluteFill>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{opacity: reveal}}>
        {rings.map((R) => (
          <g key={R.i} transform={`translate(${cx} ${cy}) scale(${R.s})`}>
            <circle r={R.r} fill="none" stroke={R.i === beat ? C.gold : C.blue} strokeWidth={2 + R.pulse * 7} opacity={0.22 + R.pulse * 0.6} />
            <circle r={R.r} fill="none" stroke={C.cyan} strokeWidth={1} opacity={0.15} strokeDasharray="2 14" transform={`rotate(${(frame * 0.6) % 360})`} />
          </g>
        ))}
        <circle cx={cx} cy={cy} r={70 + bass * 34} fill="none" stroke={C.gold} strokeWidth={1.5} opacity={0.55} />
      </svg>
      <AbsoluteFill style={{fontFamily: FONT_FAMILY}}>
        {notes.map((n, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: n.x,
              top: n.y,
              fontSize: n.size,
              color: i % 3 === 0 ? C.gold : C.cyan,
              opacity: n.op,
              textShadow: `0 0 14px ${C.blue}`,
              transform: `rotate(${Math.sin(frame / 40 + i) * 14}deg)`,
            }}
          >
            {n.glyph}
          </span>
        ))}
      </AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: cx - 90,
          top: cy - 24,
          width: 180,
          textAlign: 'center',
          fontFamily: FONT_FAMILY,
          fontSize: 34,
          fontWeight: 700,
          color: C.cream,
          letterSpacing: '0.18em',
          opacity: 0.85 * reveal,
        }}
      >
        3 / 4
      </div>
    </AbsoluteFill>
  );
};
