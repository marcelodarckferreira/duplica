const bars = [
  { x: 24, height: 62, delay: "0s" },
  { x: 82, height: 96, delay: "0.3s" },
  { x: 140, height: 74, delay: "0.6s" },
  { x: 198, height: 118, delay: "0.9s" },
  { x: 256, height: 88, delay: "1.2s" },
  { x: 314, height: 136, delay: "1.5s" },
  { x: 372, height: 104, delay: "1.8s" },
];

const baseline = 224;
const barWidth = 34;

const linePoints = bars.map((bar) => ({
  x: bar.x + barWidth / 2,
  y: baseline - bar.height - 18,
}));

const linePath = linePoints.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");

export function BackgroundChart(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 430 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
      aria-hidden="true"
    >
      {bars.map((bar) => (
        <rect
          key={bar.x}
          x={bar.x}
          y={baseline - bar.height}
          width={barWidth}
          height={bar.height}
          rx={4}
          className="animate-bar-grow fill-white/10"
          style={{ transformBox: "fill-box", transformOrigin: "bottom", animationDelay: bar.delay }}
        />
      ))}

      <path
        d={linePath}
        stroke="white"
        strokeOpacity={0.35}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-line-draw"
        style={{ strokeDasharray: 900, strokeDashoffset: 900 }}
      />

      {linePoints.map((point, index) => (
        <circle
          key={`${point.x}-${point.y}`}
          cx={point.x}
          cy={point.y}
          r={4}
          className="animate-float-dot fill-white/70"
          style={{ animationDelay: `${index * 0.25}s` }}
        />
      ))}

      <line x1={12} y1={baseline} x2={418} y2={baseline} stroke="white" strokeOpacity={0.15} strokeWidth={1.5} />
    </svg>
  );
}
