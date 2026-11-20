import React, {useEffect, useState} from 'react';
import {
  AbsoluteFill,
  Img,
  cancelRender,
  staticFile,
  useCurrentFrame,
  useDelayRender,
  useVideoConfig,
} from 'remotion';
import {C, FONT_FAMILY, FPS} from '../theme';
import {breathe, ip} from './motion';

/**
 * 字体门：官方模板 WaitForFonts 的写法。中文字体随仓库离线携带，
 * runner 不需要 apt（上一轮 apt-get 装 CJK 卡死过两分钟）。
 * 异步资源等待是 useDelayRender 的合法用例，与「渲染中禁 useState」不冲突。
 */
export const FontGate: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [ready, setReady] = useState(false);
  const {delayRender, continueRender} = useDelayRender();
  const [handle] = useState(() => delayRender('Waiting for Danube CJK font'));

  useEffect(() => {
    if (ready) return;
    const style = document.createElement('style');
    style.textContent =
      `@font-face { font-family: 'Danube CJK'; ` +
      `src: url('${staticFile('danube-font.ttf')}') format('truetype'); ` +
      `font-weight: 100 900; font-display: block; }`;
    document.head.appendChild(style);
    document.fonts
      .load('700 80px "Danube CJK"')
      .then(() => setReady(true))
      .catch((e: unknown) => cancelRender(e as Error));
  }, [ready, handle]);

  useEffect(() => {
    if (ready) continueRender(handle);
  }, [ready, continueRender, handle]);

  if (!ready) return null;
  return <>{children}</>;
};

/** 第 1 层：背景网格 + 缓慢漂移的渐变辉光。 */
export const GradientMesh: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin((frame / FPS) * 0.35);
  const drift2 = Math.cos((frame / FPS) * 0.24);
  return (
    <AbsoluteFill style={{backgroundColor: C.bg}}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 700px at ${28 + drift * 6}% ${32 + drift2 * 5}%, #123a6b 0%, rgba(7,26,53,0.55) 45%, transparent 72%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(760px 620px at ${76 - drift2 * 7}% ${72 - drift * 5}%, #0d2b52 0%, rgba(3,10,24,0) 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(520px 520px at 50% 50%, rgba(58,160,255,0.10) 0%, transparent 70%)`,
          transform: `scale(${breathe(frame, 150, 0.06)})`,
        }}
      />
      <GridField />
    </AbsoluteFill>
  );
};

/** 透视细网格，用 SVG line 按索引确定性绘制。 */
export const GridField: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const horizon = height * 0.56;
  const scroll = (frame % 60) / 60;
  const lines: React.ReactNode[] = [];
  for (let i = 0; i <= 18; i++) {
    const t = (i + scroll) / 18;
    const y = horizon + Math.pow(t, 2.1) * (height - horizon);
    lines.push(
      <line
        key={`h${i}`}
        x1={0}
        y1={y}
        x2={width}
        y2={y}
        stroke={C.blue}
        strokeWidth={1}
        opacity={0.055 + t * 0.05}
      />,
    );
  }
  for (let i = -12; i <= 12; i++) {
    lines.push(
      <line
        key={`v${i}`}
        x1={width / 2 + i * 26}
        y1={horizon}
        x2={width / 2 + i * 160}
        y2={height}
        stroke={C.blue}
        strokeWidth={1}
        opacity={0.05}
      />,
    );
  }
  return (
    <AbsoluteFill>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {lines}
      </svg>
    </AbsoluteFill>
  );
};

/** 第 4 层：全局调色（轻微蓝色提升）。 */
export const Grade: React.FC = () => (
  <AbsoluteFill
    style={{
      background: 'linear-gradient(160deg, rgba(58,160,255,0.055) 0%, rgba(240,198,116,0.025) 100%)',
      mixBlendMode: 'screen',
      pointerEvents: 'none',
    }}
  />
);

/** 第 5 层：胶片颗粒。用静态确定性噪点图 + 帧驱动位移，避免 SVG filter 拖慢逐帧。 */
export const Grain: React.FC<{readonly opacity?: number}> = ({opacity = 0.055}) => {
  const frame = useCurrentFrame();
  const x = (frame * 37) % 256;
  const y = (frame * 53) % 256;
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `url(${staticFile('grain.png')})`,
        backgroundPosition: `${x}px ${y}px`,
        opacity,
        mixBlendMode: 'overlay',
        pointerEvents: 'none',
      }}
    />
  );
};

/** 第 5 层：暗角。 */
export const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background: 'radial-gradient(ellipse at center, transparent 42%, rgba(1,4,10,0.72) 100%)',
      pointerEvents: 'none',
    }}
  />
);

/** Ken Burns：静态封面永远在缓慢推近，不能干放着。 */
export const KenBurns: React.FC<{
  readonly src: string;
  readonly durationInFrames: number;
  readonly from?: number;
  readonly to?: number;
}> = ({src, durationInFrames, from = 1.06, to = 1.18}) => {
  const frame = useCurrentFrame();
  const scale = ip(frame, [0, durationInFrames], [from, to]);
  const panX = ip(frame, [0, durationInFrames], [-8, 10]);
  const panY = ip(frame, [0, durationInFrames], [6, -8]);
  return (
    <Img
      src={src}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        transform: `scale(${scale}) translate(${panX}px, ${panY}px)`,
        fontFamily: FONT_FAMILY,
      }}
    />
  );
};
