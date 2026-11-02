import type { ImportantItem } from '../../types';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { priorityLabels } from './PlanEditor';
import { TaskRow } from './TaskRow';

export function ImportantCard({ items, date, onAdd, onEdit, onToggle, onDelete }: {
  items: ImportantItem[]; date: string; onAdd: () => void; onEdit: (item: ImportantItem) => void;
  onToggle: (item: ImportantItem) => void; onDelete: (item: ImportantItem) => void;
}) {
  const rows = items.filter((item) => item.date === date);
  return <Card title="重要事项" subtitle="留出时间，优先照顾" action={<button className="btn px-2 text-brand-strong" onClick={onAdd}>＋ 添加</button>} className="lg:col-span-3">
    {rows.length ? rows.map((item) => <TaskRow key={item.id} priority={item.priority} title={item.title} done={item.done} onEdit={() => onEdit(item)} onToggle={() => onToggle(item)} onDelete={() => onDelete(item)}><p className="mt-1 flex flex-wrap items-center gap-2 text-caption text-muted"><span className={`priority-label priority-${item.priority}`}>{priorityLabels[item.priority]}</span>{item.window ? `${item.window.start}～${item.window.end}` : '未限定时间窗'}</p></TaskRow>) : <div className="compact-empty"><Icon name="leaf" /><p>重要的事，值得留一个位置</p><button className="btn btn-secondary" onClick={onAdd}>添加重要事项</button></div>}
  </Card>;
}
