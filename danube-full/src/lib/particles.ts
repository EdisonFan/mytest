/**
 * 确定性粒子：黄金角螺旋球面分布 + 逐帧透视投影。
 * 硬规则：绝不使用 Math.random —— Remotion 逐帧乱序并行渲染，
 * 同一帧每次必须得到完全相同的像素（Onda 的 CLAUDE.md 第一条）。
 */
export interface Particle {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly phase: number;
}

export const makeParticles = (count: number): Particle[] => {
  const golden = Math.PI * (1 + Math.sqrt(5));
  const out: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
    const theta = golden * i;
    const sp = Math.sin(phi);
    out.push({
      x: sp * Math.cos(theta),
      y: Math.cos(phi),
      z: sp * Math.sin(theta),
      // 确定性伪随机：整数哈希，不用 Math.random
      phase: (((i * 2654435761) >>> 0) % 1000) / 1000,
    });
  }
  return out;
};

export interface Projected {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly depth: number;
  readonly alpha: number;
}

export const project = (
  p: Particle,
  frame: number,
  fps: number,
  cx: number,
  cy: number,
  radius: number,
  spin = 0.18,
): Projected => {
  const a = (frame / fps) * spin + p.phase * 0.6;
  const x = p.x * Math.cos(a) - p.z * Math.sin(a);
  const z = p.x * Math.sin(a) + p.z * Math.cos(a);
  const persp = 2.6 / (2.6 - z * 0.65);
  return {
    x: cx + x * radius * persp,
    y: cy + p.y * radius * persp,
    scale: persp,
    depth: z,
    alpha: 0.22 + ((z + 1) / 2) * 0.78,
  };
};

/** 从四周向中心汇聚：用于尾声收束。 */
export const converge = (
  p: Particle,
  progress: number,
  cx: number,
  cy: number,
  spread: number,
): {x: number; y: number} => {
  const angle = Math.atan2(p.y, p.x);
  const r = spread * (1 - progress) * (0.6 + p.phase * 0.4);
  return {x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r};
};
