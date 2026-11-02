import { describe, expect, it } from 'vitest';
import { calendarDate, fmtDate, fmtWeekday, scheduleInstant, timelineMinutes, workDate } from './date';

describe('工作日与自然日期', () => {
  it.each([
    [new Date(2026, 9, 31, 0, 0), '2026-10-30'],
    [new Date(2026, 9, 31, 3, 59, 59), '2026-10-30'],
    [new Date(2026, 9, 31, 4, 0, 0), '2026-10-31'],
    [new Date(2026, 10, 1, 2), '2026-10-31'],
    [new Date(2027, 0, 1, 2), '2026-12-31'],
    [new Date(2028, 2, 1, 2), '2028-02-29'],
  ])('%s 正确归属 %s', (now, expected) => expect(workDate(now, 4)).toBe(expected));
  it('日切为 0 时午夜立即进入新一天', () => expect(workDate(new Date(2026, 9, 31, 0), 0)).toBe('2026-10-31'));
  it('允许设置为 6 点', () => expect(workDate(new Date(2026, 9, 31, 5, 59), 6)).toBe('2026-10-30'));
  it('报账日期不经过工作日日切', () => {
    const now = new Date(2026, 9, 31, 2);
    expect(calendarDate(now)).toBe('2026-10-31'); expect(workDate(now)).toBe('2026-10-30');
  });
  it('凌晨排序保留分钟且在晚间之后', () => {
    expect(timelineMinutes('02:30', 4)).toBe(26 * 60 + 30);
    expect(timelineMinutes('23:59', 4)).toBeLessThan(timelineMinutes('00:01', 4));
    expect(timelineMinutes('04:00', 4)).toBeLessThan(timelineMinutes('23:59', 4));
  });
  it('工作日的凌晨日程对应自然日的第二天', () => {
    const instant = scheduleInstant('2026-10-30', '02:30', 4);
    expect(instant.getDate()).toBe(31); expect(instant.getHours()).toBe(2); expect(instant.getMinutes()).toBe(30);
  });
  it('中文日期和星期', () => { expect(fmtDate('2026-10-31')).toBe('10月31日'); expect(fmtWeekday('2026-10-31')).toBe('周六'); });
  it('拒绝非法日切与时间', () => {
    expect(() => workDate(new Date(), 7)).toThrow(); expect(() => workDate(new Date(), 2.5)).toThrow();
    expect(() => timelineMinutes('24:00')).toThrow(); expect(() => timelineMinutes('12:80')).toThrow();
  });
});
