import { useState } from 'react';
import type { WeekTotal } from '../../lib/stats';
import { niceMax, useWidth } from './useWidth';

const H = 160;
const PAD = { top: 10, right: 4, bottom: 22, left: 34 };
const DM = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });

// Bar with 4px rounded top corners, anchored square to the baseline
function barPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/** Minutes trained per week, oldest → current week. Tap a bar for its numbers. */
export default function WeeklyBars({ weeks }: { weeks: WeekTotal[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [selected, setSelected] = useState(weeks.length - 1);

  const max = niceMax(Math.max(...weeks.map((w) => w.minutes)), 30);
  const plotW = width - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const band = plotW / weeks.length;
  const barW = Math.max(6, band * 0.62);
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const sel = weeks[selected];
  const isCurrent = selected === weeks.length - 1;

  return (
    <div className="flex flex-col gap-2">
      <p className="min-h-6 text-[15px]" aria-live="polite">
        <span className="font-bold">{isCurrent ? 'Esta semana' : `Semana de ${DM.format(sel.start)}`}</span>
        <span className="text-secondary">
          {` · ${sel.minutes} min · ${sel.count} ${sel.count === 1 ? 'treino' : 'treinos'}`}
        </span>
      </p>
      <div ref={ref}>
        <svg width={width} height={H} role="img" aria-label="Minutos de treino por semana" className="block">
          {[0, max / 2, max].map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} stroke="var(--border-subtle)" strokeDasharray={v === 0 ? undefined : '3 4'} />
              <text x={PAD.left - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill="var(--text-muted)" fontFamily="var(--font-ui)">
                {v}
              </text>
            </g>
          ))}
          {weeks.map((w, i) => {
            const x = PAD.left + i * band + (band - barW) / 2;
            const h = Math.max(0, y(0) - y(w.minutes));
            const showLabel = i === weeks.length - 1 || (weeks.length - 1 - i) % 3 === 0;
            return (
              <g key={i} className="cursor-pointer" onClick={() => setSelected(i)}>
                {/* Hit target: the whole column, bigger than the bar */}
                <rect x={PAD.left + i * band} y={PAD.top} width={band} height={plotH + PAD.bottom} fill="transparent" />
                {h > 0 && (
                  <path
                    d={barPath(x, y(w.minutes), barW, h)}
                    fill="var(--jb-crimson-500)"
                    opacity={i === selected ? 1 : 0.7}
                  />
                )}
                {i === selected && (
                  <line x1={x} x2={x + barW} y1={y(0) + 3} y2={y(0) + 3} stroke="var(--jb-white)" strokeWidth={2} strokeLinecap="round" />
                )}
                {showLabel && (
                  <text x={x + barW / 2} y={H - 5} textAnchor="middle" fontSize={11} fill="var(--text-muted)" fontFamily="var(--font-ui)">
                    {i === weeks.length - 1 ? 'esta' : DM.format(w.start)}
                  </text>
                )}
                <title>{`Semana de ${DM.format(w.start)}: ${w.minutes} min`}</title>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
