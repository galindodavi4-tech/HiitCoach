import type { ReactNode } from 'react';

interface Props {
  eyebrow?: ReactNode;
  children: ReactNode;
  size?: number;
}

/** Eyebrow + heavy condensed display headline: the signature JogaBR pattern. */
export default function ScreenTitle({ eyebrow, children, size = 44 }: Props) {
  return (
    <div className="flex flex-col gap-1">
      {eyebrow && <span className="jb-eyebrow">{eyebrow}</span>}
      <h1 className="jb-display jb-display--condensed m-0" style={{ fontSize: size }}>
        {children}
      </h1>
    </div>
  );
}
