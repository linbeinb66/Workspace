import { useId } from 'react';
import { addDays } from '../domain/plan';
import { fmtDate, fmtWeekday } from '../lib/date';
import { Icon } from './Icon';

export function DateNavigator({ value, today, onChange, label = '选择计划日期' }: { value: string; today: string; onChange: (date: string) => void; label?: string }) {
  const id = useId();
  return <div className="date-navigation mb-5 flex items-center gap-1 rounded-card border border-line bg-surface p-2">
    <button className="icon-btn" aria-label="前一天" onClick={() => onChange(addDays(value, -1))}><Icon name="chevron" className="rotate-180" width="18" height="18" /></button>
    <div className="relative min-w-0 flex-1 rounded-btn text-center focus-within:ring-2 focus-within:ring-brand">
      <label htmlFor={id} className="block min-h-11 py-1 font-medium">{fmtDate(value)} <span className="text-caption text-muted">{fmtWeekday(value)}</span><span className="block text-[10px] font-normal text-muted">{value === today ? '今天 · 工作日' : '点击选择日期'}</span></label>
      <input id={id} type="date" aria-label={label} className="absolute inset-0 h-full w-full min-w-0 cursor-pointer opacity-0" value={value} onChange={(event) => { if (/^\d{4}-\d{2}-\d{2}$/.test(event.target.value)) onChange(event.target.value); }} />
    </div>
    <button className="icon-btn" aria-label="后一天" onClick={() => onChange(addDays(value, 1))}><Icon name="chevron" width="18" height="18" /></button>
    <button className="btn min-w-11 bg-brand-soft px-2 text-caption text-brand-strong" onClick={() => onChange(today)}>今天</button>
  </div>;
}
