import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import type { DateStr, TimeStr } from '../types';

export type DateInput = Date | string | number;
export function workDate(now: DateInput, dayStartHour = 4): DateStr {
  if (!Number.isInteger(dayStartHour) || dayStartHour < 0 || dayStartHour > 6) throw new Error('日切时间需在 0～6 点之间');
  const date = dayjs(now);
  if (!date.isValid()) throw new Error('日期无效');
  return (date.hour() < dayStartHour ? date.subtract(1, 'day') : date).format('YYYY-MM-DD');
}
export const calendarDate = (now: DateInput): DateStr => dayjs(now).format('YYYY-MM-DD');
export const fmtDate = (date: DateInput): string => dayjs(date).locale('zh-cn').format('M月D日');
export const fmtWeekday = (date: DateInput): string => dayjs(date).locale('zh-cn').format('ddd');
export const fmtTimestamp = (date?: string): string => date ? dayjs(date).format('YYYY年M月D日 HH:mm') : '还没有';
export function timelineMinutes(time: TimeStr, dayStartHour = 4): number {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('时间格式无效');
  const [hour = 0, minute = 0] = time.split(':').map(Number);
  return (hour < dayStartHour ? hour + 24 : hour) * 60 + minute;
}
export function scheduleInstant(date: DateStr, time: TimeStr, dayStartHour = 4): Date {
  const minutes = timelineMinutes(time, dayStartHour);
  return dayjs(date).startOf('day').add(minutes, 'minute').toDate();
}
