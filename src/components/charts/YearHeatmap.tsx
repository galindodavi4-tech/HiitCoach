import { useEffect, useMemo, useRef, useState } from 'react';
import type { DayTotal } from '../../lib/stats';
import { dayKey, shortDay } from '../../lib/stats';
import { formatClock } from '../../lib/session';

const CELL = 14;
const GAP = 3;
const STEP = CELL + GAP;
const LEFT = 30; // weekday labels
const TOP = 18; // month labels
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const WEEKDAY_LABELS: [number, string][] = [[0, 'seg'], [2, 'qua'], [4, 'sex']];

// Sequential scale: one hue (crimson), dark → bright, by minutes trained that day
const LEVEL_FILL = [
  'var(--jb-ink-650)',
  'color-mix(in oklab, var(--jb-crimson-500) 32%, var(--surface-card))',
  'color-mix(in oklab, var(--jb-crimson-500) 56%, var(--surface-card))',
  'color-mix(in oklab, var(--jb-crimson-500) 80%, var(--surface-card))',
  'var(--jb-crimson-500)',
];
const LEVEL_LABEL = ['Sem treino', 'Até 15 min', '15 a 30 min', '30 a 45 min', '45 min ou mais'];

function level(t: DayTotal | undefined): number {
  if (!t || t.count === 0) return 0;
  const min = t.seconds / 60;
  return min < 15 ? 1 : min < 30 ? 2 : min < 45 ? 3 : 4;
}

interface Props {
  year: number;
  days: Map<string, DayTotal>;
}

/** GitHub-style year grid: one square per day, columns are weeks (Mon → Sun). */
export default function YearHeatmap({ year, days }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const todayKey = dayKey(new Date());
  const [selected, setSelected] = useState<string | null>(null);

  const { cells, months, cols, todayCol } = useMemo(() => {
    const jan1 = new Date(year, 0, 1);
    const gridStart = new Date(jan1);
    gridStart.setDate(gridStart.getDate() - ((jan1.getDay() + 6) % 7));
    const cells: { key: string; date: Date; col: number; row: number }[] = [];
    const months: { col: number; label: string }[] = [];
    let todayCol = -1;
    const d = new Date(gridStart);
    let col = 0;
    while (d.getFullYear() <= year) {
      const row = (d.getDay() + 6) % 7;
      if (d.getFullYear() === year) {
        const key = dayKey(d);
        cells.push({ key, date: new Date(d), col, row });
        if (d.getDate() === 1) months.push({ col: row === 0 ? col : col + 1, label: MONTHS[d.getMonth()] });
        if (key === todayKey) todayCol = col;
      }
      if (row === 6) col += 1;
      d.setDate(d.getDate() + 1);
    }
    return { cells, months, cols: col + 1, todayCol };
  }, [year, todayKey]);

  // Start scrolled so the current week is in view
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const target = todayCol >= 0 ? LEFT + todayCol * STEP - el.clientWidth + 3 * STEP : el.scrollWidth;
    el.scrollLeft = Math.max(0, target);
  }, [year, todayCol]);

  const width = LEFT + cols * STEP + 16; // room for the last month label
  const height = TOP + 7 * STEP;
  const sel = selected ? cells.find((c) => c.key === selected) : undefined;
  const selTotal = selected ? days.get(selected) : undefined;

  return (
    <div className="flex flex-col gap-3">
      <p className="min-h-6 text-[15px]" aria-live="polite">
        {sel ? (
          <>
            <span className="font-bold">{shortDay(sel.date)}</span>
            <span className="text-secondary">
              {selTotal
                ? ` · ${selTotal.count} ${selTotal.count === 1 ? 'treino' : 'treinos'} · ${formatClock(selTotal.seconds)}`
                : ' · sem treino'}
            </span>
          </>
        ) : (
          <span className="text-muted">Toque num dia para ver o treino.</span>
        )}
      </p>

      <div ref={scroller} className="-mx-1 overflow-x-auto px-1 pb-1">
        <svg width={width} height={height} role="img" aria-label={`Dias treinados em ${year}`} className="block">
          {months.map((m) => (
            <text key={m.label} x={LEFT + m.col * STEP} y={11} fontSize={11} fill="var(--text-muted)" fontFamily="var(--font-ui)">
              {m.label}
            </text>
          ))}
          {WEEKDAY_LABELS.map(([row, label]) => (
            <text key={label} x={0} y={TOP + row * STEP + 11} fontSize={11} fill="var(--text-muted)" fontFamily="var(--font-ui)">
              {label}
            </text>
          ))}
          {cells.map((c) => {
            const t = days.get(c.key);
            const future = c.key > todayKey;
            const isSel = c.key === selected;
            const isToday = c.key === todayKey;
            return (
              <rect
                key={c.key}
                x={LEFT + c.col * STEP}
                y={TOP + c.row * STEP}
                width={CELL}
                height={CELL}
                rx={3}
                fill={LEVEL_FILL[level(t)]}
                opacity={future ? 0.35 : 1}
                stroke={isSel ? 'var(--jb-white)' : isToday ? 'var(--jb-magenta-500)' : 'none'}
                strokeWidth={isSel || isToday ? 2 : 0}
                className="cursor-pointer"
                onClick={() => setSelected(isSel ? null : c.key)}
              >
                <title>
                  {`${shortDay(c.date)}: ${t ? `${t.count} ${t.count === 1 ? 'treino' : 'treinos'}, ${formatClock(t.seconds)}` : 'sem treino'}`}
                </title>
              </rect>
            );
          })}
        </svg>
      </div>

      <div className="flex items-center justify-end gap-1.5 text-[12px] text-muted">
        <span className="mr-1">Menos</span>
        {LEVEL_FILL.map((fill, i) => (
          <span key={i} title={LEVEL_LABEL[i]} className="h-3 w-3 rounded-[3px]" style={{ background: fill }} />
        ))}
        <span className="ml-1">Mais</span>
      </div>
    </div>
  );
}
