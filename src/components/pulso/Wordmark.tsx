/** Typeset wordmark: Unbounded 800, tight, with a volt full stop. */
export default function Wordmark({ size = 18 }: { size?: number }) {
  return (
    <span
      className="font-display"
      style={{ fontSize: size, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1 }}
    >
      HIITCoach<span className="text-accent">.</span>
    </span>
  );
}
