import dayjs from 'dayjs';
import type { DateStr, ScheduleItem, Todo } from '../types';
import { timelineMinutes, workDate } from '../lib/date';

export const addDays = (date: DateStr, days: number): DateStr => dayjs(date).add(days, 'day').format('YYYY-MM-DD');
export function sortedSchedule(items: readonly ScheduleItem[], date: DateStr, dayStartHour: number): ScheduleItem[] {
  return items.filter((item) => item.date === date).sort((a, b) => timelineMinutes(a.start, dayStartHour) - timelineMinutes(b.start, dayStartHour));
}
export function carryTodos(items: Todo[], targetDate: DateStr, updatedAt: string, selected?: readonly string[], sourceDate?: DateStr): Todo[] {
  const ids = selected ? new Set(selected) : null;
  let changed = false;
  const result = items.map((item) => {
    if (item.done || item.date >= targetDate || (ids && !ids.has(item.id)) || (sourceDate && item.date !== sourceDate)) return item;
    changed = true;
    return { ...item, date: targetDate, carriedFrom: item.carriedFrom ?? item.date, carryCount: item.carryCount + 1, updatedAt };
  });
  return changed ? result : items;
}
export function canAutoCarry(today: DateStr, dayStartHour: number, changedAt?: string): boolean {
  // 改日切当天不把旧记录整体搬日；下一工作日起恢复正常顺延。
  return !changedAt || workDate(changedAt, dayStartHour) < today;
}
function fingerprint(item: ScheduleItem): string {
  return JSON.stringify([item.start, item.end ?? '', item.title, item.note ?? '', item.category]);
}
export function copyYesterday(items: ScheduleItem[], date: DateStr, newIds: readonly string[], updatedAt: string): ScheduleItem[] {
  const yesterday = addDays(date, -1);
  const existing = new Set(items.filter((item) => item.date === date).map(fingerprint));
  const added: ScheduleItem[] = [];
  for (const item of items.filter((row) => row.date === yesterday)) {
    const signature = fingerprint(item);
    if (existing.has(signature)) continue;
    const newId = newIds[added.length];
    if (!newId) throw new Error('复制日程缺少新 ID');
    existing.add(signature);
    added.push({ ...item, id: newId, date, done: false, demo: false, updatedAt });
  }
  return added.length ? [...items, ...added] : items;
}
