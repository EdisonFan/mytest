import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';
import {C, FONT_FAMILY, S, STAGGER} from '../theme';
import {cascade, exitDrift, ip, mixColor} from '../lib/motion';

/**
 * Kinetic Morph Text 风格标题，按 remocn.dev 的 KineticMorphText 思路复刻：
 * 相同字母旅行到新位置，其余字母 lift / rotate / 软形变到替换字形，
 * 带轮廓拖尾；最后一个短语停留。所有值由帧号推导，倒放也一致。
 * 复刻而非安装：这些库的设计本来就是「源码复制进项目，归你所有」。
 */
const isCJK = (ch: string): boolean => /[\u3400-\u9fff]/.test(ch);

const charWidth = (ch: string, size: number): number =>
  isCJK(ch) ? size * 1.04 : size * 0.62;

const PhraseLayer: React.FC<{
  readonly text: string;
  readonly prev: string;
  readonly duration: number;
  readonly fontSize: number;
  readonly isFirst: boolean;
  readonly isLast: boolean;
}> = ({text, prev, duration, fontSize, isFirst, isLast}) => {
  // 本组件被 <Sequence> 包裹，因此这里拿到的是相对帧号。
  const frame = useCurrentFrame();
  const entrance = S(1.1);
  const exit = 9;
  const hold = duration - entrance - exit;
  const chars = Array.from(text);
  const totalW = chars.reduce((a, ch) => a + charWidth(ch, fontSize), 0);
  let cursor = -totalW / 2;

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: FONT_FAMILY,
      }}
    >
        <div style={{position: 'relative', height: fontSize * 1.5, width: '100%'}}>
          {chars.map((ch, i) => {
            const w = charWidth(ch, fontSize);
            const cx = cursor + w / 2;
            cursor += w;
            const reused = !isFirst && prev[i] === ch;
            const p = cascade(frame, i, STAGGER.char, reused ? 'gentle' : 'bounce');
            const entranceOpacity = ip(frame, [i * STAGGER.char, i * STAGGER.char + 6], [0, 1]);
            const over = Math.max(0, frame - (entrance + hold));
            const exitOpacity = isLast ? 1 : ip(over, [0, exit], [1, 0]);
            const outY = isLast ? 0 : -exitDrift(over, 0.42);
            const lift = (1 - p) * (reused ? 26 : 78);
            const rot = (1 - p) * (reused ? 6 : 22) * (i % 2 === 0 ? 1 : -1);
            const color = mixColor(C.cream, C.cyan, Math.min(1, i / Math.max(1, chars.length)));
            const trail = (1 - p) * 0.45;

            return (
              <span
                key={`${ch}-${i}`}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: w,
                  marginLeft: cx - w / 2,
                  textAlign: 'center',
                  display: 'inline-block',
                  fontSize,
                  fontWeight: 800,
                  lineHeight: 1.15,
                  color,
                  opacity: entranceOpacity * exitOpacity * (0.42 + 0.58 * p),
                  transform: `translateY(${lift + outY}px) rotate(${rot}deg) scale(${0.82 + 0.18 * p})`,
                  textShadow: `0 0 ${18 + 26 * p}px rgba(127,227,255,0.55), ${trail * -8}px ${trail * 6}px 0 rgba(240,198,116,${trail})`,
                  filter: `blur(${(1 - p) * 3}px)`,
                  whiteSpace: 'pre',
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>
    </AbsoluteFill>
  );
};

export const MorphTitle: React.FC<{
  readonly phrases: readonly string[];
  readonly from?: number;
  readonly fontSize?: number;
}> = ({phrases, from = 0, fontSize = 108}) => {
  const per = S(1.85);
  return (
    <AbsoluteFill>
      {phrases.map((text, i) => (
        <Sequence
          key={i}
          from={from + i * per}
          durationInFrames={i === phrases.length - 1 ? 100000 : per}
        >
          <PhraseLayer
            text={text}
            prev={i > 0 ? phrases[i - 1] : ''}
            duration={per}
            fontSize={i === 0 ? fontSize : fontSize * 0.52}
            isFirst={i === 0}
            isLast={i === phrases.length - 1}
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
