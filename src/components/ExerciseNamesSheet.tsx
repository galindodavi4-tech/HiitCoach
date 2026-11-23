import { useState } from 'react';
import type { Block, Step } from '../types';
import { replaceItem } from '../lib/session';
import BottomSheet from './BottomSheet';
import { btnPrimary, btnSecondary, inputClass } from './ui';

interface Entry {
  step: Step;
  section: string; // top-level block the exercise sits in, e.g. "Guerra"
  group: string;   // innermost block, e.g. "Guerra · Bi-set 1"
}

// Every exercise (work step) in tree order, with where it sits
function exercises(root: Block): Entry[] {
  const out: Entry[] = [];
  const walk = (block: Block, section: string) => {
    for (const item of block.items) {
      if (item.type === 'step') {
        if (item.kind === 'work') out.push({ step: item, section, group: block === root ? '' : block.name });
      } else {
        walk(item, block === root ? item.name : section);
      }
    }
  };
  walk(root, '');
  return out;
}

interface Props {
  root: Block;
  onSave: (root: Block) => void;
  onClose: () => void;
}

/** One screen to type all exercise names of a session, e.g. after copying a template. */
export default function ExerciseNamesSheet({ root, onSave, onClose }: Props) {
  const entries = exercises(root);
  const [names, setNames] = useState<Record<string, string>>(() =>
    Object.fromEntries(entries.map((e) => [e.step.id, e.step.name])),
  );

  function save() {
    let next = root;
    for (const { step } of entries) {
      const name = names[step.id]?.trim();
      if (name && name !== step.name) next = replaceItem(next, { ...step, name }) as Block;
    }
    onSave(next);
  }

  let lastSection: string | null = null;

  return (
    <BottomSheet title="Nomes dos exercícios" onClose={onClose}>
      <p className="mb-5 text-[15px] text-secondary">
        Troque cada nome pelo exercício do dia. Tempos, séries e descansos continuam como estão.
      </p>
      {entries.length === 0 && <p className="mb-5 text-[16px] text-muted">Esta sessão ainda não tem exercícios.</p>}
      <div className="mb-6 flex flex-col gap-4">
        {entries.map(({ step, section, group }) => {
          const header = section !== lastSection ? section : null;
          lastSection = section;
          return (
            <div key={step.id} className="flex flex-col gap-2">
              {header && <h3 className="jb-display jb-display--condensed mt-2 text-[22px]">{header}</h3>}
              <label className="flex flex-col gap-1.5">
                <span className="jb-eyebrow jb-eyebrow--muted">{group && group !== section ? group : section || 'Exercício'}</span>
                <input
                  className={inputClass}
                  value={names[step.id] ?? ''}
                  // Placeholder names are selected so typing replaces them
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setNames({ ...names, [step.id]: e.target.value })}
                />
              </label>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button className={btnSecondary} onClick={onClose}>Cancelar</button>
        <button className={btnPrimary} onClick={save}>Salvar</button>
      </div>
    </BottomSheet>
  );
}
