import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export default function BottomSheet({ title, onClose, children }: Props) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-[var(--surface-overlay)]" onClick={onClose}>
      <div
        className="jb-reveal max-h-[92vh] w-full max-w-[430px] overflow-y-auto rounded-t-[var(--radius-xl)] border-t border-line-subtle bg-card px-[var(--screen-gutter)] pt-3"
        style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))', boxShadow: 'var(--elev-dock)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-fill" />
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="jb-display jb-display--condensed m-0 text-[30px]">{title}</h2>
          <button type="button" className="jb-icon-btn jb-icon-btn-ghost" aria-label="Fechar" onClick={onClose}>
            <X size={22} strokeWidth={2} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
