interface Props {
  title: string;
  items: { label: string; count: number }[];
}

export function StatsBreakdown({ title, items }: Props) {
  const max = items.reduce((m, item) => Math.max(m, item.count), 0) || 1;
  const total = items.reduce((s, item) => s + item.count, 0);

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{total} total</div>
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => {
          const pct = (item.count / max) * 100;
          return (
            <li key={item.label} className="flex items-center gap-2 text-xs">
              <div className="w-24 truncate capitalize">{item.label}</div>
              <div className="flex-1 h-2 rounded bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="w-6 text-right tabular-nums">{item.count}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
