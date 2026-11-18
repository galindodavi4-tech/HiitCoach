import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Session } from '../types';
import { deleteSession, loadSessions, saveSession } from '../lib/storage';
import { CATEGORY_LABEL } from '../lib/labels';
import { blockSeconds, createSession, duplicateSession, formatClock } from '../lib/session';
import { TEMPLATES, sessionFromTemplate } from '../lib/templates';
import { exportSession, importSessionFile } from '../lib/share';
import { unlockAudio } from '../lib/cues';
import { AlertTriangle, Check, ChevronRight, Copy, Play, Plus, Share2, Trash2, Upload, X } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import Badge from '../components/pulso/Badge';
import Eyebrow from '../components/pulso/Eyebrow';
import Title from '../components/pulso/Title';
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
    <section className="flex flex-col gap-8">
      <Title>Sessões</Title>

      <div className="flex flex-col gap-3">
        <Eyebrow trailing={TEMPLATES.length}>Modelos</Eyebrow>
        <div className="-mx-[var(--gutter)] flex snap-x gap-3 overflow-x-auto px-[var(--gutter)] pb-1">
          {TEMPLATES.map((t) => (
            <article key={t.id} className="p-card flex w-60 shrink-0 snap-start flex-col gap-3 p-4">
              <Badge className="self-start">{CATEGORY_LABEL[t.category]}</Badge>
              <h3 className="text-[16px] leading-snug font-semibold">{t.name}</h3>
              <Duration seconds={blockSeconds(t.root)} />
              <button className={`${btnSecondary} p-btn-sm mt-auto`} onClick={() => copyTemplate(t)}>
                Usar modelo
              </button>
            </article>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Eyebrow tone="volt" trailing={sessions.length}>Minhas sessões</Eyebrow>

        <div className="grid grid-cols-2 gap-3">
          <button className={btnPrimary} onClick={create}>
            <Plus size={17} strokeWidth={2} /> Nova
          </button>
          <button className={btnSecondary} onClick={() => fileInput.current?.click()}>
            <Upload size={17} strokeWidth={2} /> Importar
          </button>
        </div>
        <input ref={fileInput} type="file" accept=".json,application/json" className="hidden" onChange={onImport} />

        {notice && (
          <div
            className="flex items-start gap-3 rounded-md border p-3.5"
            style={
              notice.ok
                ? { background: 'var(--wash-success)', borderColor: 'rgba(46,242,154,.4)' }
                : { background: 'var(--wash-danger)', borderColor: 'rgba(255,61,90,.4)' }
            }
          >
            {notice.ok ? (
              <Check size={18} strokeWidth={2} className="mt-0.5 shrink-0 text-success" />
            ) : (
              <AlertTriangle size={18} strokeWidth={2} className="mt-0.5 shrink-0 text-danger" />
            )}
            <p className="flex-1 text-[14px] text-secondary">{notice.text}</p>
            <button
              className="p-icon-btn p-icon-btn-ghost -my-2 -mr-2"
              aria-label="Fechar aviso"
              onClick={() => setNotice(null)}
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>
        )}

        {sessions.length === 0 && (
          <p className="rounded-md border border-dashed border-line-strong p-6 text-center text-[14px] text-muted">
            Você ainda não tem sessões. Crie uma ou comece por um modelo.
          </p>
        )}

        {featured && (
          // The most recently edited session is the featured (notch) card — one per screen
          <div className="p-notch">
            <div className="p-notch-inner flex flex-col gap-4 p-4">
              <SessionInfo session={featured} label="Última editada" />
              <SessionActions
                session={featured}
                onDuplicate={() => duplicate(featured)}
                onDelete={() => setToDelete(featured)}
              />
            </div>
          </div>
        )}

        {others.map((s) => (
          <article key={s.id} className="p-card flex flex-col gap-4 p-4">
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
    <span className="flex items-baseline gap-1.5">
      <span className="p-num text-[22px]">{formatClock(seconds)}</span>
      <span className="p-unit">total</span>
    </span>
  );
}

function SessionInfo({ session, label }: { session: Session; label?: string }) {
  return (
    <Link to={`/sessoes/${session.id}`} className="flex flex-col gap-2.5">
      <span className="flex items-center gap-2">
        <Badge>{CATEGORY_LABEL[session.category]}</Badge>
        {label && <span className="p-label ml-auto text-accent">{label}</span>}
      </span>
      <span className="flex items-center gap-2">
        <h2 className="p-display min-w-0 flex-1 truncate text-[20px] leading-[1.15] font-semibold">{session.name}</h2>
        <ChevronRight size={20} className="shrink-0 text-muted" aria-label="Abrir" />
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
      <button className="p-icon-btn" aria-label="Duplicar" title="Duplicar" onClick={onDuplicate}>
        <Copy size={18} strokeWidth={1.75} />
      </button>
      <button className="p-icon-btn" aria-label="Exportar" title="Exportar" onClick={() => exportSession(session)}>
        <Share2 size={18} strokeWidth={1.75} />
      </button>
      <button className="p-icon-btn text-danger" aria-label="Excluir" title="Excluir" onClick={onDelete}>
        <Trash2 size={18} strokeWidth={1.75} />
      </button>
    </div>
  );
}
