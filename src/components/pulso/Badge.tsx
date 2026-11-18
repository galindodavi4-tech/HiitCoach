import type { CSSProperties, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Any CSS colour; the wash behind is derived from it */
  color?: string;
  live?: boolean;
  className?: string;
}

/** Mono telemetry tag. `live` adds the heartbeat dot. */
export default function Badge({ children, color, live = false, className = '' }: Props) {
  const style: CSSProperties | undefined = color
    ? { color, background: `color-mix(in oklab, ${color} 11%, transparent)` }
    : undefined;
  return (
    <span className={`p-badge ${className}`} style={style}>
      {live && <span className="p-live-dot" />}
      {children}
    </span>
  );
}
