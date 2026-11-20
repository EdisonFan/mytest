import React from 'react';
import {AbsoluteFill, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Audio} from '@remotion/media';
import {
  Starfield,
  SpectrumRing,
  WaltzRings,
  WaveRibbons,
} from './components/AudioViz';
import {Caption} from './components/Captions';
import {Cover} from './components/Cover';
import {FilmBurn} from './components/FilmBurn';
import {MorphTitle} from './components/MorphTitle';
import {FontGate, Grade, Grain, GradientMesh, Vignette} from './lib/layers';
import {ip} from './lib/motion';
import {BURNS, CAPTIONS, OVERLAP, SCENES} from './timing';
import {FilmProps} from './schema';

/**
 * SceneShell：每幕前后各 12 帧淡入淡出，配合父 Sequence 多出的 OVERLAP 帧形成交叠。
 * 最后一幕不淡出，避免收尾变黑。
 */
const SceneShell: React.FC<{
  readonly durationInFrames: number;
  readonly fadeOut: boolean;
  readonly children: React.ReactNode;
}> = ({durationInFrames, fadeOut, children}) => {
  const f = useCurrentFrame();
  const inOp = ip(f, [0, 12], [0, 1]);
  const outOp = fadeOut ? ip(f, [durationInFrames - 12, durationInFrames], [1, 0]) : 1;
  return <AbsoluteFill style={{opacity: Math.min(inOp, outOp)}}>{children}</AbsoluteFill>;
};

export const DanubeFilm: React.FC<FilmProps> = ({
  titlePhrases,
  showCaptions,
  grainOpacity,
}) => {
  // 全局帧：所有音频取样都用它，避免 Sequence 相对帧导致第二幕从曲子开头重新取样。
  const frame = useCurrentFrame();

  return (
    <FontGate>
      <AbsoluteFill>
        {/* 第 1 层：背景网格与渐变辉光（全片） */}
        <GradientMesh />

        {/* 四幕 */}
        {SCENES.map((sc, i) => (
          <Sequence
            key={sc.id}
            from={sc.from}
            durationInFrames={sc.dur + OVERLAP}
          >
            <SceneShell
              durationInFrames={sc.dur + OVERLAP}
              fadeOut={i < SCENES.length - 1}
            >
              {i === 0 ? (
                <>
                  <Starfield frame={frame} />
                  <MorphTitle phrases={titlePhrases} from={6} fontSize={112} />
                </>
              ) : null}
              {i === 1 ? <SpectrumRing frame={frame} start={sc.from} /> : null}
              {i === 2 ? (
                <>
                  <WaltzRings frame={frame} start={sc.from} />
                  <WaveRibbons frame={frame} start={sc.from} />
                </>
              ) : null}
              {i === 3 ? <Cover durationInFrames={sc.dur} /> : null}

              {showCaptions ? (
                <Caption
                  text={CAPTIONS[i].text}
                  index={i}
                  label={sc.label}
                  durationInFrames={sc.dur}
                />
              ) : null}
            </SceneShell>
          </Sequence>
        ))}

        {/* 三次程序化光泄漏转场，跨在两幕交界 */}
        {BURNS.map((b, i) => (
          <Sequence key={i} from={b.at} durationInFrames={b.dur}>
            <FilmBurn durationInFrames={b.dur} tint={b.tint} />
          </Sequence>
        ))}

        {/* 第 4–5 层：调色、颗粒、暗角（顶层，全片） */}
        <Grade />
        <Grain opacity={grainOpacity} />
        <Vignette />

        {/* 真实录音：整首 2:57，composition 24s 自动截断 */}
        <Audio src={staticFile('blue-danube.mp3')} />
      </AbsoluteFill>
    </FontGate>
  );
};
