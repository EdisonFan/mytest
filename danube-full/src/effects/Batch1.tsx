import React from 'react';
import {createSmoothSvgPath} from '@remotion/media-utils';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {processFrequencyData} from '../helpers/process-frequency-data';
import {AudioFrame} from '../audio-hooks';
import {C, FONT_FAMILY, FPS} from '../theme';
import {breathe, ip, mixColor} from '../lib/motion';
import {makeParticles, project} from '../lib/particles';
import {GOLDEN_ANGLE, h1, h2} from '../lib/hash';

export interface FxProps {
  readonly frame: number;
  readonly duration: number;
  readonly audio: AudioFrame;
}

const Center: React.FC<React.PropsWithChildren> = ({children}) => (
  <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', fontFamily: FONT_FAMILY}}>
    {children}
  </AbsoluteFill>
);

/* 01 · 确定性 3D 粒子星河（黄金角螺旋 + 透视投影 + 星云连线） */
export const FxStarfield: React.FC<FxProps> = ({frame, audio}) => {
  const {width, height} = useVideoConfig();
  const pts = React.useMemo(() => makeParticles(280), []);
  const cx = width / 2;
  const cy = height / 2 - 20;
  const R = 360 + audio.bass * 40;
  const proj = pts.map((p) => project(p, frame, FPS, cx, cy, R, 0.14));
  const links: React.ReactNode[] = [];
  for (let i = 0; i < proj.length; i += 7) {
    const a = proj[i];
    const b = proj[(i + 19) % proj.length];
    links.push(
      <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.cyan} strokeWidth={0.7}
        opacity={0.08 * Math.min(a.alpha, b.alpha)} />,
    );
  }
  return (
    <AbsoluteFill>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {links}
        {proj.map((q, i) => {
          const r = (1.3 + q.scale * 2) * (pts[i].phase > 0.95 ? 2.6 : 1);
          const col = mixColor(C.blue, C.gold, (q.depth + 1) / 2);
          return (
            <g key={i} opacity={q.alpha}>
              {pts[i].phase > 0.95 && <circle cx={q.x} cy={q.y} r={r * 3.6} fill={col} opacity={0.1} />}
              <circle cx={q.x} cy={q.y} r={r} fill={col} />
            </g>
          );
        })}
      </svg>
      <AbsoluteFill style={{
        background: `radial-gradient(320px 320px at 50% 48%, rgba(127,227,255,0.14) 0%, transparent 70%)`,
        transform: `scale(${breathe(frame, 130, 0.09)})`,
      }} />
    </AbsoluteFill>
  );
};

/* 02 · 透视频谱环 + 镜像内环 + 低频唱片 */
export const FxSpectrumRing: React.FC<FxProps> = ({frame, duration, audio}) => {
  const local = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const barsData = audio.spectrum.length ? processFrequencyData(audio.spectrum, 96) : [];
  const reveal = ip(local, [0, 28], [0, 1]);
  const cx = width / 2;
  const cy = height / 2 - 16;
  const R = 250;
  const spin = (frame / FPS) * 0.11;
  const bars: React.ReactNode[] = [];
  for (let i = 0; i < 96; i++) {
    const v = barsData[i] ?? 0;
    const a = (i / 96) * Math.PI * 2 + spin;
    const len = (30 + 270 * v) * reveal;
    const col = mixColor(C.blue, C.gold, i / 95);
    bars.push(
      <g key={i} opacity={0.3 + 0.7 * v}>
        <line x1={cx + Math.cos(a) * R} y1={cy + Math.sin(a) * R}
          x2={cx + Math.cos(a) * (R + len)} y2={cy + Math.sin(a) * (R + len)}
          stroke={col} strokeWidth={5} strokeLinecap="round" />
        <line x1={cx + Math.cos(a) * R} y1={cy + Math.sin(a) * R}
          x2={cx + Math.cos(a) * (R - len * 0.4)} y2={cy + Math.sin(a) * (R - len * 0.4)}
          stroke={C.cyan} strokeWidth={2.4} strokeLinecap="round" opacity={0.5} />
      </g>,
    );
  }
  return (
    <AbsoluteFill>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {[R - 18, R + 10].map((rr, k) => (
          <circle key={k} cx={cx} cy={cy} r={rr} fill="none" stroke={C.cyan} strokeWidth={1}
            opacity={0.18} strokeDasharray="3 12"
            transform={`rotate(${(frame * 0.3) % 360} ${cx} ${cy})`} />
        ))}
        {bars}
        <g transform={`translate(${cx} ${cy})`}>
          <circle r={140 + audio.bass * 30} fill="none" stroke={C.gold} strokeWidth={1.5} opacity={0.5} />
          <circle r={112} fill="#061428" stroke={C.blue} strokeWidth={2} />
          {[0, 1, 2, 3, 4, 5].map((k) => (
            <circle key={k} r={30 + k * 15} fill="none" stroke={C.cyan} strokeWidth={0.8} opacity={0.12} />
          ))}
          <g transform={`rotate(${(frame * 1.3) % 360})`}>
            <line x1={0} y1={-106} x2={0} y2={106} stroke={C.gold} strokeWidth={1} opacity={0.35} />
          </g>
          <circle r={9} fill={C.gold} />
        </g>
      </svg>
    </AbsoluteFill>
  );
};

/* 03 · 三层波形丝带（真实时域波形） */
export const FxWaveRibbons: React.FC<FxProps> = ({frame, duration, audio}) => {
  const local = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const wave = audio.waveform;
  const reveal = ip(local, [0, 24], [0, 1]);
  const H = 460;
  const cy = height / 2 - 20;
  const layers = [
    {amp: 1, sw: 3.4, color: C.cyan, op: 0.95, shift: 0},
    {amp: 0.68, sw: 2.2, color: C.blue, op: 0.68, shift: 0.45},
    {amp: 0.36, sw: 1.6, color: C.gold, op: 0.5, shift: 0.9},
  ];
  const paths = layers.map((L) => {
    const points = wave.length
      ? wave.map((y, i) => ({
          x: (i / (wave.length - 1)) * width,
          y: H / 2 + y * H * 0.44 * L.amp + Math.sin(i / 90 + frame / 28 + L.shift) * 16 * L.amp,
        }))
      : [{x: 0, y: H / 2}, {x: width, y: H / 2}];
    return createSmoothSvgPath({points});
  });
  return (
    <AbsoluteFill>
      <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`}
        style={{position: 'absolute', top: cy - H / 2, opacity: reveal}}>
        {layers.map((L, i) => (
          <g key={i}>
            <path d={paths[i]} fill="none" stroke={L.color} strokeWidth={L.sw * 7} opacity={0.06} strokeLinecap="round" />
            <path d={paths[i]} fill="none" stroke={L.color} strokeWidth={L.sw} opacity={L.op} strokeLinecap="round" />
          </g>
        ))}
        <line x1={0} y1={H / 2} x2={width} y2={H / 2} stroke={C.white} strokeWidth={1} opacity={0.12} />
      </svg>
    </AbsoluteFill>
  );
};

/* 03b · 字符雨（确定性列滚动） */
export const FxMatrixRain: React.FC<FxProps> = ({frame, audio}) => {
  const {width, height} = useVideoConfig();
  const cols = 56;
  const cw = width / cols;
  const glyphs = '0123456789ABCDEF多瑙河施特劳斯圆舞曲';
  const nodes: React.ReactNode[] = [];
  for (let c = 0; c < cols; c++) {
    const speed = 2.4 + h1(c) * 3.2;
    const head = (frame * speed + h1(c + 99) * height) % (height + 500) - 250;
    const len = 12 + Math.floor(h1(c + 7) * 16);
    for (let j = 0; j < len; j++) {
      const y = head - j * 26;
      if (y < -30 || y > height + 30) continue;
      const ch = glyphs[(c * 7 + j * 13 + Math.floor(frame / 3)) % glyphs.length];
      const op = (1 - j / len) * (0.16 + audio.mid * 0.3);
      nodes.push(
        <span key={`${c}-${j}`} style={{
          position: 'absolute', left: c * cw + 4, top: y,
          fontFamily: FONT_FAMILY, fontSize: 21,
          color: j === 0 ? C.cream : C.cyan, opacity: op,
          textShadow: j === 0 ? `0 0 18px ${C.cyan}` : 'none',
        }}>{ch}</span>,
      );
    }
  }
  return <AbsoluteFill>{nodes}</AbsoluteFill>;
};

/* 04 · 脉冲环 + 跳动音符 */
export const FxPulseRings: React.FC<FxProps> = ({frame, duration, audio}) => {
  const local = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const reveal = ip(local, [0, 20], [0, 1]);
  const cx = width / 2;
  const cy = height / 2 - 20;
  const t = frame / 13;
  const beat = Math.floor(t) % 3;
  const phase = t - Math.floor(t);
  const rings = [0, 1, 2, 3, 4].map((i) => {
    const pulse = i === beat ? Math.pow(Math.sin(Math.PI * phase), 2) : 0;
    return {i, pulse, s: 1 + 0.14 * pulse * (0.5 + audio.bass), r: 120 + i * 96};
  });
  const notes = Array.from({length: 28}, (_, i) => {
    const a = GOLDEN_ANGLE * i;
    const r = 340 + ((i * 41 + frame * 0.5) % 170);
    return {
      x: cx + Math.cos(a + frame / 200) * r,
      y: cy + Math.sin(a + frame / 200) * r * 0.6 - ((frame * 0.9 + i * 31) % 110),
      glyph: i % 3 === 0 ? '♫' : '♪',
      size: 22 + (i % 5) * 7,
      op: 0.48 + 0.45 * audio.treble,
    };
  });
  return (
    <AbsoluteFill>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{opacity: reveal}}>
        {rings.map((R) => (
          <g key={R.i} transform={`translate(${cx} ${cy}) scale(${R.s})`}>
            <circle r={R.r} fill="none" stroke={R.i === beat ? C.gold : C.blue}
              strokeWidth={2 + R.pulse * 8} opacity={0.38 + R.pulse * 0.6} />
            <circle r={R.r} fill="none" stroke={C.cyan} strokeWidth={1}
              opacity={0.14} strokeDasharray="2 16"
              transform={`rotate(${(frame * 0.5) % 360})`} />
          </g>
        ))}
        <circle cx={cx} cy={cy} r={74 + audio.bass * 38} fill="none" stroke={C.gold} strokeWidth={1.5} opacity={0.55} />
      </svg>
      <AbsoluteFill style={{fontFamily: FONT_FAMILY}}>
        {notes.map((n, i) => (
          <span key={i} style={{
            position: 'absolute', left: n.x, top: n.y, fontSize: n.size,
            color: i % 3 === 0 ? C.gold : C.cyan, opacity: n.op,
            textShadow: `0 0 14px ${C.blue}`,
            transform: `rotate(${Math.sin(frame / 40 + i) * 16}deg)`,
          }}>{n.glyph}</span>
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* 04b · 漂浮散景光斑 */
export const FxBokeh: React.FC<FxProps> = ({frame, audio}) => {
  const {width, height} = useVideoConfig();
  const nodes: React.ReactNode[] = [];
  for (let i = 0; i < 26; i++) {
    const x = h1(i) * width + Math.sin(frame / (70 + i * 3) + i) * 70;
    const y = h1(i + 300) * height + Math.cos(frame / (90 + i * 2) + i * 1.7) * 50;
    const r = 26 + h1(i + 700) * 130 * (0.7 + audio.mid * 0.6);
    nodes.push(
      <div key={i} style={{
        position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${i % 4 === 0 ? 'rgba(240,198,116,0.20)' : 'rgba(127,227,255,0.14)'} 0%, transparent 70%)`,
        border: `1px solid ${i % 4 === 0 ? 'rgba(240,198,116,0.18)' : 'rgba(127,227,255,0.12)'}`,
        opacity: 0.5 + h2(i, 5) * 0.5,
      }} />,
    );
  }
  return <AbsoluteFill>{nodes}</AbsoluteFill>;
};
