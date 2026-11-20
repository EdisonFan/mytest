// 与 @remotion/captions 的 Caption 类型保持一致（remotion-captions skill 要求）
export type Caption = {
  text: string;
  startMs: number;
  endMs: number;
  timestampMs: number | null;
  confidence: number | null;
  pageBreakAfter?: boolean;
};
