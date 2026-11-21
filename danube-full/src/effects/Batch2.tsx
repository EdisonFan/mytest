import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {FxProps} from './Batch1';
import {C, FONT_FAMILY} from '../theme';
import {clamp01, easeOutCubic, ip, shake} from '../lib/motion';
import {GOLDEN_ANGLE, h1, h2} from '../lib/hash';

/* 05 · RGB 分离故障文字（确定性帧哈希，不用 Math.random）
 * 第一版用百分比定位切片容器，把大字推到了可视区外，抽帧时整幕几乎全黑。
 * 改为：三层文字整体可见 + clipPath 裁出的横向撕裂带各自错位。 */
export const FxGlitch: React.FC<FxProps> = ({frame, duration, audio}) => {
  const local = useCurrentFrame();
  const {width} = useVideoConfig();
  const text = 'DONAU · 多瑙河 · 314';
  const decay = Math.exp(-local / 130);
  const burst = audio.treble;
  const shift = 3 + burst * 11 + decay * 6;

  const base: React.CSSProperties = {
    position: 'absolute', inset: 0, display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    fontSize: 112, fontWeight: 900, whiteSpace: 'nowrap',
    letterSpacing: '0.04em',
  };

  return (
    <AbsoluteFill style={{fontFamily: FONT_FAMILY}}>
      <div style={{position: 'absolute', inset: 0}}>
        {/* 底层：三层 RGB 分离，文字始终完整可读 */}
        <div style={{...base, color: 'rgba(255,70,70,0.8)', transform: `translateX(${-shift}px)`}}>{text}</div>
        <div style={{...base, color: 'rgba(70,150,255,0.8)', transform: `translateX(${shift}px)`}}>{text}</div>
        <div style={{...base, color: C.cream, textShadow: `0 0 40px rgba(58,160,255,0.6)`}}>{text}</div>

        {/* 撕裂带：用 clipPath 裁出横条并逐条错位，确定性帧哈希驱动 */}
        {Array.from({length: 8}, (_, i) => {
          const n = h2(Math.floor(frame / 2), i);
          const dx = (n - 0.5) * (50 + burst * 90) * (0.35 + decay);
          const top = i * 12.5;
          return (
            <div key={i} style={{
              ...base, color: i % 2 ? C.cyan : C.amber,
              clipPath: `inset(${top}% 0 ${100 - top - 12.5}% 0)`,
              transform: `translateX(${dx}px)`,
              opacity: 0.35 + burst * 0.45,
            }}>{text}</div>
          );
        })}
      </div>

      {/* 扫描撕裂线 */}
      {Array.from({length: 7}, (_, i) => {
        const y = h1(i) * 100;
        const x = (frame * (3 + i) + i * 137) % width;
        return <div key={i} style={{
          position: 'absolute', left: x, top: `${y}%`, width: 120 + h1(i + 9) * 220,
          height: 2, background: C.cyan, opacity: 0.12 + burst * 0.35,
        }} />;
      })}
      <div style={{
        position: 'absolute', bottom: 150, left: 0, right: 0, textAlign: 'center',
        fontSize: 26, letterSpacing: '0.4em', color: C.gold,
        opacity: ip(local, [0, 18], [0, 0.8]),
      }}>SIGNAL / DECODE / 1866</div>
    </AbsoluteFill>
  );
};

/* 05b · 像素网格揭示：格子按 (col+row) 延迟级联消失 */
export const FxPixelReveal: React.FC<FxProps> = ({duration}) => {
  const local = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const cols = 48;
  const rows = 27;
  const cw = width / cols;
  const ch = height / rows;
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const delay = (c + r) * 1.1 + h1(r * cols + c) * 8;
      const op = 1 - ip(local - delay, [0, 10], [0, 1]);
      if (op <= 0.001) continue;
      cells.push(
        <rect key={`${r}-${c}`} x={c * cw} y={r * ch} width={cw + 1} height={ch + 1}
          fill={(r + c) % 7 === 0 ? C.gold : C.deep} opacity={op * 0.92} />,
      );
    }
  }
  return (
    <AbsoluteFill>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>{cells}</svg>
    </AbsoluteFill>
  );
};

/* 06 · 粘性融化文字：SVG blur + alpha threshold 的 goo 效果，不是字形插值 */
export const FxLiquidMorph: React.FC<FxProps> = ({frame, duration, audio}) => {
  const local = useCurrentFrame();
  const words = ['FLIESSEN', 'FLÜGEL', 'WELLEN', 'DONAU'];
  const cycle = 96;
  const k = Math.floor(local / cycle) % words.length;
  const next = (k + 1) % words.length;
  const p = (local % cycle) / cycle;
  const melt = clamp01((p - 0.35) / 0.4);
  const goo = 0.045 + audio.bass * 0.02;
  return (
    <AbsoluteFill style={{fontFamily: FONT_FAMILY, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg}}>
      <div style={{
        filter: `blur(${goo * 100}px) contrast(${16 + audio.mid * 8})`,
        width: '100%', height: 320, position: 'relative',
      }}>
        {[
          {w: words[k], op: 1 - melt, scale: 1 + melt * 0.2, y: -melt * 40},
          {w: words[next], op: melt, scale: 1.2 - melt * 0.2, y: (1 - melt) * 40},
        ].map((L, i) => (
          <div key={i} style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 132, fontWeight: 900, color: C.cream,
            letterSpacing: '0.06em', opacity: L.op,
            transform: `scale(${L.scale}) translateY(${L.y}px)`,
          }}>{L.w}</div>
        ))}
      </div>
      <div style={{
        position: 'absolute', bottom: 170, fontSize: 22, letterSpacing: '0.34em',
        color: C.cyan, opacity: 0.8,
      }}>BLUR + ALPHA THRESHOLD · NO PATH INTERPOLATION</div>
    </AbsoluteFill>
  );
};

/* 06b · 旋转缩放几何阵列 */
export const FxGeometric: React.FC<FxProps> = ({frame, duration, audio}) => {
  const {width, height} = useVideoConfig();
  const shapes: React.ReactNode[] = [];
  for (let i = 0; i < 20; i++) {
    const a = GOLDEN_ANGLE * i;
    const r = 90 + (i % 6) * 88 + audio.mid * 50;
    const x = width / 2 + Math.cos(a + frame / 130) * r;
    const y = height / 2 + Math.sin(a + frame / 130) * r * 0.72;
    const rot = (frame * (0.3 + (i % 4) * 0.16) + i * 37) % 360;
    const s = 0.6 + h1(i) * 0.9 + audio.bass * 0.25;
    const size = 40 + (i % 5) * 26;
    const col = i % 3 === 0 ? C.gold : i % 3 === 1 ? C.blue : C.cyan;
    shapes.push(
      <g key={i} transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
        {i % 3 === 0
          ? <rect x={-size / 2} y={-size / 2} width={size} height={size} fill="none" stroke={col} strokeWidth={2} opacity={0.42} />
          : i % 3 === 1
            ? <circle r={size / 2} fill="none" stroke={col} strokeWidth={2} opacity={0.42} />
            : <polygon points={`0,${-size / 2} ${size / 2},${size / 2} ${-size / 2},${size / 2}`} fill="none" stroke={col} strokeWidth={2} opacity={0.42} />}
      </g>,
    );
  }
  return (
    <AbsoluteFill>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>{shapes}</svg>
    </AbsoluteFill>
  );
};

/* 07 · 多波粒子爆发（黄金角分布 + 确定性相位） */
export const FxExplosion: React.FC<FxProps> = ({frame, duration, audio}) => {
  const local = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const cx = width / 2;
  const cy = height / 2 - 20;
  const pts = React.useMemo(() => Array.from({length: 420}, (_, i) => ({
    a: GOLDEN_ANGLE * i,
    r: h1(i) * 0.9 + 0.1,
    wave: Math.floor(h1(i + 900) * 3),
    size: 1.5 + h1(i + 1700) * 4,
    gold: i % 6 === 0,
  })), []);
  const nodes: React.ReactNode[] = [];
  for (const p of pts) {
    const start = p.wave * 26;
    const t = clamp01((local - start) / 110);
    if (t <= 0) continue;
    const e = easeOutCubic(t);
    const rad = e * (560 + audio.bass * 260) * p.r;
    const alpha = (1 - t) * (0.35 + p.r * 0.65);
    nodes.push(
      <circle key={p.a} cx={cx + Math.cos(p.a) * rad} cy={cy + Math.sin(p.a) * rad * p.r}
        r={p.size * (1 + e)} fill={p.gold ? C.gold : C.cyan} opacity={alpha} />,
    );
  }
  return (
    <AbsoluteFill>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>{nodes}</svg>
      <AbsoluteFill style={{
        background: `radial-gradient(300px 300px at 50% 48%, rgba(255,179,71,${0.2 * audio.bass}) 0%, transparent 70%)`,
      }} />
    </AbsoluteFill>
  );
};

/* 07b · 确定性纸屑 + 衰减轻震 */
export const FxConfettiShake: React.FC<FxProps> = ({frame, duration, audio}) => {
  const local = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const {x: sx, y: sy} = shake(local, 8, 0.05);
  const pieces: React.ReactNode[] = [];
  for (let i = 0; i < 130; i++) {
    const speed = 3 + h1(i) * 7;
    const y = ((h1(i + 400) * height + local * speed) % (height + 200)) - 100;
    const x = h1(i + 800) * width + Math.sin(local / 24 + i) * 42;
    const w = 8 + h1(i + 1200) * 14;
    const hh = 12 + h1(i + 1600) * 20;
    const rot = (local * (1 + h1(i) * 3) + i * 47) % 360;
    const col = [C.gold, C.cyan, C.blue, C.cream][i % 4];
    pieces.push(
      <div key={i} style={{
        position: 'absolute', left: x, top: y, width: w, height: hh,
        background: col, opacity: 0.35 + audio.treble * 0.5,
        transform: `rotate(${rot}deg)`, borderRadius: i % 3 === 0 ? '50%' : 2,
      }} />,
    );
  }
  return <AbsoluteFill style={{transform: `translate(${sx}px, ${sy}px)`}}>{pieces}</AbsoluteFill>;
};
