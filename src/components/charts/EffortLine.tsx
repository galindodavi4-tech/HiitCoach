import { useState } from 'react';
import type { HistoryEntry } from '../../types';
import { useWidth } from './useWidth';

const H = 150;
const PAD = { top: 12, right: 10, bottom: 22, left: 34 };
const DM = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });

/** Effort (1–10) of the last trainings that recorded it, oldest → newest. */
export default function EffortLine({ entries }: { entries: HistoryEntry[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [selected, setSelected] = useState<number | null>(null);

  const plotW = width - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const step = entries.length > 1 ? plotW / (entries.length - 1) : 0;
  const x = (i: number) => PAD.left + (entries.length > 1 ? i * step : plotW / 2);
  const y = (v: number) => PAD.top + plotH - (v / 10) * plotH;
  const points = entries.map((e, i) => `${x(i)},${y(e.rpe ?? 0)}`).join(' ');
  const avg = entries.reduce((s, e) => s + (e.rpe ?? 0), 0) / Math.max(1, entries.length);
  const sel = selected !== null ? entries[selected] : null;
  const hit = Math.max(24, step);

  return (
    <div className="flex flex-col gap-2">
      <p className="min-h-6 text-[15px]" aria-live="polite">
        {sel ? (
          <>
            <span className="font-bold">{DM.format(new Date(sel.date))}</span>
            <span className="text-secondary">{` · ${sel.sessionName} · esforço ${sel.rpe}`}</span>
          </>
        ) : (
          <>
            <span className="font-bold">Média {avg.toFixed(1).replace('.', ',')}</span>
            <span className="text-secondary">{` nos últimos ${entries.length} treinos`}</span>
          </>
        )}
      </p>
      <div ref={ref}>
        <svg width={width} height={H} role="img" aria-label="Esforço por treino" className="block">
          {[0, 5, 10].map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} stroke="var(--border-subtle)" strokeDasharray={v === 0 ? undefined : '3 4'} />
              <text x={PAD.left - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill="var(--text-muted)" fontFamily="var(--font-ui)">
                {v}
              </text>
            </g>
          ))}
          {selected !== null && (
            <line x1={x(selected)} x2={x(selected)} y1={PAD.top} y2={y(0)} stroke="var(--border-strong)" />
          )}
          <polyline points={points} fill="none" stroke="var(--jb-magenta-500)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {entries.map((e, i) => (
            <g key={e.id} className="cursor-pointer" onClick={() => setSelected(selected === i ? null : i)}>
              <rect x={x(i) - hit / 2} y={PAD.top} width={hit} height={plotH} fill="transparent" />
              <circle
                cx={x(i)}
                cy={y(e.rpe ?? 0)}
                r={selected === i ? 6 : 4}
                fill="var(--jb-magenta-500)"
                stroke="var(--surface-card)"
                strokeWidth={2}
              />
              <title>{`${DM.format(new Date(e.date))} · ${e.sessionName}: esforço ${e.rpe}`}</title>
            </g>
          ))}
          {entries.length > 0 && (
            <>
              <text x={x(0)} y={H - 5} textAnchor="start" fontSize={11} fill="var(--text-muted)" fontFamily="var(--font-ui)">
                {DM.format(new Date(entries[0].date))}
              </text>
              {entries.length > 1 && (
                <text x={x(entries.length - 1)} y={H - 5} textAnchor="end" fontSize={11} fill="var(--text-muted)" fontFamily="var(--font-ui)">
                  {DM.format(new Date(entries[entries.length - 1].date))}
                </text>
              )}
            </>
          )}
        </svg>
      </div>
    </div>
  );
}
