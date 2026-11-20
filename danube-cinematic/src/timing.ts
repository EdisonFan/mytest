import {S} from './theme';

/**
 * 一份时间轴管四幕 + 三次转场。
 * 规则来源：SpecStory 2025 hero video 的 src/timing.ts —— 场景、旁白、音效共用一份表。
 * 所有 Scene 都比名义时长多 OVERLAP 帧，让相邻幕在交界处交叠而非硬切。
 * 规则来源：remotion-dev/trailer 的「故意重叠 10 帧」。
 */
export const OVERLAP = 10;
export const TOTAL = S(24);

export const SCENES = [
  {id: 'overture', label: '序曲 · 星河与标题', from: S(0), dur: S(6)},
  {id: 'waltz', label: '第一圆舞曲 · 频谱环', from: S(6), dur: S(8)},
  {id: 'ribbons', label: '第二圆舞曲 · 波形丝带', from: S(14), dur: S(6)},
  {id: 'finale', label: '尾声 · 封面收束', from: S(20), dur: S(4)},
] as const;

/** 转场落在两幕交界处，向前覆盖 8 帧、向后覆盖 8 帧。 */
export const BURNS = [
  {at: S(6) - 8, dur: 16, tint: 'gold'},
  {at: S(14) - 8, dur: 16, tint: 'cyan'},
  {at: S(20) - 8, dur: 16, tint: 'gold'},
] as const;

/** 字幕：一句一幕，停留长度由字数推导，不用固定帧数。 */
export const CAPTIONS = [
  {scene: 0, text: '多瑙河的水，先听见了节拍'},
  {scene: 1, text: '三拍子里，整座维也纳开始旋转'},
  {scene: 2, text: '旋律化成丝带，从低频一直铺到高音'},
  {scene: 3, text: '一八六六 · 至今仍在流动'},
] as const;

/** words × 9 + 21 的节奏表（官方 trailer 学到），再按中文字数缩放。 */
export const holdFramesFor = (text: string): number =>
  Math.round((text.length * 3.2 + 21) * 1);
