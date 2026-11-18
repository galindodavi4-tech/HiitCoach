import type { ReactNode } from 'react';

const TONES = {
  muted: 'var(--text-muted)',
  volt: 'var(--text-accent)',
  plasma: 'var(--text-heat)',
  ion: 'var(--text-ion)',
};

interface Props {
  children: ReactNode;
  tone?: keyof typeof TONES;
  trailing?: ReactNode;
  className?: string;
}

/** Mono uppercase section label with a hairline running to an optional trailing slot. */
export default function Eyebrow({ children, tone = 'muted', trailing, className = '' }: Props) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <span className="p-label" style={{ color: TONES[tone] }}>{children}</span>
      <span className="h-px flex-1 bg-line-subtle" />
      {trailing != null && <span className="p-label tracking-[0.08em]">{trailing}</span>}
    </div>
  );
}
