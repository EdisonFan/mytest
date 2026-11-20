/**
 * 单一事实来源：颜色 / 缓动 / 弹簧 / 错峰 / 尺幅。
 * 规则来源：haidrrrry/claude-remotion-skill 的 assets/theme.ts
 * ——「一个 theme.ts 管所有颜色与缓动，禁止组件内联色值」。
 */
export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/** 秒 → 帧。全片唯一的换算入口，禁止在业务代码里写魔法帧数。 */
export const S = (seconds: number): number => Math.round(seconds * FPS);

export const C = {
  bg: '#030a18',
  deep: '#071a35',
  blue: '#3aa0ff',
  cyan: '#7fe3ff',
  ice: '#cfeaff',
  gold: '#f0c674',
  amber: '#ffb347',
  cream: '#fff2d6',
  white: '#f2f8ff',
  ink: '#0a1424',
} as const;

/** 阻尼振荡器预设。一个 spring 值同时驱动 opacity / translate / scale。 */
export const SPRING = {
  gentle: {damping: 200, stiffness: 80, mass: 1},
  crisp: {damping: 20, stiffness: 180, mass: 1},
  bounce: {damping: 8, stiffness: 150, mass: 1},
  heavy: {damping: 15, stiffness: 80, mass: 2},
} as const;

/** 级联步长。规则：紧节奏 3–5 帧，从容 10 帧；逐字 1–2 帧。 */
export const STAGGER = {
  char: 1.5,
  word: 4,
  tight: 3,
  normal: 5,
  loose: 10,
} as const;

/** 退场必须比入场快，且沿入场方向继续走。 */
export const EXIT_FRAMES = 9;
export const ENTRANCE_FRAMES = 15;

export const FONT_FAMILY = '"Danube CJK", "WenQuanYi Micro Hei", sans-serif';
