import { useId } from 'react';
import { useLongPress } from '../lib/useLongPress';

export function Stepper({ value, onChange, step = 1, min = 0, max = 9999, label, unit = '' }: {
  value: number; onChange: (value: number) => void; step?: number; min?: number; max?: number; label: string; unit?: string;
}) {
  const inputId = useId();
  const change = (delta: number) => onChange(Math.min(max, Math.max(min, Math.round((value + delta) * 1000) / 1000)));
  const decrease = useLongPress(() => change(-step), value <= min);
  const increase = useLongPress(() => change(step), value >= max);
  return <div><label htmlFor={inputId} className="field-label">{label}{unit && `（${unit}）`}</label>
    <div className="flex items-center gap-2"><button type="button" className="icon-btn border border-line" aria-label={`减少${label}`} disabled={value <= min} {...decrease}>−</button>
      <input id={inputId} className="field min-w-0 text-center" type="number" inputMode="decimal" step={step} min={min} max={max} value={value}
        onChange={(event) => { const next = event.currentTarget.valueAsNumber; if (Number.isFinite(next)) onChange(Math.min(max, Math.max(min, next))); }} />
      <button type="button" className="icon-btn border border-line" aria-label={`增加${label}`} disabled={value >= max} {...increase}>＋</button></div>
  </div>;
}
