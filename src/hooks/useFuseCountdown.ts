import { useEffect, useRef, useState } from 'react';

export function useFuseCountdown(initialFuseMs: number, burnRate: number, enabled = true): number {
  const safeInitialFuseMs = Math.max(0, initialFuseMs);
  const [remainingMs, setRemainingMs] = useState(safeInitialFuseMs);
  const remainingRef = useRef(safeInitialFuseMs);
  const lastFrameRef = useRef(performance.now());

  useEffect(() => {
    const nextFuseMs = Math.max(0, initialFuseMs);
    remainingRef.current = nextFuseMs;
    setRemainingMs(nextFuseMs);
    lastFrameRef.current = performance.now();
  }, [initialFuseMs]);

  useEffect(() => {
    if (!enabled || remainingRef.current <= 0) return;

    let rafId = 0;

    const tick = (now: number) => {
      const dt = Math.max(0, (now - lastFrameRef.current) / 1000);
      lastFrameRef.current = now;

      const rate = Math.max(1, burnRate || 1);
      remainingRef.current = Math.max(0, remainingRef.current - rate * dt * 1000);
      setRemainingMs(remainingRef.current);

      if (remainingRef.current > 0 && enabled) {
        rafId = requestAnimationFrame(tick);
      }
    };

    lastFrameRef.current = performance.now();
    rafId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafId);
  }, [burnRate, enabled, initialFuseMs]);

  return remainingMs;
}