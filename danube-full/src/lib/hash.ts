/**
 * 整数哈希伪随机。Remotion 逐帧乱序并行渲染，同一帧必须得到完全相同的像素，
 * 所以全片禁止 Math.random() 与任何渲染期状态。
 * 规则出处：Onda 的 CLAUDE.md 第一条、Remocn FAQ 的 flicker 排查清单。
 */
export const h1 = (n: number): number => {
  let x = (n | 0) ^ 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad);
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97);
  return ((x ^ (x >>> 15)) >>> 0) / 4294967296;
};

export const h2 = (a: number, b: number): number => h1(a * 73856093 ^ b * 19349663);

/** 帧相关的确定性噪声，用于 glitch / 抖动 / 闪烁。 */
export const frameNoise = (frame: number, i: number): number => h2(frame, i);

/** 黄金角，用于粒子与纸屑的角度分布。 */
export const GOLDEN_ANGLE = Math.PI * (1 + Math.sqrt(5));
