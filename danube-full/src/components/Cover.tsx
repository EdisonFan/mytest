import React from 'react';
import {AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT_FAMILY, S} from '../theme';
import {cascade, ip, shake} from '../lib/motion';
import {converge, makeParticles} from '../lib/particles';
import {KenBurns} from '../lib/layers';

/** 尾声：所有视觉元素向中心收束，最后落定在封面上。 */
export const Cover: React.FC<{readonly durationInFrames: number}> = ({durationInFrames}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const pts = React.useMemo(() => makeParticles(160), []);
  const cx = width / 2;
  const cy = height / 2;
  const conv = ip(frame, [0, S(1.5)], [0, 1]);
  const {x: sx, y: sy} = shake(frame, S(0.9), 0.075);
  const titleSpring = cascade(frame, 0, 1, 'bounce');
  const subSpring = cascade(frame, 1, 6, 'gentle');

  return (
    <AbsoluteFill style={{transform: `translate(${sx}px, ${sy}px)`}}>
      {/* Ken Burns 封面，压暗做背景 */}
      <AbsoluteFill style={{opacity: 0.42}}>
        <KenBurns src={staticFile('blue-danube-cover-clean.jpeg')} durationInFrames={durationInFrames} from={1.1} to={1.24} />
      </AbsoluteFill>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(3,10,24,0.55), rgba(3,10,24,0.86))'}} />

      {/* 粒子从四周汇聚 */}
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {pts.map((p, i) => {
          const q = converge(p, conv, cx, cy, 780);
          return (
            <circle
              key={i}
              cx={q.x}
              cy={q.y}
              r={1.6 + p.phase * 2.6}
              fill={i % 4 === 0 ? C.gold : C.cyan}
              opacity={(1 - conv * 0.55) * (0.3 + p.phase * 0.6)}
            />
          );
        })}
      </svg>

      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', fontFamily: FONT_FAMILY}}>
        <div
          style={{
            fontSize: 116,
            fontWeight: 800,
            color: C.cream,
            letterSpacing: '0.08em',
            opacity: titleSpring,
            transform: `translateY(${(1 - titleSpring) * 44}px) scale(${0.86 + 0.14 * titleSpring})`,
            textShadow: `0 0 60px rgba(58,160,255,0.65), 0 8px 30px rgba(3,10,24,0.9)`,
          }}
        >
          蓝色多瑙河
        </div>
        <div
          style={{
            marginTop: 22,
            fontSize: 30,
            letterSpacing: '0.26em',
            color: C.cyan,
            opacity: subSpring * 0.92,
            transform: `translateY(${(1 - subSpring) * 18}px)`,
          }}
        >
          AN DER SCHÖNEN BLAUEN DONAU · OP. 314
        </div>
        <div
          style={{
            marginTop: 44,
            fontSize: 20,
            letterSpacing: '0.34em',
            color: C.gold,
            opacity: ip(frame, [S(1.6), S(2.2)], [0, 0.85]),
          }}
        >
          JOHANN STRAUSS II · 1866
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
