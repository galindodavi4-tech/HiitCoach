import type { ReactNode } from 'react';

interface Props {
  /** 0–1 */
  value: number;
  size: number;
  stroke?: number;
  color: string;
  children?: ReactNode;
}

/** Instrument ring with a 60-tick bezel; lit ticks and arc glow in `color`. */
export default function RingGauge({ value, size, stroke = 10, color, children }: Props) {
  const frac = Math.max(0, Math.min(1, value));
  const c = size / 2;
  const tickOuter = c - 1;
  const r = c - 14 - stroke / 2;
  const circ = 2 * Math.PI * r;

  const ticks = [];
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
    const len = i % 5 === 0 ? 7 : 3.5;
    const lit = i / 60 < frac;
    ticks.push(
      <line
        key={i}
        x1={c + Math.cos(a) * tickOuter}
        y1={c + Math.sin(a) * tickOuter}
        x2={c + Math.cos(a) * (tickOuter - len)}
        y2={c + Math.sin(a) * (tickOuter - len)}
        stroke={lit ? color : 'var(--p-carbon-600)'}
        strokeOpacity={lit ? 0.75 : 1}
        strokeWidth={1.5}
      />,
    );
  }

  return (
    <div className="relative flex-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block overflow-visible">
        {ticks}
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--p-carbon-700)" strokeWidth={stroke} />
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - frac)}
          transform={`rotate(-90 ${c} ${c})`}
          style={{ filter: `drop-shadow(0 0 8px ${color})`, transition: 'stroke-dashoffset 250ms linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center">{children}</div>
    </div>
  );
}
