import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {FxProps} from './Batch1';
import {C, FONT_FAMILY} from '../theme';
import {cascade, ip, mixColor} from '../lib/motion';
import {h1} from '../lib/hash';
import {KenBurns} from '../lib/layers';

const CARD_WORDS = ['WIEN', '1866', 'WALZER', 'DONAU', 'OP. 314', 'STRAUSS', '3/4', 'FLUSS'];

/* 08 · 3D 旋转卡片阵列（perspective + rotateY + translateZ） */
export const FxCarousel: React.FC<FxProps> = ({frame, audio}) => {
  const {height} = useVideoConfig();
  const angle = (frame * 0.55) % 360;
  return (
    <AbsoluteFill style={{perspective: 1400, fontFamily: FONT_FAMILY, justifyContent: 'center', alignItems: 'center'}}>
      <div style={{position: 'relative', width: 520, height: 300, transformStyle: 'preserve-3d', transform: `rotateY(${angle}deg)`}}>
        {CARD_WORDS.map((w, i) => {
          const a = (i / CARD_WORDS.length) * 360;
          return (
            <div key={i} style={{
              position: 'absolute', inset: 0,
              transform: `rotateY(${a}deg) translateZ(${360 + audio.bass * 60}px)`,
              backfaceVisibility: 'hidden',
              border: `2px solid ${i % 2 ? C.gold : C.cyan}`,
              borderRadius: 18,
              background: 'linear-gradient(145deg, rgba(9,32,64,0.94), rgba(3,10,24,0.96))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 46, fontWeight: 800, letterSpacing: '0.12em',
              color: i % 2 ? C.gold : C.white,
              boxShadow: `0 0 40px rgba(58,160,255,0.28) inset`,
            }}>{w}</div>
          );
        })}
      </div>
      <div style={{position: 'absolute', bottom: height * 0.16, fontSize: 22, letterSpacing: '0.4em', color: C.cyan, opacity: 0.75}}>
        PRESERVE-3D · BACKFACE HIDDEN
      </div>
    </AbsoluteFill>
  );
};

/* 08b · 单卡翻面 + 封面 Ken Burns */
export const FxCardFlip: React.FC<FxProps> = ({frame, duration}) => {
  const local = useCurrentFrame();
  const rot = ip(local, [0, duration * 0.7], [0, 360]);
  const showBack = rot > 90 && rot < 270;
  return (
    <AbsoluteFill style={{perspective: 1200, justifyContent: 'center', alignItems: 'center', fontFamily: FONT_FAMILY}}>
      <div style={{
        position: 'absolute', width: 440, height: 440, borderRadius: 24, overflow: 'hidden',
        transform: `rotateY(${rot}deg)`, transformStyle: 'preserve-3d',
        border: `2px solid ${C.gold}`,
      }}>
        <div style={{position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'scaleX(-1)'}}>
          <KenBurns src={staticFile('blue-danube-cover-clean.jpeg')} durationInFrames={duration} from={1.0} to={1.12} />
        </div>
      </div>
      <div style={{
        position: 'absolute', bottom: 150, fontSize: 24, letterSpacing: '0.3em',
        color: C.gold, opacity: showBack ? 0.9 : 0.35,
      }}>{showBack ? 'REVERSE' : 'OBVERSE'}</div>
    </AbsoluteFill>
  );
};

/* 09 · 径向钟扫揭示（SVG 扇形 path） */
export const FxClockWipe: React.FC<FxProps> = ({duration}) => {
  const local = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const cx = width / 2;
  const cy = height / 2;
  const R = Math.hypot(width, height);
  const sweep = ip(local, [0, duration * 0.55], [0, 360]);
  const a = (sweep - 90) * (Math.PI / 180);
  const large = sweep > 180 ? 1 : 0;
  const d = sweep <= 0
    ? ''
    : `M ${cx} ${cy} L ${cx} ${cy - R} A ${R} ${R} 0 ${large} 1 ${cx + Math.cos(a) * R} ${cy + Math.sin(a) * R} Z`;
  return (
    <AbsoluteFill>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {d ? <path d={d} fill="rgba(58,160,255,0.14)" stroke={C.cyan} strokeWidth={2} opacity={0.85} /> : null}
        {[0, 60, 120, 180, 240, 300].map((deg) => {
          const r = (deg - 90) * Math.PI / 180;
          return <line key={deg} x1={cx} y1={cy} x2={cx + Math.cos(r) * R} y2={cy + Math.sin(r) * R}
            stroke={C.cyan} strokeWidth={1} opacity={0.1} />;
        })}
      </svg>
    </AbsoluteFill>
  );
};

/* 09b · 聚光/虹膜：clipPath 半径由帧号驱动 */
export const FxSpotlightIris: React.FC<FxProps> = ({duration, audio}) => {
  const local = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const p = ip(local, [0, duration], [0, 1]);
  const radius = 12 + Math.sin(p * Math.PI) * 62 + audio.bass * 8;
  return (
    <AbsoluteFill style={{
      clipPath: `circle(${radius}% at 50% 48%)`,
      background: `radial-gradient(circle at 50% 45%, rgba(240,198,116,0.16) 0%, rgba(7,26,53,0.5) 55%, rgba(3,10,24,0.9) 100%)`,
    }}>
      <AbsoluteFill style={{
        background: `radial-gradient(600px 600px at 50% 45%, rgba(127,227,255,0.2) 0%, transparent 70%)`,
        transform: `scale(${1 + p * 0.2})`,
      }} />
    </AbsoluteFill>
  );
};

/* 10 · 数据柱级联 + 数值标签（频谱驱动高度） */
export const FxBarChart: React.FC<FxProps> = ({frame, audio}) => {
  const local = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const n = 22;
  const gap = 16;
  const bw = (width * 0.7) / n - gap;
  const x0 = width * 0.15;
  const base = height * 0.76;
  const maxH = height * 0.5;
  const bars: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const p = cascade(local, i, 2.2, 'crisp');
    const spec = audio.spectrum.length ? audio.spectrum[Math.floor((i / n) * 128)] ?? 0 : 0;
    const hgt = (0.18 + spec * 0.9 + h1(i) * 0.16) * maxH * p;
    const col = mixColor(C.blue, C.gold, i / (n - 1));
    bars.push(
      <g key={i}>
        <rect x={x0 + i * (bw + gap)} y={base - hgt} width={bw} height={hgt} rx={5}
          fill={col} opacity={0.85} />
        <rect x={x0 + i * (bw + gap)} y={base - hgt - 8} width={bw} height={4}
          fill={C.cream} opacity={0.9 * p} />
        <text x={x0 + i * (bw + gap) + bw / 2} y={base + 28} fill={C.cyan}
          fontSize={15} textAnchor="middle" fontFamily={FONT_FAMILY} opacity={0.65}>
          {String(i + 1).padStart(2, '0')}
        </text>
      </g>,
    );
  }
  return (
    <AbsoluteFill>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <line x1={x0 - 20} y1={base} x2={width * 0.85 + 20} y2={base} stroke={C.cyan} strokeWidth={2} opacity={0.35} />
        {bars}
      </svg>
    </AbsoluteFill>
  );
};

/* 10b · 数字轮：每一位用 digit strip 的 translateY 滚动 */
export const FxRollingNumber: React.FC<FxProps> = ({frame}) => {
  const local = useCurrentFrame();
  const target = Math.floor(ip(local, [0, 220], [0, 1866]));
  const digits = String(target).padStart(4, '0').split('').map(Number);
  const strip = (d: number, i: number) => {
    const smooth = ip(local, [0, 220], [0, 1866]) / Math.pow(10, 3 - i);
    return (Number.isFinite(smooth) ? smooth : 0) % 10;
  };
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', fontFamily: FONT_FAMILY}}>
      <div style={{display: 'flex', gap: 14, fontSize: 128, fontWeight: 900, color: C.cream, textShadow: `0 0 50px rgba(58,160,255,0.6)`}}>
        {digits.map((d, i) => (
          <div key={i} style={{width: 92, height: 150, overflow: 'hidden', position: 'relative', borderBottom: `2px solid ${C.gold}`}}>
            <div style={{transform: `translateY(${-d * 150 - strip(d, i) * 0}px)`}}>
              {Array.from({length: 10}, (_, k) => (
                <div key={k} style={{height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{k}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{marginTop: 26, fontSize: 22, letterSpacing: '0.42em', color: C.gold, opacity: 0.8}}>
        FRAME-DRIVEN COUNTER · NO CSS KEYFRAMES
      </div>
    </AbsoluteFill>
  );
};
