import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C} from '../theme';
import {clamp01} from '../lib/motion';

/**
 * 程序化 filmBurn / dreamyZoom 白闪转场。
 * 规则来源：remotion-dev/transitions 的 filmBurn「procedural glow and blur」
 * + SpecStory 2025 的「换时代、换整套美术风格时用纯色桥接最干净」。
 * 用 16 帧跨在两幕交界处，两侧各 8 帧，避免硬切。
 */
export const FilmBurn: React.FC<{
  readonly durationInFrames: number;
  readonly tint: 'gold' | 'cyan';
}> = ({durationInFrames, tint}) => {
  const frame = useCurrentFrame();
  const t = clamp01(frame / durationInFrames);
  // 0 → 1 → 0 的光包络，峰值略偏后，像底片烧穿
  const env = Math.pow(Math.sin(Math.PI * t), 1.6);
  const core = tint === 'gold' ? C.cream : C.ice;
  const halo = tint === 'gold' ? C.amber : C.cyan;
  const sweep = -0.3 + t * 1.6;

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {/* 横向扫过的光带 */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(105deg, transparent 30%, ${halo} 48%, ${core} 51%, ${halo} 54%, transparent 72%)`,
          opacity: env * 0.5,
          transform: `translateX(${sweep * 100}%)`,
        }}
      />
      {/* 中心径向白闪 */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(760px 620px at 50% 50%, ${core} 0%, ${halo} 28%, transparent 68%)`,
          opacity: env * 0.72,
          transform: `scale(${0.7 + t * 0.9})`,
        }}
      />
      {/* 三个确定性光斑，制造漏光的不规则感 */}
      {[
        {x: 24, y: 30, r: 320},
        {x: 78, y: 68, r: 260},
        {x: 58, y: 18, r: 190},
      ].map((b, i) => (
        <AbsoluteFill
          key={i}
          style={{
            background: `radial-gradient(${b.r}px ${b.r}px at ${b.x}% ${b.y}%, ${halo} 0%, transparent 70%)`,
            opacity: env * (0.24 - i * 0.05),
            mixBlendMode: 'screen',
          }}
        />
      ))}
      {/* 收尾压黑，让下一幕从暗里浮出 */}
      <AbsoluteFill
        style={{
          background: C.bg,
          opacity: t > 0.5 ? (t - 0.5) * 2 * 0.55 : 0,
        }}
      />
    </AbsoluteFill>
  );
};
