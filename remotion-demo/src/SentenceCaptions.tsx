import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import type { Caption } from "./types";

/**
 * 逐句字幕（一句一条 Caption，内联在每个场景的 Sequence 里）。
 * 动效全部由 useCurrentFrame() 驱动，不使用 CSS transition/animation。
 */
export const SentenceCaptions: React.FC<{
  captions: Caption[];
  emphasis?: boolean;
}> = ({ captions, emphasis = false }) => {
  const frame = useCurrentFrame();
  const text = captions[0]?.text ?? "";

  const shown = Math.round(
    interpolate(frame, [5, 48], [0, text.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    }),
  );
  const opacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateRight: "clamp",
  });
  const cursorOn = frame % 30 < 18;
  const done = shown >= text.length;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 120,
        left: 210,
        width: 1500,
        minHeight: 190,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        fontFamily: '"WenQuanYi Micro Hei", "Noto Sans CJK SC", sans-serif',
        fontSize: emphasis ? 78 : 70,
        fontWeight: 700,
        lineHeight: 1.45,
        letterSpacing: 2,
        color: "#45403A",
        opacity,
      }}
    >
      <span style={{ maxWidth: 1440 }}>
        {text.slice(0, shown)}
        {!done && cursorOn ? (
          <span style={{ color: "#D65A4A" }}>｜</span>
        ) : null}
      </span>
    </div>
  );
};
