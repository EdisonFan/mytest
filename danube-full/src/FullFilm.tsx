import React from 'react';
import {AbsoluteFill, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Audio} from '@remotion/media';
import {useFullAudio} from './audio-hooks';
import {FilmBurn} from './components/FilmBurn';
import {MorphTitle} from './components/MorphTitle';
import {FontGate, Grade, Grain, GradientMesh, Vignette} from './lib/layers';
import {ip} from './lib/motion';
import {BURNS, CHAPTERS, FULL_TOTAL, OVERLAP} from './full-timing';
import {FullProps} from './schema';
import {
  FxBarChart, FxCardFlip, FxCarousel, FxClockWipe, FxRollingNumber, FxSpotlightIris,
} from './effects/Batch3';
import {
  FxBokeh, FxMatrixRain, FxPulseRings, FxSpectrumRing, FxStarfield, FxWaveRibbons,
} from './effects/Batch1';
import {
  FxConfettiShake, FxExplosion, FxGeometric, FxGlitch, FxLiquidMorph, FxPixelReveal,
} from './effects/Batch2';
import {
  ChapterCard, FxCRT, FxFinale, FxLetterbox, FxLightLeak, FxLiquidWave,
  FxParallax, FxRipple, FxTypewriter,
} from './effects/Batch4';

/** 每幕前后 12 帧淡入淡出，配合父 Sequence 多出的 OVERLAP 帧形成交叠。 */
const SceneShell: React.FC<{
  readonly duration: number;
  readonly fadeOut: boolean;
  readonly children: React.ReactNode;
}> = ({duration, fadeOut, children}) => {
  const f = useCurrentFrame();
  const a = ip(f, [0, 12], [0, 1]);
  const b = fadeOut ? ip(f, [duration - 12, duration], [1, 0]) : 1;
  return <AbsoluteFill style={{opacity: Math.min(a, b)}}>{children}</AbsoluteFill>;
};

const Wrapper: React.FC<{readonly offsetY?: number; readonly children: React.ReactNode}> = ({offsetY = 0, children}) => (
  <AbsoluteFill style={{transform: `translateY(${offsetY}px)`}}>{children}</AbsoluteFill>
);

export const FullFilm: React.FC<FullProps> = ({titlePhrases, grainOpacity, showChapterCards, effectDensity}) => {
  // 全局帧：整首 5310 帧。音频只在这里解码一次，结果分发给 13 幕。
  const frame = useCurrentFrame();
  const audio = useFullAudio(frame);

  const fx = {frame, audio} as const;
  const withDur = (i: number) => ({...fx, duration: CHAPTERS[i].dur});

  return (
    <FontGate>
      <AbsoluteFill>
        {/* 第 1 层：全片背景网格与渐变辉光 */}
        <GradientMesh />

        {CHAPTERS.map((c, i) => (
          <Sequence key={c.id} from={c.from} durationInFrames={c.dur + OVERLAP}>
            <SceneShell duration={c.dur + OVERLAP} fadeOut={i < CHAPTERS.length - 1}>
              {/* 01 星河 + Kinetic Morph 标题 */}
              {i === 0 && (
                <>
                  <FxStarfield {...withDur(0)} />
                  <MorphTitle phrases={titlePhrases} from={0} fontSize={116} />
                </>
              )}
              {/* 02 透视频谱环 */}
              {i === 1 && <FxSpectrumRing {...withDur(1)} />}
              {/* 03 波形丝带 + 字符雨 */}
              {i === 2 && (
                <>
                  <FxMatrixRain {...withDur(2)} />
                  <FxWaveRibbons {...withDur(2)} />
                </>
              )}
              {/* 04 脉冲环 + 散景 */}
              {i === 3 && (
                <>
                  <FxBokeh {...withDur(3)} />
                  <FxPulseRings {...withDur(3)} />
                </>
              )}
              {/* 05 RGB 故障 + 像素揭示 */}
              {i === 4 && (
                <>
                  <FxGlitch {...withDur(4)} />
                  <FxPixelReveal {...withDur(4)} />
                </>
              )}
              {/* 06 粘性融化 + 几何 */}
              {i === 5 && (
                <>
                  <FxGeometric {...withDur(5)} />
                  <FxLiquidMorph {...withDur(5)} />
                </>
              )}
              {/* 07 粒子爆发 + 纸屑 + 轻震 */}
              {i === 6 && (
                <>
                  <FxExplosion {...withDur(6)} />
                  <FxConfettiShake {...withDur(6)} />
                </>
              )}
              {/* 08 3D 旋转卡 + 翻面 */}
              {i === 7 && (
                <>
                  <FxCarousel {...withDur(7)} />
                  <Wrapper offsetY={-260}><FxCardFlip {...withDur(7)} /></Wrapper>
                </>
              )}
              {/* 09 钟扫 + 聚光虹膜 */}
              {i === 8 && (
                <>
                  <FxSpotlightIris {...withDur(8)} />
                  <FxClockWipe {...withDur(8)} />
                </>
              )}
              {/* 10 柱状图 + 数字轮 */}
              {i === 9 && (
                <>
                  <FxBarChart {...withDur(9)} />
                  <Wrapper offsetY={-290}><FxRollingNumber {...withDur(9)} /></Wrapper>
                </>
              )}
              {/* 11 视差 + 流体波 + 光泄漏 */}
              {i === 10 && (
                <>
                  <FxParallax {...withDur(10)} />
                  <FxLiquidWave {...withDur(10)} />
                  <FxLightLeak {...withDur(10)} />
                </>
              )}
              {/* 12 CRT + 波纹 + 打字机 + 信箱 */}
              {i === 11 && (
                <>
                  <FxRipple {...withDur(11)} />
                  <FxCRT {...withDur(11)} />
                  <FxTypewriter {...withDur(11)} />
                  <FxLetterbox {...withDur(11)} />
                </>
              )}
              {/* 13 全特效收束 */}
              {i === 12 && <FxFinale {...withDur(12)} />}

              {/* 密度参数：把粒子/光斑类再叠一层，演示 --props 的实际作用 */}
              {effectDensity > 1 && i % 3 === 0 && <FxBokeh {...withDur(i)} />}

              {showChapterCards && (
                <ChapterCard
                  index={i + 1}
                  name={c.name}
                  effect={c.effect}
                  duration={c.dur}
                />
              )}
            </SceneShell>
          </Sequence>
        ))}

        {/* 12 次程序化光泄漏转场，跨在两幕交界 */}
        {BURNS.map((b, i) => (
          <Sequence key={i} from={b.at} durationInFrames={b.dur}>
            <FilmBurn durationInFrames={b.dur} tint={b.tint} />
          </Sequence>
        ))}

        {/* 第 4–5 层：调色 / 颗粒 / 暗角 */}
        <Grade />
        <Grain opacity={grainOpacity} />
        <Vignette />

        {/* 真实录音整首 2:57，composition 177s 自动截断 */}
        <Audio src={staticFile('blue-danube.mp3')} />
      </AbsoluteFill>
    </FontGate>
  );
};

export {FULL_TOTAL};
