import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Session } from '../types';
import { deleteSession, loadSessions, saveSession } from '../lib/storage';
import { CATEGORY_LABEL, CATEGORY_RAIL } from '../lib/labels';
import { blockSeconds, createSession, duplicateSession, formatClock } from '../lib/session';
import { TEMPLATES, sessionFromTemplate } from '../lib/templates';
import { exportSession, importSessionFile } from '../lib/share';
import { unlockAudio } from '../lib/cues';
import { Copy, Play, Plus, Share2, Trash2, Upload, X } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import ScreenTitle from '../components/jb/ScreenTitle';
import SectionHeading from '../components/jb/SectionHeading';
import { btnPrimary, btnSecondary } from '../components/ui';

function loadSorted(): Session[] {
  return loadSessions().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

interface Notice {
  ok: boolean;
  text: string;
}

export default function SessionsPage() {
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const [sessions, setSessions] = useState(loadSorted);
  const [toDelete, setToDelete] = useState<Session | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  function create() {
    const session = createSession();
    saveSession(session);
    navigate(`/sessoes/${session.id}`);
  }

  function copyTemplate(template: Session) {
    const session = sessionFromTemplate(template);
    saveSession(session);
    navigate(`/sessoes/${session.id}`);
  }

  function duplicate(session: Session) {
    saveSession(duplicateSession(session));
    setSessions(loadSorted());
  }

  function confirmDelete() {
    if (!toDelete) return;
    deleteSession(toDelete.id);
    setToDelete(null);
    setSessions(loadSorted());
  }

  async function onImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // lets the same file be picked again
    if (!file) return;
    try {
      const session = await importSessionFile(file);
      saveSession(session);
      setSessions(loadSorted());
      setNotice({ ok: true, text: `"${session.name}" foi importada.` });
    } catch (err) {
      setNotice({ ok: false, text: err instanceof Error ? err.message : 'Não foi possível importar.' });
    }
  }

  const [featured, ...others] = sessions;

  return (
    <section className="flex flex-col gap-[var(--section-gap)]">
      <ScreenTitle eyebrow="Seus treinos">Sessões</ScreenTitle>

      <div className="flex flex-col gap-[var(--stack-gap)]">
        <SectionHeading trailing={`${TEMPLATES.length} modelos`}>Modelos</SectionHeading>
        <div className="-mx-[var(--screen-gutter)] flex snap-x gap-3 overflow-x-auto px-[var(--screen-gutter)] pb-1">
          {TEMPLATES.map((t) => (
            <article key={t.id} className="jb-card flex w-60 shrink-0 snap-start flex-col gap-3 py-4 pr-4 pl-[22px]">
              <span className="jb-rail" style={{ background: CATEGORY_RAIL[t.category] }} />
              <span className="jb-pill self-start">{CATEGORY_LABEL[t.category]}</span>
              <h3 className="text-[19px] leading-snug font-bold">{t.name}</h3>
              <Duration seconds={blockSeconds(t.root)} />
              <button className={`${btnSecondary} jb-btn-sm mt-auto`} onClick={() => copyTemplate(t)}>
                Usar modelo
              </button>
            </article>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-[var(--stack-gap)]">
        <SectionHeading trailing={`${sessions.length} ${sessions.length === 1 ? 'sessão' : 'sessões'}`}>
          Minhas sessões
        </SectionHeading>

        <div className="grid grid-cols-2 gap-3">
          <button className={btnPrimary} onClick={create}>
            <Plus size={18} strokeWidth={2.6} /> Nova
          </button>
          <button className={btnSecondary} onClick={() => fileInput.current?.click()}>
            <Upload size={18} strokeWidth={2.4} /> Importar
          </button>
        </div>
        <input ref={fileInput} type="file" accept=".json,application/json" className="hidden" onChange={onImport} />

        {notice && (
          <div
            className={`flex items-start gap-3 rounded-lg border p-4 ${
              notice.ok
                ? 'border-[rgba(56,222,122,.4)] bg-[var(--jb-success-wash)]'
                : 'border-[var(--border-accent-soft)] bg-[var(--jb-crimson-wash)]'
            }`}
          >
            <p className={`flex-1 text-[16px] font-semibold ${notice.ok ? 'text-success' : 'text-[var(--jb-magenta-300)]'}`}>
              {notice.ok ? '✓ ' : ''}
              {notice.text}
            </p>
            <button
              className="jb-icon-btn jb-icon-btn-ghost -my-2 -mr-2"
              aria-label="Fechar aviso"
              onClick={() => setNotice(null)}
            >
              <X size={20} strokeWidth={2} />
            </button>
          </div>
        )}

        {sessions.length === 0 && (
          <p className="rounded-lg border border-dashed border-line-strong p-6 text-center text-[16px] text-muted">
            Você ainda não tem sessões. Crie uma ou comece por um modelo.
          </p>
        )}

        {featured && (
          // The most recently edited session sits in the accent panel
          <article className="jb-card-accent flex flex-col gap-4 py-4 pr-4 pl-[22px]">
            <span className="jb-rail" style={{ background: CATEGORY_RAIL[featured.category] }} />
            <SessionInfo session={featured} status="Última editada" />
            <SessionActions
              session={featured}
              onDuplicate={() => duplicate(featured)}
              onDelete={() => setToDelete(featured)}
            />
          </article>
        )}

        {others.map((s) => (
          <article key={s.id} className="jb-card flex flex-col gap-4 py-4 pr-4 pl-[22px]">
            <span className="jb-rail" style={{ background: CATEGORY_RAIL[s.category] }} />
            <SessionInfo session={s} />
            <SessionActions session={s} onDuplicate={() => duplicate(s)} onDelete={() => setToDelete(s)} />
          </article>
        ))}
      </div>

      {toDelete && (
        <ConfirmDialog
          title="Excluir sessão?"
          message={`"${toDelete.name}" será apagada deste celular.`}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </section>
  );
}

function Duration({ seconds }: { seconds: number }) {
  return (
    <span className="flex items-baseline gap-2">
      <span className="jb-num text-[28px]">{formatClock(seconds)}</span>
      <span className="text-[14px] text-muted">total</span>
    </span>
  );
}

function SessionInfo({ session, status }: { session: Session; status?: string }) {
  return (
    <Link to={`/sessoes/${session.id}`} className="flex flex-col gap-2.5">
      <span className="flex items-center justify-between gap-2">
        <span className="jb-pill">{CATEGORY_LABEL[session.category]}</span>
        {status && <span className="text-[14px] text-secondary">✓ {status}</span>}
      </span>
      <span className="flex items-center gap-2">
        <h2 className="min-w-0 flex-1 truncate text-[21px] font-bold">{session.name}</h2>
        <span aria-label="Abrir" className="shrink-0 text-[26px] leading-none text-secondary">›</span>
      </span>
      <Duration seconds={blockSeconds(session.root)} />
    </Link>
  );
}

function SessionActions({
  session,
  onDuplicate,
  onDelete,
}: {
  session: Session;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Link to={`/rodar/${session.id}`} onClick={unlockAudio} className={`${btnPrimary} flex-1`}>
        <Play size={17} strokeWidth={2} fill="currentColor" /> Iniciar
      </Link>
      <button className="jb-icon-btn" aria-label="Duplicar" title="Duplicar" onClick={onDuplicate}>
        <Copy size={19} strokeWidth={2} />
      </button>
      <button className="jb-icon-btn" aria-label="Exportar" title="Exportar" onClick={() => exportSession(session)}>
        <Share2 size={19} strokeWidth={2} />
      </button>
      <button className="jb-icon-btn text-[var(--jb-magenta-300)]" aria-label="Excluir" title="Excluir" onClick={onDelete}>
        <Trash2 size={19} strokeWidth={2} />
      </button>
    </div>
  );
}
