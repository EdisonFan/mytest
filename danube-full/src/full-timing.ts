import {S} from './theme';

/**
 * 整首 177 秒 = 5310 帧 @30fps。
 * 12 个「特效展台」各 14s + 9s 收尾，共 13 幕。
 * 不再按华尔兹 3/4 拍编排（这次只堆视觉），但仍用真实录音驱动频谱/波形。
 * 规则：所有时长走 S(秒)，禁止魔法帧数。
 */
export const OVERLAP = 10;
export const CHAPTER_SECONDS = 14;
export const FINALE_SECONDS = 9;
export const TOTAL_SECONDS = 12 * CHAPTER_SECONDS + FINALE_SECONDS; // 177
export const FULL_TOTAL = S(TOTAL_SECONDS); // 5310

export interface Chapter {
  readonly id: string;
  readonly name: string;
  readonly effect: string;
  readonly from: number;
  readonly dur: number;
}

export const CHAPTERS: Chapter[] = [
  {id: 'c01', name: '星河', effect: '3D Particle Starfield + Kinetic Morph', from: S(0), dur: S(14)},
  {id: 'c02', name: '频谱环', effect: 'Perspective Spectrum Ring + Bass Disc', from: S(14), dur: S(14)},
  {id: 'c03', name: '波形雨', effect: 'Triple Wave Ribbons + Matrix Rain + Scanlines', from: S(28), dur: S(14)},
  {id: 'c04', name: '脉冲', effect: 'Pulse Rings + Dancing Notes + Bokeh', from: S(42), dur: S(14)},
  {id: 'c05', name: '故障', effect: 'RGB Glitch Text + Pixel Transition', from: S(56), dur: S(14)},
  {id: 'c06', name: '融化', effect: 'Liquid Gooey Morph + Geometric Patterns', from: S(70), dur: S(14)},
  {id: 'c07', name: '爆发', effect: 'Particle Explosion + Confetti + Camera Shake', from: S(84), dur: S(14)},
  {id: 'c08', name: '旋转', effect: '3D Carousel + Card Flip + Ken Burns', from: S(98), dur: S(14)},
  {id: 'c09', name: '揭幕', effect: 'Clock Wipe + Spotlight + Iris', from: S(112), dur: S(14)},
  {id: 'c10', name: '数据', effect: 'Cascading Bar Chart + Rolling Number', from: S(126), dur: S(14)},
  {id: 'c11', name: '视差', effect: 'Multi-layer Parallax + Liquid Wave + Light Leak', from: S(140), dur: S(14)},
  {id: 'c12', name: '显像', effect: 'CRT + Chromatic Ripple + Typewriter + Letterbox', from: S(154), dur: S(14)},
  {id: 'c13', name: '收束', effect: 'All-effects Convergence Finale', from: S(168), dur: S(9)},
];

/** 12 次程序化光泄漏转场，跨在两幕交界前 8 帧。 */
export const BURNS = CHAPTERS.slice(0, -1).map((c, i) => ({
  at: c.from + c.dur - 8,
  dur: 16,
  tint: (i % 3 === 1 ? 'cyan' : 'gold') as 'cyan' | 'gold',
}));

/** 每幕的章节卡：左上角的编号与特效名，逐帧级联出现。 */
export const CHAPTER_LABELS = CHAPTERS.map((c, i) => ({
  index: i + 1,
  name: c.name,
  effect: c.effect,
  from: c.from,
}));
