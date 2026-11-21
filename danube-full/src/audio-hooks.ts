import React from 'react';
import {
  useWindowedAudioData,
  visualizeAudio,
  visualizeAudioWaveform,
} from '@remotion/media-utils';
import {staticFile, useVideoConfig} from 'remotion';
import {clamp01} from './lib/motion';

const AUDIO = staticFile('blue-danube.mp3');

export interface AudioFrame {
  readonly spectrum: number[];
  readonly waveform: number[];
  readonly bass: number;
  readonly mid: number;
  readonly treble: number;
}

const band = (v: readonly number[], a: number, b: number): number => {
  if (!v.length) return 0;
  const s = v.slice(a, b);
  return clamp01((s.reduce((x, y) => x + y, 0) / s.length) * 3);
};

/**
 * 全片只在这里解码一次音频，然后把结果当 props 分发给 13 幕。
 * 上一版每个可视化组件各自调 useWindowedAudioData，24s 尚可；
 * 整首 5310 帧那样做会重复解码十几万次，必须收敛到顶层。
 *
 * windowInSeconds: 30 是「解码窗口」，不是「画多少秒到屏幕上」——
 * 这是官方模板里两个同名概念，别混。
 */
export const useFullAudio = (frame: number): AudioFrame => {
  const {fps} = useVideoConfig();
  const {audioData, dataOffsetInSeconds} = useWindowedAudioData({
    src: AUDIO,
    frame,
    fps,
    windowInSeconds: 30,
  });

  return React.useMemo(() => {
    if (!audioData) {
      return {spectrum: [], waveform: [], bass: 0, mid: 0, treble: 0};
    }
    const spectrum = visualizeAudio({
      fps,
      frame,
      audioData,
      numberOfSamples: 256,
      optimizeFor: 'speed',
      dataOffsetInSeconds,
    });
    const waveform = visualizeAudioWaveform({
      fps,
      frame,
      audioData,
      numberOfSamples: 2048,
      windowInSeconds: 1,
      channel: 0,
      dataOffsetInSeconds,
    });
    return {
      spectrum,
      waveform,
      bass: band(spectrum, 0, 32),
      mid: band(spectrum, 32, 110),
      treble: band(spectrum, 110, 256),
    };
  }, [audioData, frame, fps, dataOffsetInSeconds]);
};

export {AUDIO};
