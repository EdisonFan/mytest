import {interpolate, spring} from 'remotion';
import {FPS, SPRING} from '../theme';

const CLAMP = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};

/** 永远 clamp。规则：没 clamp 的 interpolate 是文字闪烁/跳动的头号原因。 */
export const ip = (
  frame: number,
  input: readonly number[],
  output: readonly number[],
): number => interpolate(frame, input as number[], output as number[], CLAMP);

export const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - clamp01(t), 3);
export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** spring 对负帧钳到 0，所以「frame - i * delay」就是级联的全部诀窍。 */
export const cascade = (
  frame: number,
  i: number,
  delay: number,
  preset: keyof typeof SPRING = 'crisp',
): number => spring({frame: frame - i * delay, fps: FPS, config: {...SPRING[preset]}});

/**
 * 退场：沿入场方向继续走，且用二次方位移「越走越快」，像被时间吸走。
 * 规则来源：SpecStory 2025 的 translateY((frame-75)^2 * 0.5)。
 */
export const exitDrift = (over: number, speed = 0.5): number => over * over * speed;

/** 衰减轻震：确定性，不用 Math.random。 */
export const shake = (frame: number, start: number, decay = 0.06): {x: number; y: number} => {
  const t = Math.max(0, frame - start);
  const amp = 12 * Math.exp(-t * decay);
  return {x: Math.sin(t * 1.7) * amp, y: Math.cos(t * 2.3) * amp * 0.6};
};

/** 让静止元素「呼吸」：sin 微动。规则：Idle elements breathe。 */
export const breathe = (frame: number, period = 90, amount = 1): number =>
  1 + Math.sin((frame / period) * Math.PI * 2) * amount;

/** 把一个 0..1 的值映射成 CSS 颜色（线性 RGB 插值）。 */
export const mixColor = (a: string, b: string, t: number): string => {
  const hex = (c: string): [number, number, number] => {
    const s = c.replace('#', '');
    return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
  };
  const [r1, g1, b1] = hex(a);
  const [r2, g2, b2] = hex(b);
  const k = clamp01(t);
  const h = (v: number) => Math.round(v).toString(16).padStart(2, '0');
  return `#${h(r1 + (r2 - r1) * k)}${h(g1 + (g2 - g1) * k)}${h(b1 + (b2 - b1) * k)}`;
};
