import { btnDanger, btnSecondary } from './ui';

interface Props {
  title: string;
  message?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ title, message, confirmLabel = 'Excluir', onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl bg-neutral-900 p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-2 text-2xl font-bold">{title}</h2>
        {message && <p className="mb-5 text-lg text-neutral-400">{message}</p>}
        <div className="grid grid-cols-2 gap-3">
          <button className={btnSecondary} onClick={onCancel}>Cancelar</button>
          <button className={btnDanger} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
