import React from 'react';
import {AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {createSmoothSvgPath} from '@remotion/media-utils';
import {FxProps} from './Batch1';
import {C, FONT_FAMILY, S} from '../theme';
import {breathe, cascade, ip, mixColor} from '../lib/motion';
import {converge, makeParticles} from '../lib/particles';
import {GOLDEN_ANGLE, h1} from '../lib/hash';
import {KenBurns} from '../lib/layers';

/* 11 · 多层视差：每层不同速度横移，确定性相位 */
export const FxParallax: React.FC<FxProps> = ({frame, audio}) => {
  const {width, height} = useVideoConfig();
  const layers = Array.from({length: 6}, (_, k) => {
    const speed = 0.12 + k * 0.16;
    const off = ((frame * speed + k * 260) % (width + 600)) - 300;
    const y = height * 0.58 + k * 52;
    const amp = 20 + k * 16 + audio.mid * 24;
    const pts = Array.from({length: 40}, (_, i) => ({
      x: (i / 39) * (width + 600) - 300,
      y: 120 - Math.sin(i / 4 + frame / 70 + k * 0.8) * amp,
    }));
    return {k, off, y, d: createSmoothSvgPath({points: pts})};
  });
  return (
    <AbsoluteFill>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {layers.map((L) => (
          <g key={L.k} transform={`translate(${-L.off} ${L.y})`} opacity={0.12 + L.k * 0.09}>
            <path d={L.d + ` L ${width + 600} 400 L -300 400 Z`} fill={L.k % 2 ? C.blue : C.cyan} />
          </g>
        ))}
      </svg>
    </AbsoluteFill>
  );
};

/* 11b · 流体 SVG 波：三组正弦叠加，相位由帧号驱动 */
export const FxLiquidWave: React.FC<FxProps> = ({frame, duration, audio}) => {
  const local = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const reveal = ip(local, [0, 24], [0, 1]);
  const H = 420;
  const cy = height / 2;
  const paths = [0, 1, 2].map((k) => {
    const pts = Array.from({length: 90}, (_, i) => ({
      x: (i / 89) * width,
      y: H / 2
        + Math.sin(i / 11 + frame / 32 + k * 1.6) * (52 + audio.bass * 60)
        + Math.sin(i / 5 - frame / 22 + k) * (18 + audio.mid * 26)
        + Math.sin(i / 26 + frame / 90) * 26,
    }));
    return createSmoothSvgPath({points: pts});
  });
  return (
    <AbsoluteFill>
      <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`}
        style={{position: 'absolute', top: cy - H / 2, opacity: reveal}}>
        {paths.map((d, k) => (
          <g key={k}>
            <path d={d} fill="none" stroke={k === 0 ? C.gold : k === 1 ? C.cyan : C.blue}
              strokeWidth={14 - k * 3} opacity={0.06} strokeLinecap="round" />
            <path d={d} fill="none" stroke={k === 0 ? C.gold : k === 1 ? C.cyan : C.blue}
              strokeWidth={3 - k * 0.6} opacity={0.8 - k * 0.2} strokeLinecap="round" />
          </g>
        ))}
      </svg>
    </AbsoluteFill>
  );
};

/* 11c · 光泄漏横扫（程序化，非素材） */
export const FxLightLeak: React.FC<FxProps> = ({frame, duration}) => {
  const local = useCurrentFrame();
  const p = local / duration;
  const sweep = -0.4 + p * 1.8;
  const env = Math.pow(Math.sin(Math.PI * p), 1.4);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill style={{
        background: `linear-gradient(108deg, transparent 32%, ${C.amber} 47%, ${C.cream} 50%, ${C.amber} 53%, transparent 70%)`,
        opacity: env * 0.32, transform: `translateX(${sweep * 100}%)`,
      }} />
      {[24, 72, 54].map((x, i) => (
        <AbsoluteFill key={i} style={{
          background: `radial-gradient(${260 - i * 50}px ${260 - i * 50}px at ${x}% ${30 + i * 22}%, ${C.gold} 0%, transparent 70%)`,
          opacity: env * (0.18 - i * 0.04), mixBlendMode: 'screen',
        }} />
      ))}
    </AbsoluteFill>
  );
};

/* 12 · CRT 扫描线 + RGB 色散 + 帧驱动滚动 */
export const FxCRT: React.FC<FxProps> = ({frame, audio}) => {
  const {width, height} = useVideoConfig();
  const scroll = (frame * 3) % 8;
  const shift = 2 + audio.bass * 7;
  return (
    <AbsoluteFill style={{fontFamily: FONT_FAMILY, pointerEvents: 'none'}}>
      <AbsoluteFill style={{
        background: `repeating-linear-gradient(0deg, rgba(0,0,0,0.32) 0px, rgba(0,0,0,0.32) 1px, transparent 1px, transparent 4px)`,
        backgroundPosition: `0 ${scroll}px`, opacity: 0.5,
      }} />
      <AbsoluteFill style={{
        background: `linear-gradient(90deg, rgba(255,60,60,0.05), transparent 40%, rgba(60,140,255,0.06))`,
        mixBlendMode: 'screen',
      }} />
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 150, fontWeight: 900, letterSpacing: '0.1em', color: C.cream,
        textShadow: `${shift}px 0 rgba(255,60,60,0.75), ${-shift}px 0 rgba(60,140,255,0.75), 0 0 60px rgba(127,227,255,0.5)`,
        transform: `scale(${breathe(frame, 200, 0.015)})`,
      }}>DONAU</div>
      <div style={{
        position: 'absolute', left: 0, width, height: 60, top: (frame * 6) % (height + 60) - 60,
        background: 'linear-gradient(180deg, transparent, rgba(127,227,255,0.06), transparent)',
      }} />
    </AbsoluteFill>
  );
};

/* 12b · 同心波纹扭曲 */
export const FxRipple: React.FC<FxProps> = ({frame, audio}) => {
  const {width, height} = useVideoConfig();
  const cx = width / 2;
  const cy = height / 2;
  const rings = Array.from({length: 16}, (_, i) => {
    const r = ((frame * 4.5 + i * 78) % 760) + audio.bass * 30;
    return {i, r, op: (1 - r / 760) * 0.32};
  });
  return (
    <AbsoluteFill>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {rings.map((R) => (
          <circle key={R.i} cx={cx} cy={cy} r={R.r} fill="none"
            stroke={R.i % 3 === 0 ? C.gold : C.cyan} strokeWidth={1.5 + audio.mid * 3}
            opacity={R.op} />
        ))}
      </svg>
    </AbsoluteFill>
  );
};

/* 12c · 打字机 + 确定性光标闪烁 */
export const FxTypewriter: React.FC<FxProps> = ({duration}) => {
  const local = useCurrentFrame();
  const text = 'React → 5310 frames → one MP4. Every pixel is a pure function of the frame.';
  const shown = Math.floor(local / 2.1);
  const cursor = Math.floor(local / 14) % 2 === 0;
  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', fontFamily: FONT_FAMILY, paddingBottom: 190}}>
      <div style={{
        maxWidth: 1400, fontSize: 34, lineHeight: 1.7, color: C.cream,
        letterSpacing: '0.04em', textShadow: `0 2px 20px ${C.bg}`,
      }}>
        {Array.from(text.slice(0, shown)).map((ch, i) => (
          <span key={i} style={{color: i > shown - 8 ? C.cyan : C.cream}}>{ch}</span>
        ))}
        <span style={{opacity: cursor ? 1 : 0, color: C.gold, marginLeft: 4}}>▌</span>
      </div>
    </AbsoluteFill>
  );
};

/* 12d · 信箱黑条收放 */
export const FxLetterbox: React.FC<FxProps> = ({duration}) => {
  const local = useCurrentFrame();
  const inH = ip(local, [0, 22], [150, 74]);
  const outH = ip(local, [duration - 22, duration], [74, 150]);
  const hgt = Math.max(inH, outH);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={{position: 'absolute', top: 0, left: 0, right: 0, height: hgt, background: C.ink}} />
      <div style={{position: 'absolute', bottom: 0, left: 0, right: 0, height: hgt, background: C.ink}} />
    </AbsoluteFill>
  );
};

/* 每幕左上角的章节卡：编号 + 中文名 + 特效英文名，级联入场 */
export const ChapterCard: React.FC<{
  readonly index: number;
  readonly name: string;
  readonly effect: string;
  readonly duration: number;
}> = ({index, name, effect, duration}) => {
  const local = useCurrentFrame();
  const p = cascade(local, 0, 1, 'crisp');
  const out = ip(local, [duration - 18, duration - 4], [1, 0]);
  return (
    <AbsoluteFill style={{fontFamily: FONT_FAMILY, pointerEvents: 'none'}}>
      <div style={{
        position: 'absolute', left: 68, top: 62,
        opacity: p * out,
        transform: `translateX(${(1 - p) * -28}px)`,
        borderLeft: `3px solid ${C.gold}`, paddingLeft: 20,
      }}>
        <div style={{fontSize: 18, letterSpacing: '0.4em', color: C.gold, opacity: 0.9}}>
          CHAPTER {String(index).padStart(2, '0')} / 13
        </div>
        <div style={{fontSize: 46, fontWeight: 800, color: C.cream, marginTop: 6, letterSpacing: '0.08em'}}>{name}</div>
        <div style={{fontSize: 16, letterSpacing: '0.14em', color: C.cyan, marginTop: 8, opacity: 0.82}}>{effect}</div>
      </div>
    </AbsoluteFill>
  );
};

/* 13 · 全特效收束：粒子汇聚 + 多环 + 弹簧标题 + 光泄漏 + 淡出 */
export const FxFinale: React.FC<FxProps> = ({frame, duration, audio}) => {
  const local = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const pts = React.useMemo(() => makeParticles(260), []);
  const cx = width / 2;
  const cy = height / 2;
  const conv = ip(local, [0, S(2.2)], [0, 1]);
  const title = cascade(local, 0, 1, 'bounce');
  const sub = cascade(local, 1, 8, 'gentle');
  const fade = ip(local, [duration - 32, duration], [1, 0]);
  const rings = [0, 1, 2, 3, 4, 5].map((i) => ({
    r: 110 + i * 86 - conv * 40,
    op: (0.16 + audio.bass * 0.35) * (1 - conv * 0.4),
  }));
  return (
    <AbsoluteFill style={{opacity: fade, fontFamily: FONT_FAMILY}}>
      <AbsoluteFill style={{opacity: 0.34}}>
        <KenBurns src={staticFile('blue-danube-cover-clean.jpeg')} durationInFrames={duration} from={1.0} to={1.16} />
      </AbsoluteFill>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(3,10,24,0.5), rgba(3,10,24,0.88))'}} />
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {rings.map((R, i) => (
          <circle key={i} cx={cx} cy={cy} r={R.r} fill="none"
            stroke={i % 2 ? C.gold : C.cyan} strokeWidth={1.6} opacity={R.op}
            strokeDasharray={i % 3 === 0 ? '4 14' : undefined} />
        ))}
        {pts.map((p, i) => {
          const q = converge(p, conv, cx, cy, 820);
          return <circle key={i} cx={q.x} cy={q.y} r={1.5 + p.phase * 3}
            fill={i % 5 === 0 ? C.gold : C.cyan}
            opacity={(1 - conv * 0.5) * (0.3 + p.phase * 0.6)} />;
        })}
      </svg>
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
        <div style={{
          fontSize: 122, fontWeight: 900, color: C.cream, letterSpacing: '0.08em',
          opacity: title, transform: `translateY(${(1 - title) * 46}px) scale(${0.86 + 0.14 * title})`,
          textShadow: `0 0 70px rgba(58,160,255,0.7), 0 8px 30px ${C.bg}`,
        }}>蓝色多瑙河</div>
        <div style={{
          marginTop: 24, fontSize: 28, letterSpacing: '0.3em', color: C.cyan,
          opacity: sub * 0.9, transform: `translateY(${(1 - sub) * 18}px)`,
        }}>AN DER SCHÖNEN BLAUEN DONAU · OP. 314</div>
        <div style={{
          marginTop: 48, fontSize: 19, letterSpacing: '0.32em', color: C.gold,
          opacity: ip(local, [S(2.4), S(3.2)], [0, 0.85]),
        }}>13 CHAPTERS · 5310 FRAMES · 0 RANDOM CALLS</div>
      </AbsoluteFill>
      <AbsoluteFill style={{
        background: `radial-gradient(760px 620px at 50% 50%, ${C.cream} 0%, ${C.amber} 26%, transparent 68%)`,
        opacity: ip(local, [duration - 46, duration - 26, duration], [0, 0.13, 0]),
        mixBlendMode: 'screen',
      }} />
    </AbsoluteFill>
  );
};
