import { useState } from 'react';
import type { Category, HistoryEntry } from '../types';
import { deleteHistoryEntry, loadHistory } from '../lib/storage';
import { CATEGORIES, CATEGORY_LABEL, CATEGORY_RAIL } from '../lib/labels';
import { formatClock } from '../lib/session';
import BottomSheet from '../components/BottomSheet';
import ConfirmDialog from '../components/ConfirmDialog';
import ScreenTitle from '../components/jb/ScreenTitle';
import SectionHeading from '../components/jb/SectionHeading';
import StatPair from '../components/jb/StatPair';
import { btnDanger, btnSecondary } from '../components/ui';

// Monday 00:00 of the current week, local time
function startOfWeek(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

// "Qua · 18/11/2026 · 07:30"
function formatDate(iso: string): string {
  const d = new Date(iso);
  const weekday = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} · ${date} · ${time}`;
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
    `min-h-10 shrink-0 rounded-full px-4 font-display text-[13px] font-black uppercase transition-colors duration-[140ms] ${
      active ? 'bg-crimson text-white' : 'bg-fill text-secondary'
    }`;

  return (
    <section className="flex flex-col gap-[var(--section-gap)]">
      <ScreenTitle eyebrow="Sua evolução">Histórico</ScreenTitle>

      <div className="jb-card-hero flex flex-col gap-4 p-5">
        <span className="jb-eyebrow">Sua semana</span>
        <div className="flex items-end justify-between gap-4">
          <span className="flex items-baseline gap-2">
            <span className="jb-num text-[56px] text-accent">{weekMinutes}</span>
            <span className="text-[17px] font-semibold text-secondary">min</span>
          </span>
          <StatPair value={thisWeek.length} label={thisWeek.length === 1 ? 'sessão' : 'sessões'} align="right" />
        </div>
      </div>

      <div className="flex flex-col gap-[var(--stack-gap)]">
        <SectionHeading trailing={`${shown.length} ${shown.length === 1 ? 'treino' : 'treinos'}`}>Treinos feitos</SectionHeading>
        <div className="-mx-[var(--screen-gutter)] flex gap-2 overflow-x-auto px-[var(--screen-gutter)] pb-1">
          <button className={chip(filter === 'all')} onClick={() => setFilter('all')}>Todas</button>
          {CATEGORIES.map((c) => (
            <button key={c} className={chip(filter === c)} onClick={() => setFilter(c)}>
              {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>

        {shown.length === 0 && (
          <p className="rounded-lg border border-dashed border-line-strong p-6 text-center text-[16px] text-muted">
            {entries.length === 0 ? 'Os treinos que você fizer vão aparecer aqui.' : 'Nenhum treino nesta categoria.'}
          </p>
        )}

        {shown.map((e) => (
          <button
            key={e.id}
            className="jb-card flex flex-col gap-2 py-4 pr-4 pl-[22px] text-left transition-[background,transform] duration-[140ms] hover:bg-card-raised active:scale-[0.97]"
            onClick={() => setSelected(e)}
          >
            <span className="jb-rail" style={{ background: CATEGORY_RAIL[e.category] }} />
            <span className="text-[14px] text-muted">{formatDate(e.date)}</span>
            <span className="flex items-center gap-2">
              <h2 className="min-w-0 flex-1 truncate text-[20px] font-bold">{e.sessionName}</h2>
              <span className="jb-num text-[24px]">{formatClock(e.totalSeconds)}</span>
            </span>
            <span className="flex flex-wrap items-center gap-2">
              <span className="jb-pill">{CATEGORY_LABEL[e.category]}</span>
              {e.rpe !== undefined && <span className="jb-pill jb-pill-neutral">Esforço {e.rpe}</span>}
              {e.stepsCompleted >= e.stepsTotal && <span className="text-[14px] text-secondary">✓ Completo</span>}
            </span>
          </button>
        ))}
      </div>

      {selected && (
        <BottomSheet title={selected.sessionName} onClose={() => setSelected(null)}>
          <span className="mb-4 block text-[15px] text-muted">{formatDate(selected.date)}</span>
          <div className="jb-card-hero mb-5 grid grid-cols-2 gap-x-3 gap-y-5 p-5">
            <StatPair value={formatClock(selected.totalSeconds)} label="Tempo total" accent />
            <StatPair value={`${selected.stepsCompleted}/${selected.stepsTotal}`} label="Passos feitos" />
            <StatPair value={selected.rpe !== undefined ? selected.rpe : '—'} label="Esforço (de 10)" />
            <div className="flex flex-col items-start gap-2">
              <span className="jb-pill mt-2">{CATEGORY_LABEL[selected.category]}</span>
              <span className="text-[13px] text-muted">Categoria</span>
            </div>
          </div>
          <div className="mb-6 flex flex-col gap-2">
            <span className="jb-eyebrow jb-eyebrow--muted">Observações</span>
            <p className="text-[16px] whitespace-pre-wrap text-secondary">{selected.notes || '—'}</p>
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
