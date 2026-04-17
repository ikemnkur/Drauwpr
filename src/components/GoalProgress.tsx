interface Props {
  current: number;
  goal: number;
}

export default function GoalProgress({ current, goal }: Props) {
  const pct = Math.min((current / goal) * 100, 100);
  const met = current >= goal;

  return (
    <div className="bg-surface-2 rounded-xl px-4 py-3">
      <div className="flex justify-between text-sm mb-2">
        <span className="text-text-muted">Goal Progress</span>
        <span className={met ? 'text-success font-semibold' : 'text-brand font-semibold'}>
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="h-3 bg-surface-3 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: met
              ? 'linear-gradient(90deg, #22c55e, #16a34a)'
              : 'linear-gradient(90deg, #f97316, #ea580c)',
          }}
        />
      </div>
      <div className="flex justify-between text-xs text-text-muted mt-1.5">
        <span>{current.toLocaleString()} credits</span>
        <span>{goal.toLocaleString()} goal</span>
      </div>
    </div>
  );
}
