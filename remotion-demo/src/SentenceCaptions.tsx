import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import type { Caption } from "./types";
import { HOUSE_EASE } from "./Effects";

/**
 * 逐字弹入字幕（参考 RVE bubble-pop-text / Remocn Per Character Rise）。
 * 动效全部由 useCurrentFrame() 驱动，不使用 CSS transition / animation。
 */
export const SentenceCaptions: React.FC<{
  captions: Caption[];
  emphasis?: boolean;
}> = ({ captions, emphasis = false }) => {
  const frame = useCurrentFrame();
  const text = captions[0]?.text ?? "";
  const chars = Array.from(text);

  const shown = Math.round(
    interpolate(frame, [5, 44], [0, chars.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: HOUSE_EASE,
    }),
  );
  const opacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateRight: "clamp",
  });
  const cursorOn = frame % 30 < 18;
  const done = shown >= chars.length;
  // 结尾句把「找不到那口水」染红放大，作为落点
  const highlightFrom = emphasis ? chars.length - 7 : -1;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 150,
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
      <span style={{ maxWidth: 1440, whiteSpace: "pre-wrap" }}>
        {chars.slice(0, shown).map((ch, i) => {
          const p = interpolate(frame, [5 + i * 1.4, 11 + i * 1.4], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: HOUSE_EASE,
          });
          const isPunct = "，。：；！？—".includes(ch);
          const isHighlight = emphasis && i >= highlightFrom;
          const y = (1 - p) * 28 - (isPunct ? p * 8 : 0);
          const s = (0.78 + 0.22 * p) * (isHighlight ? 1.12 : 1);
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                transform: `translateY(${y}px) scale(${s})`,
                color: isHighlight ? "#D65A4A" : undefined,
              }}
            >
              {ch}
            </span>
          );
        })}
        {!done && cursorOn ? (
          <span style={{ color: "#D65A4A" }}>｜</span>
        ) : null}
      </span>
    </div>
  );
};
