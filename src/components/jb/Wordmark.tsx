/** Typeset wordmark: "HIIT" in white display caps, then lowercase "app" in magenta. */
export default function Wordmark({ size = 20 }: { size?: number }) {
  return (
    <span className="inline-flex items-baseline gap-0.5" style={{ lineHeight: 1 }} aria-label="HIITapp">
      <span className="jb-display" style={{ fontSize: size, fontStretch: '100%' }}>HIIT</span>
      <span className="font-ui font-bold text-accent" style={{ fontSize: size * 0.8 }}>app</span>
    </span>
  );
}
