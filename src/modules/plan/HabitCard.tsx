import { useEffect, useRef, useState } from 'react';
import type { Habit, HabitLog } from '../../types';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import { useToast } from '../../components/Toast';
import { habitGoal, habitStreak } from '../../domain/stats';

function HabitRing({ habit, value, goal, onAdd, onEdit }: { habit: Habit; value: number; goal: number; onAdd: () => void; onEdit: () => void }) {
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const held = useRef(false);
  const stop = () => clearTimeout(timer.current);
  useEffect(() => stop, []);
  const complete = value >= goal;
  const ratio = Math.min(value / goal, 1);
  return <button className={`relative mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-full ${complete ? 'bg-brand-soft' : ''}`} aria-label={`给${habit.name}加1，当前${value}/${goal}`}
    onPointerDown={(event) => { if (event.button !== 0) return; held.current = false; timer.current = setTimeout(() => { held.current = true; onEdit(); }, 500); }}
    onPointerUp={stop} onPointerCancel={stop} onPointerLeave={stop} onContextMenu={(event) => event.preventDefault()}
    onClick={(event) => { if (held.current && event.detail !== 0) { held.current = false; return; } onAdd(); }}>
    <svg viewBox="0 0 72 72" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true"><circle cx="36" cy="36" r="32" fill="none" stroke="rgb(var(--color-line))" strokeWidth="4" /><circle cx="36" cy="36" r="32" fill="none" stroke="rgb(var(--color-brand))" strokeWidth="4" strokeDasharray={`${ratio * 201.06} 201.06`} strokeLinecap="round" /></svg>
    <span className="text-2xl">{complete ? <Icon name="check" className="text-brand-strong" width="28" height="28" /> : habit.icon}</span>
  </button>;
}
export function HabitCard({ habits, logs, date, today, sleepTargetTime, onValue }: {
  habits: Habit[]; logs: HabitLog[]; date: string; today: string; sleepTargetTime: string;
  onValue: (habitId: string, date: string, value: number, target: number) => void;
}) {
  const [editing, setEditing] = useState<{ habit: Habit; target: number; value: string } | null>(null);
  const toast = useToast();
  const completed = habits.filter((habit) => { const log = logs.find((row) => row.date === date && row.habitId === habit.id); return (log?.value ?? 0) >= habitGoal(habit, log, date, today); }).length;
  const commit = (habit: Habit, value: number, goal: number) => { try { onValue(habit.id, date, value, goal); return true; } catch (error) { toast(error instanceof Error ? error.message : '保存失败', true); return false; } };
  return <Card title="习惯打卡" subtitle={`已达标 ${completed}/${habits.length} · 横滑查看，长按进度可改数值`} action={<a className="btn px-2 text-caption text-brand-strong" href="#/more/settings">管理</a>} className="lg:col-span-3">
    {habits.length ? <div className="habit-strip">{habits.map((habit) => {
      const log = logs.find((row) => row.date === date && row.habitId === habit.id);
      const value = log?.value ?? 0; const goal = habitGoal(habit, log, date, today);
      const edit = () => setEditing({ habit, target: goal, value: String(value) });
      return <div key={habit.id} className="rounded-btn bg-canvas/60 p-3 text-center"><HabitRing habit={habit} value={value} goal={goal} onEdit={edit} onAdd={() => commit(habit, value + 1, goal)} />
        <p className="mt-3 break-words font-medium">{habit.name}</p><p className="mt-1 text-caption text-muted">{value}/{goal} {habit.unit}</p>{habit.id === 'habit-sleep' && <p className="text-[10px] text-muted">目标 {sleepTargetTime}</p>}
        <p className="mt-1 text-caption text-brand-strong">🔥 {habitStreak(habit, logs, today)} 天</p>
        <div className="mt-2 flex flex-col gap-1"><button className="btn btn-secondary px-1 text-caption" onClick={() => value >= goal ? edit() : commit(habit, goal, goal)}>{value >= goal ? '修改数值' : '直接达标'}</button><button className="btn px-1 text-caption text-muted" onClick={edit}>填写数值</button></div>
      </div>;
    })}</div> : <div className="compact-empty"><Icon name="leaf" /><p>从一个小习惯开始</p><a className="btn btn-secondary" href="#/more/settings">添加习惯</a></div>}
    <Sheet open={editing !== null} title={editing ? `调整${editing.habit.name}进度` : '调整进度'} onClose={() => setEditing(null)} footer={<button className="btn btn-primary w-full" onClick={() => {
      if (!editing) return;
      if (!editing.value.trim()) { toast('请填写数值', true); return; }
      if (commit(editing.habit, Number(editing.value), editing.target)) { toast('打卡进度已保存'); setEditing(null); }
    }}>保存进度</button>}>{editing && <div><label className="field-label" htmlFor="habit-progress">当前数值（{editing.habit.unit}）</label><input className="field w-full" id="habit-progress" type="number" min="0" max="99999" step="any" inputMode="decimal" value={editing.value} onChange={(event) => setEditing({ ...editing, value: event.target.value })} /><p className="mt-3 text-caption text-muted">目标 {editing.target} {editing.habit.unit}；填 0 可以重置当天进度。</p></div>}</Sheet>
  </Card>;
}
