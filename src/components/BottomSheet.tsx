import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export default function BottomSheet({ title, onClose, children }: Props) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-[rgba(5,6,7,.72)]" onClick={onClose}>
      <div
        className="p-sheet max-h-[92vh] w-full max-w-[430px] overflow-y-auto rounded-t-[var(--radius-xl)] border-t border-line bg-surface-2 px-[var(--gutter)] pt-3"
        style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))', boxShadow: 'var(--shadow-sheet)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-surface-4" />
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="p-display m-0 text-[22px] leading-[1.1]">
            {title}
            <span className="text-accent">.</span>
          </h2>
          <button type="button" className="p-icon-btn p-icon-btn-ghost" aria-label="Fechar" onClick={onClose}>
            <X size={20} strokeWidth={2} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
