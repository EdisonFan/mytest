import {z} from 'zod';

/** 整片的全部可调项收敛到一个 schema，Studio 侧栏与 --props 共用同一份。 */
export const fullSchema = z.object({
  titlePhrases: z.array(z.string()).min(1),
  grainOpacity: z.number().min(0).max(0.3),
  showChapterCards: z.boolean(),
  effectDensity: z.number().int().min(1).max(3),
});

export type FullProps = z.infer<typeof fullSchema>;

export const defaultFullProps: FullProps = {
  titlePhrases: [
    '蓝色多瑙河',
    'An der schönen blauen Donau',
    'OP. 314 · WIEN 1866',
  ],
  grainOpacity: 0.055,
  showChapterCards: true,
  effectDensity: 1,
};
