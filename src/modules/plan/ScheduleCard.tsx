import type { ScheduleItem } from '../../types';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { sortedSchedule } from '../../domain/plan';
import { isOverdue } from '../../domain/stats';
import { categoryLabels } from './PlanEditor';
import { TaskRow } from './TaskRow';

export function ScheduleCard({ items, date, dayStartHour, now, onAdd, onEdit, onToggle, onDelete, onCopy }: {
  items: ScheduleItem[]; date: string; dayStartHour: number; now: Date; onAdd: () => void;
  onEdit: (item: ScheduleItem) => void; onToggle: (item: ScheduleItem) => void; onDelete: (item: ScheduleItem) => void; onCopy: () => void;
}) {
  const rows = sortedSchedule(items, date, dayStartHour);
  return <Card title="时间轴日程" subtitle={`${rows.filter((item) => item.done).length}/${rows.length} 已完成`} action={<button className="btn px-2 text-brand-strong" onClick={onAdd}>＋ 添加</button>} className="lg:col-span-2">
    {rows.length ? <div className="timeline-list">{rows.map((item) => <TaskRow key={item.id} timeline title={item.title} done={item.done} onEdit={() => onEdit(item)} onToggle={() => onToggle(item)} onDelete={() => onDelete(item)} overdue={isOverdue(item, now, dayStartHour)}>
      <p className={`mt-1 flex flex-wrap items-center gap-x-2 text-caption ${isOverdue(item, now, dayStartHour) ? 'text-danger' : 'text-muted'}`}><span>{item.start}{item.end ? `～${item.end}` : ''}</span><span className={`category-dot category-${item.category}`} />{categoryLabels[item.category]}{isOverdue(item, now, dayStartHour) && <span>已过时间</span>}</p>
      {item.note && <p className="mt-1 break-words text-caption text-muted">{item.note}</p>}
    </TaskRow>)}</div> : <div className="compact-empty"><Icon name="plan" /><p>这一天还没有日程</p><button className="btn btn-secondary" onClick={onAdd}>添加第一条日程</button></div>}
    <button className="mt-3 inline-flex min-h-11 items-center gap-2 text-caption text-brand-strong" onClick={onCopy}><Icon name="copy" width="16" height="16" />复制昨天的日程</button>
  </Card>;
}
