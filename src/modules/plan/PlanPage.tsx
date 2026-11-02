import { useState } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DateNavigator } from '../../components/DateNavigator';
import { useToast } from '../../components/Toast';
import { addDays } from '../../domain/plan';
import { fmtDate, workDate } from '../../lib/date';
import { useNow } from '../../lib/useWorkDate';
import { useSettingsStore } from '../settings/store';
import { HabitCard } from './HabitCard';
import { ImportantCard } from './ImportantCard';
import { PlanEditor, type EditorRequest } from './PlanEditor';
import { ScheduleCard } from './ScheduleCard';
import { TodoCard } from './TodoCard';
import { usePlanStore } from './store';

export function PlanPage() {
  const now = useNow();
  const dayStartHour = useSettingsStore((state) => state.settings.dayStartHour);
  const sleepTargetTime = useSettingsStore((state) => state.settings.sleepTargetTime);
  const today = workDate(now, dayStartHour);
  const [selection, setSelection] = useState<string | null>(null);
  const date = selection ?? today;
  const plan = usePlanStore((state) => state);
  const toast = useToast();
  const [editor, setEditor] = useState<EditorRequest | null>(null);
  const [deleting, setDeleting] = useState<{ kind: 'schedule' | 'todos' | 'importantItems'; id: string; title: string } | null>(null);
  const perform = (action: () => void) => { try { action(); } catch (error) { toast(error instanceof Error ? error.message : '保存失败', true); } };
  return <><div className="page-heading"><p className="eyebrow">一天一点，安排妥当</p><h1>每日计划</h1><p>记下要做的事，也给自己留出休息的时间。</p></div>
    <DateNavigator value={date} today={today} onChange={(next) => setSelection(next === today ? null : next)} />
    <div className="dashboard-grid">
      <ScheduleCard items={plan.schedule} date={date} dayStartHour={dayStartHour} now={now} onAdd={() => setEditor({ kind: 'schedule', date })} onEdit={(item) => setEditor({ kind: 'schedule', date, item })} onToggle={(item) => perform(() => plan.toggle('schedule', item.id))} onDelete={(item) => setDeleting({ kind: 'schedule', id: item.id, title: item.title })} onCopy={() => perform(() => { const count = plan.copyPrevious(date); toast(count ? `已复制 ${count} 条日程` : '昨天没有新日程可复制，已有内容不会重复添加'); })} />
      <TodoCard key={date} items={plan.todos} date={date} today={today} onAdd={() => setEditor({ kind: 'todos', date })} onEdit={(item) => setEditor({ kind: 'todos', date, item })} onToggle={(item) => perform(() => plan.toggle('todos', item.id))} onDelete={(item) => setDeleting({ kind: 'todos', id: item.id, title: item.title })} onCarry={(ids) => perform(() => { const target = addDays(date, 1); const count = plan.carry(target, ids, date); toast(`已将 ${count} 条待办顺延到 ${fmtDate(target)}`); })} />
      <ImportantCard items={plan.importantItems} date={date} onAdd={() => setEditor({ kind: 'importantItems', date })} onEdit={(item) => setEditor({ kind: 'importantItems', date, item })} onToggle={(item) => perform(() => plan.toggle('importantItems', item.id))} onDelete={(item) => setDeleting({ kind: 'importantItems', id: item.id, title: item.title })} />
      <HabitCard habits={plan.habits} logs={plan.habitLogs} date={date} today={today} sleepTargetTime={sleepTargetTime} onValue={plan.setHabitValue} />
    </div>
    {editor && <PlanEditor request={editor} onClose={() => setEditor(null)} />}
    <ConfirmDialog open={deleting !== null} title="删除这条事项？" confirmLabel="确认删除" destructive onClose={() => setDeleting(null)} onConfirm={() => { if (deleting) { plan.remove(deleting.kind, deleting.id); toast('事项已删除'); } }}><p className="break-words text-muted">{deleting?.title}。删除后不会保留在这一天，请确认。</p></ConfirmDialog>
  </>;
}
