import { useState } from 'react';
import type { Todo } from '../../types';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { priorityLabels } from './PlanEditor';
import { TaskRow } from './TaskRow';

export function TodoCard({ items, date, today, onAdd, onEdit, onToggle, onDelete, onCarry }: {
  items: Todo[]; date: string; today: string; onAdd: () => void; onEdit: (item: Todo) => void;
  onToggle: (item: Todo) => void; onDelete: (item: Todo) => void; onCarry: (ids: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const rows = items.filter((item) => item.date === date);
  const unfinished = rows.filter((item) => !item.done);
  const active = selected.filter((identity) => unfinished.some((item) => item.id === identity));
  return <Card title="待办清单" subtitle={`${unfinished.length} 项还没完成`} action={<button className="btn px-2 text-brand-strong" onClick={onAdd}>＋ 添加</button>}>
    {rows.length ? <>{rows.map((item) => <TaskRow key={item.id} priority={item.priority} title={item.title} done={item.done} onEdit={() => onEdit(item)} onToggle={() => onToggle(item)} onDelete={() => onDelete(item)}>
      <p className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-caption text-muted"><span className={`priority-label priority-${item.priority}`}>{priorityLabels[item.priority]}优先</span>{item.carriedFrom && <span>↺ 顺延 {item.carryCount} 次</span>}{item.dueDate && <span className={item.dueDate < today && !item.done ? 'text-danger' : ''}>截止 {item.dueDate.slice(5)}</span>}</p>
      {!item.done && <label className="mt-1 inline-flex min-h-11 items-center gap-2 text-caption text-muted"><input type="checkbox" className="h-4 w-4 accent-brand-strong" checked={active.includes(item.id)} onChange={() => setSelected(active.includes(item.id) ? active.filter((identity) => identity !== item.id) : [...active, item.id])} aria-label={`选择${item.title}`} />批量选择</label>}
    </TaskRow>)}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><button className="btn px-0 text-caption text-brand-strong" disabled={!unfinished.length} onClick={() => setSelected(active.length === unfinished.length ? [] : unfinished.map((item) => item.id))}>{active.length === unfinished.length && unfinished.length ? '取消全选' : '全选未完成'}</button><button className="btn btn-secondary px-3 text-caption" disabled={!active.length} onClick={() => { onCarry(active); setSelected([]); }}>{date === today ? '顺延到明天' : '顺延到下一天'}</button></div>
    </> : <div className="compact-empty"><Icon name="check" /><p>把要记住的小事放这里</p><button className="btn btn-secondary" onClick={onAdd}>添加第一条待办</button></div>}
  </Card>;
}
