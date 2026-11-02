import dayjs from 'dayjs';
import type { Report, ScheduleItem, Todo } from '../types';
import { addDays } from './plan';

export type ReportContent = Pick<Report, 'done' | 'undone' | 'metrics' | 'problems' | 'tomorrow' | 'support'>;
export const uniqueLines = (lines: string[]) => [...new Set(lines.map((line) => line.trim()).filter(Boolean))];
export function weekRange(date: string, weekStart: 0 | 1 = 1) {
  const start = addDays(date, -((dayjs(date).day() - weekStart + 7) % 7));
  return { start, end: addDays(start, 6) };
}
export function emptyContent(): ReportContent {
  return { done: [], undone: [], metrics: [{ label: '场次', value: '', agg: 'sum' }, { label: '时长', value: '', agg: 'sum' }], problems: '', tomorrow: [], support: '' };
}
// 来源身份与文本分开保存：删除或改写带入项后，下一次补入不会把它复原。
export function supplementPlan(report: Report, schedule: ScheduleItem[], todos: Todo[]): Report {
  const seen = new Set(report.sourceItemIds ?? []);
  const done = [...report.done]; const tomorrow = [...report.tomorrow];
  for (const [kind, items] of [['schedule', schedule], ['todo', todos]] as const) {
    for (const item of items) {
      const destination = item.date === report.date && item.done ? 'done'
        : item.date === addDays(report.date, 1) && !item.done ? 'tomorrow' : null;
      if (!destination) continue;
      const key = `${destination}:${kind}:${item.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const list = destination === 'done' ? done : tomorrow;
      if (!list.some((text) => text.trim() === item.title.trim())) list.push(item.title);
    }
  }
  return { ...report, done, tomorrow, sourceItemIds: [...seen] };
}
export const missingReasons = (report: Report) => report.undone.filter((row) => row.text.trim() && !row.reason.trim()).length;

function numeric(value: string): number | null {
  const normalized = value.trim().replace(/,/g, '');
  return /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized) && Number.isFinite(Number(normalized)) ? Number(normalized) : null;
}
export function parseMinutes(value: string): number | null {
  const text = value.trim().toLowerCase();
  const clock = /^(\d+):([0-5]\d)$/.exec(text);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  const units = /^(?:(\d+(?:\.\d+)?)\s*(?:小时|h)\s*)?(?:(\d+(?:\.\d+)?)\s*(?:分钟|分|min|m))?$/.exec(text);
  if (units && (units[1] || units[2])) return Number(units[1] ?? 0) * 60 + Number(units[2] ?? 0);
  return numeric(text); // 时长字段的无单位数值约定为分钟。
}
const formatNumber = (n: number) => String(Math.round(n * 1e6) / 1e6);
function formatMinutes(n: number): string {
  const hours = Math.floor(n / 60); const minutes = Math.round((n - hours * 60) * 1e6) / 1e6;
  return hours ? `${hours}小时${minutes ? `${minutes}分钟` : ''}` : `${formatNumber(minutes)}分钟`;
}
export function aggregateWeek(reports: Report[], start: string, end = addDays(start, 6)): ReportContent {
  const days = reports.filter((r) => r.type === 'daily' && r.date >= start && r.date <= end).sort((a, b) => a.date.localeCompare(b.date));
  const groups = new Map<string, { label: string; agg: NonNullable<Report['metrics'][number]['agg']>; rows: { date: string; value: string }[] }>();
  for (const report of days) for (const metric of report.metrics) {
    const label = metric.label.trim(); const value = metric.value.trim();
    if (!label || !value) continue;
    const agg = metric.agg ?? 'sum';
    const key = JSON.stringify([label, agg]); // 同名不同规则分开，避免悄悄采用其中一天的规则。
    const group = groups.get(key) ?? { label, agg, rows: [] };
    group.rows.push({ date: report.date, value }); groups.set(key, group);
  }
  const metrics = [...groups.values()].map(({ label, agg, rows }) => {
    const duration = /时长|用时|耗时|分钟/.test(label);
    const numbers = rows.map(({ value }) => duration ? parseMinutes(value) : numeric(value));
    let value: string;
    if (agg === 'last') value = rows.at(-1)?.value ?? '';
    else if (agg === 'list' || numbers.some((n) => n === null)) value = rows.map((row) => `${row.date}：${row.value}`).join('；');
    else {
      const valid = numbers as number[];
      const total = agg === 'max' ? Math.max(...valid) : valid.reduce((sum, n) => sum + n, 0);
      value = duration ? formatMinutes(total) : formatNumber(total);
    }
    const conflict = [...groups.values()].filter((group) => group.label === label).length > 1;
    return { label: conflict ? `${label}（${{ sum: '求和', max: '最大', last: '末次', list: '明细' }[agg]}）` : label, value, agg };
  });
  const undone = days.flatMap((r) => r.undone).filter((row) => row.text.trim());
  const seenUndone = new Set<string>();
  return { done: uniqueLines(days.flatMap((r) => r.done)), undone: undone.filter((row) => {
    const key = JSON.stringify([row.text.trim(), row.reason.trim()]);
    if (seenUndone.has(key)) return false;
    seenUndone.add(key); return true;
  }), metrics, problems: uniqueLines(days.map((r) => r.problems)).join('\n'), support: uniqueLines(days.map((r) => r.support)).join('\n'),
  tomorrow: uniqueLines(days.at(-1)?.tomorrow ?? []) };
}
