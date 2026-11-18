import type { ReactNode } from 'react';

/** Coach-register headline: Unbounded, sentence case, ending in a volt full stop. */
export default function Title({ children, size = 28 }: { children: ReactNode; size?: number }) {
  return (
    <h1 className="p-display m-0" style={{ fontSize: size, lineHeight: 1.05 }}>
      {children}
      <span className="text-accent">.</span>
    </h1>
  );
}
