import { useId, useState, type FormEvent } from 'react';
import type { ImportantItem, ScheduleItem, Todo } from '../../types';
import { FormField } from '../../components/FormField';
import { Sheet } from '../../components/Sheet';
import { useToast } from '../../components/Toast';
import { fmtDate } from '../../lib/date';
import { usePlanStore } from './store';

export type EditorRequest = { kind: 'schedule'; date: string; item?: ScheduleItem }
  | { kind: 'todos'; date: string; item?: Todo } | { kind: 'importantItems'; date: string; item?: ImportantItem };
export const categoryLabels = { routine: '作息', work: '工作', study: '学习', fitness: '健身', rest: '休息' } as const;
export const priorityLabels = { high: '高', medium: '中', low: '低' } as const;
export function PlanEditor({ request, onClose }: { request: EditorRequest; onClose: () => void }) {
  const formId = useId();
  const plan = usePlanStore((state) => state);
  const toast = useToast();
  const item = request.item;
  const [title, setTitle] = useState(item?.title ?? '');
  const [start, setStart] = useState(request.kind === 'schedule' ? request.item?.start ?? '18:00' : request.kind === 'importantItems' ? request.item?.window?.start ?? '' : '');
  const [end, setEnd] = useState(request.kind === 'schedule' ? request.item?.end ?? '' : request.kind === 'importantItems' ? request.item?.window?.end ?? '' : '');
  const [note, setNote] = useState(request.kind === 'schedule' ? request.item?.note ?? '' : '');
  const [category, setCategory] = useState<ScheduleItem['category']>(request.kind === 'schedule' ? request.item?.category ?? 'work' : 'work');
  const [priority, setPriority] = useState<Todo['priority']>(request.kind !== 'schedule' ? request.item?.priority ?? 'medium' : 'medium');
  const [dueDate, setDueDate] = useState(request.kind === 'todos' ? request.item?.dueDate ?? '' : '');
  const [error, setError] = useState('');
  const name = request.kind === 'schedule' ? '日程' : request.kind === 'todos' ? '待办' : '重要事项';
  const submit = (event: FormEvent) => {
    event.preventDefault();
    try {
      if (!title.trim()) throw new Error('先填写事项标题');
      if (request.kind === 'schedule' && title.trim().length > 30) throw new Error('日程标题最多 30 字');
      if (request.kind !== 'todos' && start && end && start === end) throw new Error('开始和结束时间不能相同');
      const common = { id: item?.id, date: request.date, title: title.trim(), done: item?.done ?? false };
      if (request.kind === 'schedule') {
        if (!start) throw new Error('请选择开始时间');
        plan.saveSchedule({ ...common, start, ...(end ? { end } : {}), ...(note.trim() ? { note: note.trim() } : {}), category });
      } else if (request.kind === 'todos') {
        plan.saveTodo({ ...common, priority, ...(dueDate ? { dueDate } : {}),
          carryCount: request.item?.carryCount ?? 0, ...(request.item?.carriedFrom ? { carriedFrom: request.item.carriedFrom } : {}) });
      } else {
        if (Boolean(start) !== Boolean(end)) throw new Error('请填写完整时间窗，或把两个时间都留空');
        plan.saveImportant({ ...common, priority, ...(start && end ? { window: { start, end } } : {}) });
      }
      toast(`${name}已保存`); onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : '保存失败'); }
  };
  return <Sheet open title={`${item ? '编辑' : '添加'}${name}`} onClose={onClose} footer={<div className="grid grid-cols-2 gap-3"><button className="btn btn-secondary" onClick={onClose}>取消</button><button className="btn btn-primary" type="submit" form={formId}>保存{name}</button></div>}>
    <form id={formId} onSubmit={submit} className="space-y-5"><p className="text-caption text-muted">归属 {fmtDate(request.date)}，按工作日记录。</p>
      <FormField htmlFor={`${formId}-title`} label="事项标题"><input id={`${formId}-title`} className="field w-full" required maxLength={request.kind === 'schedule' ? 30 : 120} placeholder="要做的一件事" value={title} onChange={(e) => setTitle(e.target.value)} /></FormField>
      {request.kind !== 'todos' && <div className="grid grid-cols-2 gap-3"><FormField htmlFor={`${formId}-start`} label={request.kind === 'schedule' ? '开始时间' : '时间窗开始（可选）'}><input id={`${formId}-start`} className="field w-full" type="time" required={request.kind === 'schedule'} value={start} onChange={(e) => setStart(e.target.value)} /></FormField><FormField htmlFor={`${formId}-end`} label={request.kind === 'schedule' ? '结束时间（可选）' : '时间窗结束（可选）'}><input id={`${formId}-end`} className="field w-full" type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></FormField></div>}
      {request.kind === 'schedule' ? <>
        <FormField htmlFor={`${formId}-category`} label="分类"><select id={`${formId}-category`} className="field w-full" value={category} onChange={(e) => setCategory(e.target.value as ScheduleItem['category'])}>{Object.entries(categoryLabels).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></FormField>
        <FormField htmlFor={`${formId}-note`} label="备注（可选）" hint="最多 60 字"><textarea id={`${formId}-note`} className="field min-h-20 w-full" maxLength={60} value={note} onChange={(e) => setNote(e.target.value)} /></FormField>
      </> : <FormField htmlFor={`${formId}-priority`} label="优先级"><select id={`${formId}-priority`} className="field w-full" value={priority} onChange={(e) => setPriority(e.target.value as Todo['priority'])}>{Object.entries(priorityLabels).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></FormField>}
      {request.kind === 'todos' && <FormField htmlFor={`${formId}-due`} label="截止日期（可选）"><input id={`${formId}-due`} className="field w-full" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></FormField>}
      {error && <p role="alert" className="rounded-btn bg-danger-soft p-3 text-danger">{error}</p>}
    </form>
  </Sheet>;
}
