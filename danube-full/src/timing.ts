import {S} from './theme';

/** 供复用的 MorphTitle / Captions 组件引用的节奏表。整首版另见 full-timing.ts。 */
export const holdFramesFor = (text: string): number =>
  Math.round(text.length * 3.2 + 21);

export const OVERLAP = 10;
export const TOTAL = S(177);
