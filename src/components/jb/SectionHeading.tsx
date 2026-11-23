import type { ReactNode } from 'react';

/** Small section header: condensed display title with an optional count on the right. */
export default function SectionHeading({ children, trailing }: { children: ReactNode; trailing?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <h2 className="jb-display jb-display--condensed m-0 text-[26px]">{children}</h2>
      {trailing != null && <span className="text-[15px] text-muted">{trailing}</span>}
    </div>
  );
}
