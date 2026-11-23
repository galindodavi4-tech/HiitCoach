import { useEffect, useRef, useState } from 'react';

// Tracks an element's width so SVG charts can draw at real pixel size
export function useWidth<T extends HTMLElement>(fallback = 340) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(Math.max(200, Math.floor(el.clientWidth)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

// Rounded-up axis maximum with three even gridlines
export function niceMax(value: number, step: number): number {
  return Math.max(step, Math.ceil(value / step) * step);
}
