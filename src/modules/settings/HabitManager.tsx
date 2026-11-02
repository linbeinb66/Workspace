import { useId, useState, type FormEvent } from 'react';
import type { Habit } from '../../types';
import { Card } from '../../components/Card';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { FormField } from '../../components/FormField';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import { useToast } from '../../components/Toast';
import { usePlanStore } from '../plan/store';

function HabitEditor({ item, onClose }: { item: Habit | null; onClose: () => void }) {
  const form = useId(); const save = usePlanStore((state) => state.saveHabit); const toast = useToast();
  const [name, setName] = useState(item?.name ?? ''); const [icon, setIcon] = useState(item?.icon ?? '🌱');
  const [target, setTarget] = useState(String(item?.target ?? 1)); const [unit, setUnit] = useState(item?.unit ?? '次');
  const [error, setError] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    try {
      if (!name.trim() || !unit.trim()) throw new Error('请填写名称和单位');
      if (!Number.isFinite(Number(target)) || Number(target) <= 0) throw new Error('目标必须大于 0');
      save({ id: item?.id, name: name.trim(), icon: icon.trim() || '🌱', target: Number(target), unit: unit.trim() });
      toast('习惯已保存'); onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : '保存失败'); }
  };
  return <Sheet open title={item ? '编辑习惯' : '添加习惯'} onClose={onClose} footer={<div className="grid grid-cols-2 gap-3"><button className="btn btn-secondary" onClick={onClose}>取消</button><button type="submit" form={form} className="btn btn-primary">保存习惯</button></div>}><form id={form} className="space-y-5" onSubmit={submit}>
    <FormField label="习惯名称" htmlFor={`${form}-name`}><input className="field w-full" id={`${form}-name`} maxLength={20} required value={name} onChange={(e) => setName(e.target.value)} /></FormField>
    <FormField label="图标（emoji）" htmlFor={`${form}-icon`}><input className="field w-full" id={`${form}-icon`} maxLength={12} value={icon} onChange={(e) => setIcon(e.target.value)} /></FormField>
    <div className="grid grid-cols-2 gap-3"><FormField label="每日目标" htmlFor={`${form}-target`}><input className="field w-full" id={`${form}-target`} type="number" min="0.01" max="99999" step="any" inputMode="decimal" required value={target} onChange={(e) => setTarget(e.target.value)} /></FormField><FormField label="单位" htmlFor={`${form}-unit`}><input className="field w-full" id={`${form}-unit`} maxLength={8} required value={unit} onChange={(e) => setUnit(e.target.value)} /></FormField></div>
    {error && <p role="alert" className="rounded-btn bg-danger-soft p-3 text-danger">{error}</p>}
  </form></Sheet>;
}
export function HabitManager() {
  const habits = usePlanStore((state) => state.habits); const remove = usePlanStore((state) => state.remove); const toast = useToast();
  const [editing, setEditing] = useState<Habit | null | undefined>(undefined); const [deleting, setDeleting] = useState<Habit | null>(null);
  return <><Card title="我的习惯" subtitle="名称、图标、目标和单位，都可以按自己习惯来" action={<button className="btn px-2 text-brand-strong" onClick={() => setEditing(null)}>＋ 添加</button>} className="lg:col-span-3">
    {habits.length ? <div className="divide-y divide-line">{habits.map((habit) => <div key={habit.id} className="flex items-center gap-3 py-3"><span className="text-2xl" aria-hidden="true">{habit.icon}</span><div className="min-w-0 flex-1"><p className="break-words font-medium">{habit.name}</p><p className="text-caption text-muted">每天 {habit.target} {habit.unit}</p></div><button className="icon-btn" aria-label={`编辑习惯${habit.name}`} onClick={() => setEditing(habit)}><Icon name="report" width="18" height="18" /></button><button className="icon-btn" aria-label={`删除习惯${habit.name}`} onClick={() => setDeleting(habit)}><Icon name="trash" width="18" height="18" /></button></div>)}</div> : <p className="py-4 text-muted">还没有习惯，先添加一个容易坚持的小目标。</p>}
  </Card>
    {editing !== undefined && <HabitEditor item={editing} onClose={() => setEditing(undefined)} />}
    <ConfirmDialog open={deleting !== null} title="删除这个习惯？" confirmLabel="确认删除" destructive onClose={() => setDeleting(null)} onConfirm={() => { if (deleting) { remove('habits', deleting.id); toast('习惯已删除，历史打卡记录保留'); } }}><p className="break-words text-muted">{deleting?.name}将不再显示在打卡列表，已保存的历史打卡记录保留。</p></ConfirmDialog>
  </>;
}
