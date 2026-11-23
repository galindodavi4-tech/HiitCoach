import { useState } from 'react';
import type { Block } from '../types';
import BottomSheet from './BottomSheet';
import ConfirmDialog from './ConfirmDialog';
import Stepper from './Stepper';
import { btnDanger, btnPrimary, btnSecondary, inputClass, labelClass } from './ui';

interface Props {
  block: Block;
  isNew: boolean;
  onSave: (block: Block) => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function BlockSheet({ block, isNew, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(block.name);
  const [repeat, setRepeat] = useState(block.repeat);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  function save() {
    if (!name.trim()) return setError('Dê um nome ao bloco.');
    onSave({ ...block, name: name.trim(), repeat: Math.max(1, repeat) });
  }

  return (
    <BottomSheet title={isNew ? 'Novo bloco' : 'Editar bloco'} onClose={onClose}>
      <div className="flex flex-col gap-5">
        <div>
          <label className={labelClass} htmlFor="block-name">Nome</label>
          <input id="block-name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div>
          <span className={labelClass}>Repetir quantas vezes</span>
          <Stepper value={repeat} unit="×" onChange={setRepeat} />
        </div>

        {error && (
          <p className="rounded-md border border-[var(--border-accent-soft)] bg-[var(--jb-crimson-wash)] px-3.5 py-3 text-[15px] font-semibold text-[var(--jb-magenta-300)]">
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button className={btnSecondary} onClick={onClose}>Cancelar</button>
          <button className={btnPrimary} onClick={save}>Salvar</button>
        </div>
        {!isNew && (
          <button className={btnDanger} onClick={() => setConfirmDelete(true)}>Excluir bloco</button>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Excluir bloco?"
          message={`"${block.name}" e tudo o que está dentro dele serão removidos.`}
          onConfirm={onDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </BottomSheet>
  );
}
