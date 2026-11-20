import {z} from 'zod';

/**
 * 参数化 + Zod discriminated 思路：Onda 的做法是「每个组件带 Zod schema 与 kind」，
 * 这里把整条片子的可调项收敛到一个 schema，Studio 侧栏与 --props 共用同一份。
 */
export const filmSchema = z.object({
  titlePhrases: z.array(z.string()).min(1),
  showCaptions: z.boolean(),
  grainOpacity: z.number().min(0).max(0.3),
});

export type FilmProps = z.infer<typeof filmSchema>;

export const defaultFilmProps: FilmProps = {
  titlePhrases: [
    '蓝色多瑙河',
    'An der schönen blauen Donau',
    'Op. 314 · Wien 1866',
  ],
  showCaptions: true,
  grainOpacity: 0.055,
};
