/** Typeset wordmark: brand name in white display caps, then lowercase "app" in magenta. */
export default function Wordmark({ size = 20 }: { size?: number }) {
  return (
    <span className="inline-flex items-baseline gap-1" style={{ lineHeight: 1 }}>
      <span className="jb-display" style={{ fontSize: size, fontStretch: '100%' }}>HIITCoach</span>
      <span className="font-ui font-bold text-accent" style={{ fontSize: size * 0.8 }}>app</span>
    </span>
  );
}
