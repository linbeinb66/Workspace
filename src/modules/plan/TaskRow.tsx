import type { ReactNode } from 'react';
import { Icon } from '../../components/Icon';
import { SwipeAction } from '../../components/SwipeAction';

export function TaskRow({ title, done, onToggle, onEdit, onDelete, children, selected, onSelect, overdue = false, priority, timeline = false }: {
  title: string; done: boolean; onToggle: () => void; onEdit: () => void; onDelete: () => void;
  children?: ReactNode; selected?: boolean; onSelect?: () => void; overdue?: boolean; priority?: 'high' | 'medium' | 'low'; timeline?: boolean;
}) {
  return <SwipeAction label={title} onDelete={onDelete}><div className={`relative flex items-start gap-1 border-b border-line/70 py-3 ${timeline ? 'timeline-row' : ''} ${overdue ? 'border-l-2 border-l-amber pl-1' : priority ? `task-priority-${priority}` : ''}`}>
    {onSelect && <button className="icon-btn" role="checkbox" aria-checked={selected} aria-label={`选择${title}`} onClick={onSelect}><span className={`flex h-5 w-5 items-center justify-center rounded border ${selected ? 'border-brand bg-brand text-on-brand' : 'border-muted/40'}`}>{selected && <Icon name="check" width="14" height="14" />}</span></button>}
    <button className="icon-btn relative z-10 bg-surface" role="checkbox" aria-checked={done} aria-label={`完成${title}`} onClick={onToggle}><span className={`flex h-6 w-6 items-center justify-center rounded-full border ${done ? 'border-brand bg-brand text-on-brand' : 'border-muted/40'}`}>{done && <Icon name="check" width="16" height="16" />}</span></button>
    <div className="min-w-0 flex-1"><button className={`block min-h-11 min-w-11 max-w-full break-words text-left font-medium ${done ? 'text-muted line-through' : ''}`} onClick={onEdit}>{title}</button>{children}</div>
    <button className="icon-btn" aria-label={`编辑${title}`} onClick={onEdit}><Icon name="report" width="17" height="17" /></button>
    <button className="icon-btn" aria-label={`删除${title}`} onClick={onDelete}><Icon name="trash" width="17" height="17" /></button>
  </div></SwipeAction>;
}
