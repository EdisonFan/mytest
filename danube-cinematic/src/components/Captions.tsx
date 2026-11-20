import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, ENTRANCE_FRAMES, EXIT_FRAMES, FONT_FAMILY, STAGGER} from '../theme';
import {cascade, exitDrift, ip, mixColor} from '../lib/motion';
import {holdFramesFor} from '../timing';

/**
 * 逐字弹簧级联 + 沿入场方向继续退场。
 * 规则来源：官方 trailer（入场 10–15 帧、停留 words×9+21、退场 8–10 帧且更快）
 * + claude-remotion-skill（入场必须 2–3 个属性联动）。
 */
export const Caption: React.FC<{
  readonly text: string;
  readonly index: number;
  readonly label: string;
  readonly durationInFrames: number;
}> = ({text, index, label, durationInFrames}) => {
  const frame = useCurrentFrame();
  const {width} = useVideoConfig();
  const chars = Array.from(text);
  const hold = holdFramesFor(text);
  const exitAt = ENTRANCE_FRAMES + hold;
  const over = Math.max(0, frame - exitAt);
  const exitOpacity = ip(over, [0, EXIT_FRAMES], [1, 0]);
  const outY = -exitDrift(over, 0.5);
  const progress = ip(frame, [0, durationInFrames], [0, 100]);

  return (
    <AbsoluteFill style={{fontFamily: FONT_FAMILY}}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 112,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 18,
          opacity: exitOpacity,
          transform: `translateY(${outY}px)`,
        }}
      >
        {/* 幕号：错峰淡入 */}
        <div
          style={{
            fontSize: 22,
            letterSpacing: '0.42em',
            color: C.gold,
            opacity: ip(frame, [0, 14], [0, 0.9]),
            transform: `translateY(${ip(frame, [0, 14], [14, 0])}px)`,
          }}
        >
          {String(index + 1).padStart(2, '0')} / {label}
        </div>

        <div style={{display: 'flex', whiteSpace: 'pre'}}>
          {chars.map((ch, i) => {
            const p = cascade(frame, i, STAGGER.char, 'crisp');
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  fontSize: 52,
                  fontWeight: 700,
                  color: mixColor(C.white, C.cyan, i / Math.max(1, chars.length)),
                  opacity: p,
                  // 三属性联动：位移 + 缩放 + 轻微旋转都由同一个 spring 值驱动
                  transform: `translateY(${(1 - p) * 30}px) scale(${0.9 + 0.1 * p}) rotate(${(1 - p) * 5}deg)`,
                  textShadow: `0 4px 24px rgba(3,10,24,0.9), 0 0 18px rgba(58,160,255,0.45)`,
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>

        {/* 进度条：从 0 走到 100%，把该幕的时长可视化 */}
        <div style={{width: Math.min(560, width * 0.42), height: 2, background: 'rgba(207,234,255,0.16)'}}>
          <div style={{width: `${progress}%`, height: '100%', background: `linear-gradient(90deg, ${C.blue}, ${C.gold})`}} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
