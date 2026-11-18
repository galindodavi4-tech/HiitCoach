import { useState } from 'react';
import type { Category, HistoryEntry } from '../types';
import { deleteHistoryEntry, loadHistory } from '../lib/storage';
import { CATEGORIES, CATEGORY_LABEL } from '../lib/labels';
import { formatClock } from '../lib/session';
import { effortColor } from '../lib/effort';
import BottomSheet from '../components/BottomSheet';
import ConfirmDialog from '../components/ConfirmDialog';
import Badge from '../components/pulso/Badge';
import Eyebrow from '../components/pulso/Eyebrow';
import Title from '../components/pulso/Title';
import { btnDanger, btnSecondary } from '../components/ui';

// Monday 00:00 of the current week, local time
function startOfWeek(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

// "QUA · 18 NOV · 07:30"
function formatDate(iso: string): string {
  const d = new Date(iso);
  const weekday = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  const day = d.getDate();
  const month = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${weekday} · ${day} ${month} · ${time}`.toUpperCase();
}

export default function HistoryPage() {
  const [entries, setEntries] = useState(loadHistory);
  const [filter, setFilter] = useState<Category | 'all'>('all');
  const [selected, setSelected] = useState<HistoryEntry | null>(null);
  const [toDelete, setToDelete] = useState<HistoryEntry | null>(null);

  const weekStart = startOfWeek().toISOString();
  const thisWeek = entries.filter((e) => e.date >= weekStart);
  const weekMinutes = Math.round(thisWeek.reduce((sum, e) => sum + e.totalSeconds, 0) / 60);
  const shown = filter === 'all' ? entries : entries.filter((e) => e.category === filter);

  function confirmDelete() {
    if (!toDelete) return;
    deleteHistoryEntry(toDelete.id);
    setToDelete(null);
    setSelected(null);
    setEntries(loadHistory());
  }

  const chip = (active: boolean) =>
    `min-h-11 shrink-0 rounded-sm px-4 font-mono text-[11px] font-medium tracking-[0.1em] uppercase transition-colors duration-[140ms] ${
      active
        ? 'bg-surface-3 text-primary shadow-[inset_0_0_0_1px_var(--border-strong)]'
        : 'border border-line-subtle bg-sunken text-muted'
    }`;

  return (
    <section className="flex flex-col gap-8">
      <Title>Histórico</Title>

      <div className="p-dot-grid flex items-end justify-between gap-4 rounded-lg border border-line-subtle bg-sunken p-[18px]">
        <div className="flex flex-col gap-2">
          <span className="p-label">Treino nesta semana</span>
          <span className="flex items-baseline gap-1.5">
            <span className="p-num text-[48px] text-accent" style={{ textShadow: '0 0 24px rgba(204,255,0,.35)' }}>
              {weekMinutes}
            </span>
            <span className="p-unit">min</span>
          </span>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="p-label">Sessões</span>
          <span className="p-num text-[22px]">{thisWeek.length}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Eyebrow trailing={shown.length}>Registros</Eyebrow>
        <div className="-mx-[var(--gutter)] flex gap-2 overflow-x-auto px-[var(--gutter)] pb-1">
          <button className={chip(filter === 'all')} onClick={() => setFilter('all')}>Todas</button>
          {CATEGORIES.map((c) => (
            <button key={c} className={chip(filter === c)} onClick={() => setFilter(c)}>
              {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>

        {shown.length === 0 && (
          <p className="rounded-md border border-dashed border-line-strong p-6 text-center text-[14px] text-muted">
            {entries.length === 0 ? 'Os treinos que você fizer vão aparecer aqui.' : 'Nenhum treino nesta categoria.'}
          </p>
        )}

        {shown.map((e) => (
          <button
            key={e.id}
            className="p-card flex flex-col gap-2.5 p-4 text-left transition-[background,transform] duration-[140ms] hover:bg-surface-2 active:scale-[0.98]"
            onClick={() => setSelected(e)}
          >
            <span className="p-label">{formatDate(e.date)}</span>
            <h2 className="truncate text-[16px] font-semibold">{e.sessionName}</h2>
            <span className="flex items-center gap-2">
              <Badge>{CATEGORY_LABEL[e.category]}</Badge>
              {e.rpe !== undefined && <Badge color={effortColor(e.rpe)}>Esforço {e.rpe}</Badge>}
              <span className="p-num ml-auto text-[18px]">{formatClock(e.totalSeconds)}</span>
            </span>
          </button>
        ))}
      </div>

      {selected && (
        <BottomSheet title={selected.sessionName} onClose={() => setSelected(null)}>
          <span className="p-label mb-4 block">{formatDate(selected.date)}</span>
          <div className="mb-5 grid grid-cols-2 gap-3">
            <Stat label="Tempo total" value={formatClock(selected.totalSeconds)} />
            <Stat label="Passos feitos" value={`${selected.stepsCompleted}/${selected.stepsTotal}`} />
            <Stat
              label="Esforço"
              value={selected.rpe !== undefined ? String(selected.rpe) : '—'}
              unit={selected.rpe !== undefined ? 'de 10' : undefined}
              color={selected.rpe !== undefined ? effortColor(selected.rpe) : undefined}
            />
            <Stat label="Categoria" value={CATEGORY_LABEL[selected.category]} small />
          </div>
          <div className="mb-6 flex flex-col gap-2">
            <span className="p-label">Observações</span>
            <p className="text-[15px] whitespace-pre-wrap text-secondary">{selected.notes || '—'}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button className={btnSecondary} onClick={() => setSelected(null)}>Fechar</button>
            <button className={btnDanger} onClick={() => setToDelete(selected)}>Excluir</button>
          </div>
        </BottomSheet>
      )}

      {toDelete && (
        <ConfirmDialog
          title="Excluir do histórico?"
          message={`O registro de "${toDelete.sessionName}" será apagado.`}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </section>
  );
}

function Stat({ label, value, unit, color, small }: { label: string; value: string; unit?: string; color?: string; small?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-line-subtle bg-surface-1 p-3.5">
      <span className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">{label}</span>
      <span className="flex items-baseline gap-1.5">
        <span className={`p-num truncate ${small ? 'text-[15px]' : 'text-[22px]'}`} style={{ color }}>{value}</span>
        {unit && <span className="p-unit">{unit}</span>}
      </span>
    </div>
  );
}
