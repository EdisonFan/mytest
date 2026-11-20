import React from "react";
import { interpolate } from "remotion";

const INK = "#45403A";
const RED = "#D65A4A";
const ORANGE = "#E39A3C";
const BLUE = "#4A78B0";

const line: React.SVGProps<SVGPathElement> = {
  stroke: INK,
  strokeWidth: 9,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  fill: "none",
};

const Bottle: React.FC<{ waterH?: number; tilt?: number }> = ({
  waterH = 0,
  tilt = 0,
}) => (
  <g transform={`rotate(${tilt} 400 360)`}>
    {waterH > 0 ? (
      <rect
        x={290}
        y={520 - waterH}
        width={220}
        height={waterH}
        rx={14}
        fill={BLUE}
        opacity={0.5}
        stroke="none"
      />
    ) : null}
    <rect x={280} y={240} width={240} height={280} rx={30} {...line} />
    <rect x={350} y={182} width={100} height={58} rx={12} {...line} />
    <line x1={338} y1={182} x2={462} y2={182} {...line} />
    <line x1={305} y1={275} x2={305} y2={470} stroke={INK} strokeWidth={5} opacity={0.35} />
  </g>
);

const CrowHead: React.FC<{
  cx: number;
  cy: number;
  s?: number;
  eyes?: "open" | "shut" | "shock";
  sweat?: boolean;
}> = ({ cx, cy, s = 1, eyes = "open", sweat = false }) => (
  <g transform={`translate(${cx} ${cy}) scale(${s})`}>
    <ellipse cx={0} cy={0} rx={92} ry={72} {...line} />
    <polygon points="72,-8 138,12 72,32" fill={ORANGE} stroke={INK} strokeWidth={8} strokeLinejoin="round" />
    {eyes === "open" ? (
      <>
        <circle cx={-26} cy={-16} r={8} fill={INK} />
        <circle cx={26} cy={-16} r={8} fill={INK} />
      </>
    ) : null}
    {eyes === "shut" ? (
      <>
        <path d="M-42,-14 Q-26,2 -10,-14" {...line} strokeWidth={7} />
        <path d="M10,-14 Q26,2 42,-14" {...line} strokeWidth={7} />
      </>
    ) : null}
    {eyes === "shock" ? (
      <>
        <circle cx={-26} cy={-16} r={16} {...line} strokeWidth={7} />
        <circle cx={26} cy={-16} r={16} {...line} strokeWidth={7} />
      </>
    ) : null}
    <ellipse cx={0} cy={-78} rx={22} ry={62} transform="rotate(18 0 -78)" {...line} />
    <ellipse cx={52} cy={-76} rx={18} ry={58} transform="rotate(-18 52 -76)" {...line} />
    {sweat ? (
      <path d="M-100,-60 q-18,26 0,38 a14,14 0 0 0 0,-38" fill={BLUE} opacity={0.8} stroke="none" />
    ) : null}
  </g>
);

const Pebble: React.FC<{ x: number; y: number; r?: number }> = ({ x, y, r = 20 }) => (
  <ellipse cx={x} cy={y} rx={r} ry={r * 0.72} fill={INK} opacity={0.16} stroke={INK} strokeWidth={6} />
);

const Stars: React.FC<{ cx: number; cy: number }> = ({ cx, cy }) => (
  <g stroke={ORANGE} strokeWidth={7} strokeLinecap="round">
    <line x1={cx - 40} y1={cy} x2={cx + 40} y2={cy} />
    <line x1={cx} y1={cy - 40} x2={cx} y2={cy + 40} />
    <line x1={cx - 28} y1={cy - 28} x2={cx + 28} y2={cy + 28} />
    <line x1={cx - 28} y1={cy + 28} x2={cx + 28} y2={cy - 28} />
  </g>
);

/** 第 1 句：半瓶冰水 + 热得冒烟的乌鸦 */
const A0: React.FC = () => (
  <>
    <Bottle waterH={150} />
    <rect x={340} y={395} width={38} height={38} rx={6} fill={BLUE} opacity={0.75} stroke="none" />
    <rect x={410} y={420} width={30} height={30} rx={6} fill={BLUE} opacity={0.75} stroke="none" />
    <CrowHead cx={400} cy={95} s={0.72} sweat />
    <path d="M180,150 q-22,-26 0,-52 q22,-26 0,-52" {...line} stroke={RED} strokeWidth={7} />
    <path d="M620,150 q-22,-26 0,-52 q22,-26 0,-52" {...line} stroke={RED} strokeWidth={7} />
  </>
);

/** 第 2 句：头卡在瓶口 */
const A1: React.FC = () => (
  <>
    <Bottle waterH={120} />
    <g transform="translate(400 168) scale(0.78)">
      <ellipse cx={0} cy={0} rx={92} ry={72} {...line} />
      <circle cx={-26} cy={-16} r={8} fill={INK} />
      <circle cx={26} cy={-16} r={8} fill={INK} />
      <polygon points="10,26 62,44 10,52" fill={ORANGE} stroke={INK} strokeWidth={8} />
    </g>
    <path d="M170,120 l-34,-24 M170,170 l-40,14 M630,120 l34,-24 M630,170 l40,14" {...line} stroke={RED} strokeWidth={7} />
    <path d="M560,90 q-18,26 0,38 a14,14 0 0 0 0,-38" fill={BLUE} opacity={0.85} stroke="none" />
  </>
);

/** 第 3 句：祖传秘方，灯泡亮了 */
const A2: React.FC = () => (
  <>
    <CrowHead cx={260} cy={300} s={0.9} />
    <Pebble x={392} y={322} r={22} />
    <circle cx={590} cy={210} r={76} fill={ORANGE} opacity={0.35} stroke={ORANGE} strokeWidth={9} />
    <path d="M590,286 l0,44 M556,330 l68,0" {...line} stroke={ORANGE} strokeWidth={8} />
    <g stroke={ORANGE} strokeWidth={8} strokeLinecap="round">
      <line x1={590} y1={112} x2={590} y2={76} />
      <line x1={680} y1={210} x2={716} y2={210} />
      <line x1={500} y1={210} x2={464} y2={210} />
      <line x1={654} y1={146} x2={680} y2={120} />
      <line x1={526} y1={146} x2={500} y2={120} />
    </g>
    <path d="M340,430 q60,-40 120,0" {...line} strokeWidth={6} opacity={0.5} />
  </>
);

/** 第 4 句：石子山 + 工时表 */
const A3: React.FC = () => (
  <>
    {Array.from({ length: 14 }).map((_, i) => {
      const col = i % 5;
      const row = Math.floor(i / 5);
      return <Pebble key={i} x={190 + col * 52} y={470 - row * 36} r={22} />;
    })}
    <rect x={520} y={190} width={190} height={230} rx={14} {...line} />
    {Array.from({ length: 12 }).map((_, i) => (
      <rect
        key={i}
        x={540 + (i % 3) * 58}
        y={215 + Math.floor(i / 3) * 50}
        width={38}
        height={30}
        rx={5}
        fill={i < 8 ? ORANGE : "none"}
        opacity={i < 8 ? 0.55 : 1}
        stroke={INK}
        strokeWidth={5}
      />
    ))}
    <path d="M160,140 q40,-30 80,0" {...line} strokeWidth={6} opacity={0.45} />
  </>
);

/** 第 5 句：水位上涨 + 给自己颁奖 */
const A4: React.FC<{ frame: number }> = ({ frame }) => {
  const waterH = interpolate(frame, [15, 120], [130, 300], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <>
      <Bottle waterH={waterH} />
      <g transform="translate(640 250)">
        <circle cx={0} cy={0} r={68} fill={ORANGE} opacity={0.6} stroke={INK} strokeWidth={8} />
        <path d="M-30,-62 l-26,-56 l52,14 l26,-56 l30,62" {...line} stroke={RED} strokeWidth={7} />
        <Stars cx={0} cy={0} />
      </g>
      <path d="M560,430 l-34,22" {...line} strokeWidth={6} opacity={0.5} />
    </>
  );
};

/** 第 6 句：低头一喝，空的 */
const A5: React.FC = () => (
  <>
    <Bottle tilt={-12} />
    <CrowHead cx={190} cy={300} s={0.72} eyes="shock" />
    <g fill={BLUE} opacity={0.75} stroke="none">
      <circle cx={560} cy={220} r={12} />
      <circle cx={620} cy={270} r={9} />
      <circle cx={580} cy={330} r={7} />
      <circle cx={650} cy={190} r={6} />
    </g>
    <path d="M540,150 q30,20 0,44" {...line} stroke={BLUE} strokeWidth={6} />
    <path d="M600,360 q30,20 0,44" {...line} stroke={BLUE} strokeWidth={6} />
  </>
);

/** 第 7 句：三米外的水龙头在哗哗流 */
const A6: React.FC<{ frame: number }> = ({ frame }) => {
  const dash = -(frame * 6) % 36;
  return (
    <>
      <rect x={520} y={150} width={170} height={70} rx={18} {...line} />
      <path d="M560,150 l0,-56 q0,-26 26,-26 l54,0" {...line} />
      <rect x={654} y={68} width={72} height={22} rx={10} fill={ORANGE} stroke={INK} strokeWidth={8} />
      <path
        d="M600,220 q-10,90 0,180 q10,80 0,140"
        {...line}
        stroke={BLUE}
        strokeWidth={16}
        strokeDasharray="26 22"
        strokeDashoffset={dash}
      />
      <ellipse cx={600} cy={545} rx={110} ry={22} fill={BLUE} opacity={0.35} stroke="none" />
      <CrowHead cx={220} cy={330} s={0.62} eyes="shock" />
      <path d="M320,250 q60,-40 120,-20" {...line} strokeWidth={6} stroke={INK} opacity={0.4} />
    </>
  );
};

/** 第 8 句：摆个小圈，蹲中间发呆 */
const A7: React.FC = () => (
  <>
    {Array.from({ length: 12 }).map((_, i) => {
      const a = (i / 12) * Math.PI * 2;
      return <Pebble key={i} x={400 + Math.cos(a) * 210} y={340 + Math.sin(a) * 150} r={19} />;
    })}
    <CrowHead cx={400} cy={330} s={0.78} eyes="shut" />
    <path
      d="M400,180 q40,-34 0,-58 q-40,-24 0,-46"
      {...line}
      strokeWidth={6}
      opacity={0.45}
    />
    <circle cx={470} cy={200} r={8} fill={INK} opacity={0.4} />
    <circle cx={498} cy={172} r={6} fill={INK} opacity={0.3} />
  </>
);

/** 第 9 句：水位上去了，可我只是想喝口水 */
const A8: React.FC = () => (
  <>
    <Bottle />
    <g transform="translate(150 300)">
      <path d="M0,160 L70,110 L140,130 L210,40" {...line} stroke={ORANGE} strokeWidth={10} />
      <path d="M180,40 l30,0 l0,30" {...line} stroke={ORANGE} strokeWidth={10} />
    </g>
    <CrowHead cx={640} cy={330} s={0.66} eyes="shut" />
    <path d="M580,450 q60,30 120,0" {...line} strokeWidth={6} opacity={0.4} />
  </>
);

/** 第 10 句：收束，只剩一瓶水与一圈光 */
const A9: React.FC<{ frame: number }> = ({ frame }) => {
  const r = interpolate(frame, [0, 130], [140, 240], {
    extrapolateRight: "clamp",
  });
  return (
    <>
      <circle cx={400} cy={310} r={r} stroke={ORANGE} strokeWidth={6} opacity={0.55} fill="none" />
      <circle cx={400} cy={310} r={r + 34} stroke={INK} strokeWidth={3} opacity={0.18} fill="none" />
      <Bottle waterH={170} />
      <path d="M300,570 q100,-26 200,0" {...line} strokeWidth={6} opacity={0.35} />
      <Stars cx={400} cy={90} />
    </>
  );
};

export const Art: React.FC<{ index: number; frame: number }> = ({ index, frame }) => {
  const common = { viewBox: "0 0 800 620", width: "100%", height: "100%" } as const;
  const body = (() => {
    switch (index) {
      case 0: return <A0 />;
      case 1: return <A1 />;
      case 2: return <A2 />;
      case 3: return <A3 />;
      case 4: return <A4 frame={frame} />;
      case 5: return <A5 />;
      case 6: return <A6 frame={frame} />;
      case 7: return <A7 />;
      case 8: return <A8 />;
      default: return <A9 frame={frame} />;
    }
  })();
  return (
    <svg {...common} style={{ overflow: "visible" }}>
      <line x1={60} y1={560} x2={740} y2={560} {...line} strokeWidth={6} opacity={0.45} />
      {body}
    </svg>
  );
};
