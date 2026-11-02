export function KpiGrid({ items }: { items: readonly { label: string; value: string; hint?: string }[] }) {
  return <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">{items.map((item) => <div key={item.label} className="min-w-0 rounded-btn bg-canvas p-4">
    <dt className="text-caption text-muted">{item.label}</dt><dd className="mt-1.5 break-all text-[25px] font-semibold tabular-nums tracking-tight text-brand-strong">{item.value}</dd>{item.hint && <p className="mt-1 text-[11px] text-muted">{item.hint}</p>}
  </div>)}</dl>;
}
