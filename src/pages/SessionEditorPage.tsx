import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Block, Session, Step } from '../types';
import { getSession, saveSession } from '../lib/storage';
import { CATEGORIES, CATEGORY_LABEL } from '../lib/labels';
import {
  addToBlock,
  blockSeconds,
  createBlock,
  createStep,
  formatClock,
  removeItem,
  replaceItem,
} from '../lib/session';
import { unlockAudio } from '../lib/cues';
import { flatten } from '../lib/flatten';
import BlockSheet from '../components/BlockSheet';
import ChoiceGroup from '../components/ChoiceGroup';
import ItemList from '../components/ItemList';
import StepSheet from '../components/StepSheet';
import Stepper from '../components/Stepper';
import SectionHeading from '../components/jb/SectionHeading';
import StatPair from '../components/jb/StatPair';
import { btnPrimary, btnSecondary, inputClass, labelClass } from '../components/ui';
import { Play, Plus } from 'lucide-react';

// parentId is set only for a new item that has not been added yet
type StepEdit = { step: Step; parentId: string | null };
type BlockEdit = { block: Block; parentId: string | null };

export default function SessionEditorPage() {
  const { id } = useParams();
  const [session, setSession] = useState<Session | undefined>(() => (id ? getSession(id) : undefined));
  const [stepEdit, setStepEdit] = useState<StepEdit | null>(null);
  const [blockEdit, setBlockEdit] = useState<BlockEdit | null>(null);

  if (!session) {
    return (
      <section>
        <p className="mb-4 text-[16px] text-muted">Sessão não encontrada.</p>
        <Link to="/sessoes" className={btnSecondary}>‹ Voltar</Link>
      </section>
    );
  }

  function update(changes: Partial<Session>) {
    if (!session) return;
    const next = { ...session, ...changes, updatedAt: new Date().toISOString() };
    saveSession(next);
    setSession(next);
  }

  const root = session.root;
  const setRoot = (next: Block) => update({ root: next });

  function saveStep(step: Step) {
    if (!stepEdit) return;
    setRoot(stepEdit.parentId ? addToBlock(root, stepEdit.parentId, step) : replaceItem(root, step));
    setStepEdit(null);
  }

  function saveBlock(block: Block) {
    if (!blockEdit) return;
    setRoot(blockEdit.parentId ? addToBlock(root, blockEdit.parentId, block) : replaceItem(root, block));
    setBlockEdit(null);
  }

  function deleteItem(itemId: string) {
    setRoot(removeItem(root, itemId));
    setStepEdit(null);
    setBlockEdit(null);
  }

  const stepCount = flatten(root).length;

  return (
    <section className="flex flex-col gap-[var(--section-gap)]">
      <Link
        to="/sessoes"
        className="inline-flex min-h-10 items-center gap-1.5 self-start rounded-full bg-card-raised py-2 pr-[18px] pl-3.5 text-[16px] font-semibold transition-colors duration-[140ms] hover:bg-[var(--surface-muted-hover)]"
      >
        <span className="text-[1.1em] leading-none">‹</span> Sessões
      </Link>

      {/* Black header block with the session stats */}
      <div className="jb-card-hero flex flex-col gap-4 p-5">
        <span className="jb-eyebrow">{CATEGORY_LABEL[session.category]}</span>
        <h1 className="jb-display jb-display--condensed m-0 text-[40px] break-words">{session.name || 'Sem nome'}</h1>
        <div className="grid grid-cols-3 gap-3 border-t border-line-subtle pt-4">
          <StatPair value={formatClock(blockSeconds(root))} label="Total" size={26} accent />
          <StatPair value={stepCount} label="Passos" size={26} />
          <StatPair value={`${root.repeat}×`} label="Rodadas" size={26} />
        </div>
      </div>

      <Link to={`/rodar/${session.id}`} onClick={unlockAudio} className={`${btnPrimary} jb-btn-lg w-full`}>
        <Play size={20} strokeWidth={2} fill="currentColor" /> Iniciar treino
      </Link>

      <div className="flex flex-col gap-5">
        <SectionHeading>Configuração</SectionHeading>
        <div>
          <label className={labelClass} htmlFor="session-name">Nome da sessão</label>
          <input
            id="session-name"
            className={`${inputClass} text-[18px] font-bold`}
            value={session.name}
            onChange={(e) => update({ name: e.target.value })}
          />
        </div>

        <div>
          <span className={labelClass}>Categoria</span>
          <ChoiceGroup
            options={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))}
            value={session.category}
            onChange={(category) => update({ category })}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-[17px] font-semibold">Repetir a sessão inteira</span>
          <Stepper value={root.repeat} unit="×" onChange={(repeat) => setRoot({ ...root, repeat })} />
        </div>
      </div>

      <div className="flex flex-col gap-[var(--stack-gap)]">
        <SectionHeading trailing={`${root.items.length} itens`}>Passos</SectionHeading>
        <p className="text-[15px] text-secondary">
          Toque num cartão para editar. Segure e arraste para mudar a ordem ou para colocar dentro ou fora de um bloco.
        </p>
        {root.items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line-strong p-6 text-center text-[16px] text-muted">
            Nenhum passo ainda. Use os botões abaixo.
          </p>
        ) : (
          <ItemList
            root={root}
            onChange={setRoot}
            onEditStep={(step) => setStepEdit({ step, parentId: null })}
            onEditBlock={(block) => setBlockEdit({ block, parentId: null })}
            onAddStep={(blockId) => setStepEdit({ step: createStep(), parentId: blockId })}
            onAddBlock={(blockId) => setBlockEdit({ block: createBlock(), parentId: blockId })}
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          <button className={btnSecondary} onClick={() => setStepEdit({ step: createStep(), parentId: root.id })}>
            <Plus size={18} strokeWidth={2.6} /> Passo
          </button>
          <button className={btnSecondary} onClick={() => setBlockEdit({ block: createBlock(), parentId: root.id })}>
            <Plus size={18} strokeWidth={2.6} /> Bloco
          </button>
        </div>
      </div>

      {stepEdit && (
        <StepSheet
          step={stepEdit.step}
          isNew={stepEdit.parentId !== null}
          onSave={saveStep}
          onDelete={() => deleteItem(stepEdit.step.id)}
          onClose={() => setStepEdit(null)}
        />
      )}
      {blockEdit && (
        <BlockSheet
          block={blockEdit.block}
          isNew={blockEdit.parentId !== null}
          onSave={saveBlock}
          onDelete={() => deleteItem(blockEdit.block.id)}
          onClose={() => setBlockEdit(null)}
        />
      )}
    </section>
  );
}
