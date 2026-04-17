import { useEffect, useRef, useState } from 'react';

interface Props {
  remainingSeconds: number;
  burnRate: number;
  size?: number;
}

export default function AnalogClock({ remainingSeconds, burnRate, size: sizeProp }: Props) {
  const [remaining, setRemaining] = useState(remainingSeconds);
  const remainingRef = useRef(remainingSeconds);
  const lastFrameRef = useRef(performance.now());
  const rafRef = useRef<number>(0);

  useEffect(() => {
    remainingRef.current = remainingSeconds;
    setRemaining(remainingSeconds);
  }, [remainingSeconds]);

  useEffect(() => {
    const frameInterval = 1000 / 30; // 30 fps
    let lastRender = performance.now();

    const tick = (now: number) => {
      const elapsed = now - lastRender;
      if (elapsed >= frameInterval) {
        lastRender = now - (elapsed % frameInterval);
        const dt = (now - lastFrameRef.current) / 1000;
        lastFrameRef.current = now;
        remainingRef.current = Math.max(0, remainingRef.current - burnRate * dt);
        setRemaining(remainingRef.current);
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    lastFrameRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [burnRate]);

  const expired = remaining <= 0;

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  // Clock hand angles
  const hourAngle = (hours % 12) * 30 + minutes * 0.5;
  const minuteAngle = minutes * 6;
  const secondAngle = seconds * 6; // fractional for smooth sweep

  const size = sizeProp ?? 240;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 16;

  const hand = (angle: number, length: number, width: number, color: string) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    const x2 = cx + length * Math.cos(rad);
    const y2 = cy + length * Math.sin(rad);
    return (
      <line
        x1={cx}
        y1={cy}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
      />
    );
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Outer ring */}
        <circle cx={cx} cy={cy} r={r + 8} fill="none" stroke={expired ? '#ef4444' : '#f97316'} strokeWidth="2" opacity={expired ? 0.8 : 0.3} />
        {/* Face */}
        <circle cx={cx} cy={cy} r={r} fill={expired ? '#2d0a0a' : '#1e1e2e'} stroke={expired ? '#ef4444' : '#35354d'} strokeWidth="2" />
        {/* Hour markers */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = ((i * 30 - 90) * Math.PI) / 180;
          const x1 = cx + (r - 8) * Math.cos(angle);
          const y1 = cy + (r - 8) * Math.sin(angle);
          const x2 = cx + (r - 18) * Math.cos(angle);
          const y2 = cy + (r - 18) * Math.sin(angle);
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={expired ? '#ef444480' : '#94a3b8'} strokeWidth="2" strokeLinecap="round" />
          );
        })}
        {/* Hands */}
        {hand(hourAngle, r * 0.5, 4, expired ? '#ef4444' : '#e2e8f0')}
        {hand(minuteAngle, r * 0.7, 3, expired ? '#ef4444' : '#f97316')}
        {hand(secondAngle, r * 0.85, 1.5, '#ef4444')}
        {/* Center dot */}
        <circle cx={cx} cy={cy} r={4} fill={expired ? '#ef4444' : '#f97316'} />
      </svg>

      <div className="text-center">
        {expired ? (
          <div className="text-3xl font-mono font-bold tracking-wider text-red-500 animate-pulse">00:00:00</div>
        ) : (
          <div className="text-3xl font-mono font-bold tracking-wider text-text">
            {days > 0 && <span className="text-brand">{days}<span className="text-text-muted text-lg">d </span></span>}
            <span>{String(hours).padStart(2, '0')}</span>
            <span className="text-text-muted">:</span>
            <span>{String(minutes).padStart(2, '0')}</span>
            <span className="text-text-muted">:</span>
            <span>{String(Math.floor(seconds)).padStart(2, '0')}</span>
          </div>
        )}
        <p className={`text-xs mt-1 ${expired ? 'text-red-400' : 'text-text-muted'}`}>
          {expired ? 'Drop window closed' : 'Estimated time until drop'}
        </p>
      </div>
    </div>
  );
}
