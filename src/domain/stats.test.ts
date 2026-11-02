import { describe, expect, it } from 'vitest';
import type { Habit, ScheduleItem } from '../types';
import { dashboardStats, destination, habitGoal, habitStreak, isOverdue, streak, upcomingSchedule, type PlanData } from './stats';

const stamp = '2026-10-30T12:00:00+08:00';
const blank = (): PlanData => ({ schedule: [], todos: [], importantItems: [], habits: [], habitLogs: [] });
const schedule = (changes: Partial<ScheduleItem> = {}): ScheduleItem => ({ id: 'task', date: '2026-10-30', title: '训练', start: '23:00', category: 'fitness', done: false, updatedAt: stamp, ...changes });
const habit: Habit = { id: 'water', name: '喝水', icon: '💧', target: 8, unit: '杯', updatedAt: stamp };
describe('首页统计与连续天数', () => {
  it('空数据无除零，进度和连续天数为 0', () => expect(dashboardStats(blank(), '2026-10-30')).toEqual({ done: 0, total: 0, progress: 0, habitDone: 0, habitTotal: 0, streak: 0 }));
  it('只把当日日程和待办算入任务，向上取整进度', () => {
    const data = blank(); data.schedule = [schedule({ done: true }), schedule({ id: 'two' }), schedule({ id: 'history', date: '2026-10-29' })];
    data.todos = [{ id: 'todo', title: '待办', date: '2026-10-30', priority: 'high', done: false, carryCount: 0, updatedAt: stamp }];
    data.importantItems = [{ id: 'important', title: '重要', date: '2026-10-30', priority: 'high', done: true, updatedAt: stamp }];
    expect(dashboardStats(data, '2026-10-30')).toMatchObject({ done: 1, total: 3, progress: 34 });
  });
  it('习惯必须达到目标才算打卡完成', () => {
    const data = blank(); data.habits = [habit]; data.habitLogs = [{ habitId: habit.id, date: '2026-10-30', value: 7, target: 8, updatedAt: stamp }];
    expect(dashboardStats(data, '2026-10-30').habitDone).toBe(0);
    data.habitLogs[0]!.value = 8; expect(dashboardStats(data, '2026-10-30').habitDone).toBe(1);
  });
  it('今天没完成时保留截至昨日的连续值', () => expect(streak(new Set(['2026-10-28', '2026-10-29']), '2026-10-30')).toBe(2));
  it('今天完成后计入当天', () => expect(streak(new Set(['2026-10-28', '2026-10-29', '2026-10-30']), '2026-10-30')).toBe(3));
  it('昨天缺一天时不继承更早的连续值', () => expect(streak(new Set(['2026-10-27', '2026-10-28']), '2026-10-30')).toBe(0));
  it('重要事项可触发连续打卡，但不增加任务分母', () => {
    const data = blank(); data.importantItems = [{ id: 'important', title: '重要', date: '2026-10-30', priority: 'high', done: true, updatedAt: stamp }];
    expect(dashboardStats(data, '2026-10-30')).toMatchObject({ total: 0, streak: 1 });
  });
  it('预填未来的完成项不增加今天的连续值', () => {
    const data = blank(); data.schedule = [schedule({ date: '2026-10-31', done: true })]; expect(dashboardStats(data, '2026-10-30').streak).toBe(0);
  });
  it('同一天多次完成只算一天，跨月正常', () => expect(streak(new Set(['2026-10-30', '2026-10-31', '2026-11-01']), '2026-11-01')).toBe(3));
  it('删除习惯后，保留的目标快照仍能证明历史达标', () => {
    const data = blank(); data.habitLogs = [{ habitId: 'removed', date: '2026-10-29', value: 8, target: 8, updatedAt: stamp }];
    expect(dashboardStats(data, '2026-10-30')).toMatchObject({ streak: 1, habitTotal: 0 });
  });
  it('修改当前目标不回改过去已达标的连续记录', () => {
    const changed = { ...habit, target: 10 }; const log = { habitId: habit.id, date: '2026-10-29', value: 8, target: 8, updatedAt: stamp };
    expect(habitGoal(changed, log, '2026-10-29', '2026-10-30')).toBe(8); expect(habitStreak(changed, [log], '2026-10-30')).toBe(1);
    expect(habitGoal(changed, log, '2026-10-30', '2026-10-30')).toBe(10);
  });
  it('旧的无目标快照日志使用对应习惯目标', () => {
    expect(habitStreak(habit, [{ habitId: habit.id, date: '2026-10-29', value: 8, updatedAt: stamp }], '2026-10-30')).toBe(1);
  });
});
describe('下一个任务与过时提醒', () => {
  it('凌晨仍属于昨日，只取实际当前时刻之后的日程', () => {
    const rows = [schedule(), schedule({ id: 'early', start: '03:00' }), schedule({ id: 'done', start: '03:30', done: true }), schedule({ id: 'tomorrow', date: '2026-10-31', start: '16:00' })];
    expect(upcomingSchedule(rows, '2026-10-30', new Date(2026, 9, 31, 2, 30), 4).map((item) => item.id)).toEqual(['early']);
  });
  it('有结束时间的正在进行事项不提前标红', () => {
    expect(isOverdue(schedule({ end: '01:00' }), new Date(2026, 9, 31, 0, 30), 4)).toBe(false);
    expect(isOverdue(schedule({ end: '01:00' }), new Date(2026, 9, 31, 1, 1), 4)).toBe(true);
  });
  it('无结束时间按开始时间判断', () => expect(isOverdue(schedule(), new Date(2026, 9, 30, 23, 1), 4)).toBe(true));
  it('已完成事项不提醒过时', () => expect(isOverdue(schedule({ done: true }), new Date(2026, 9, 31, 2), 4)).toBe(false));
  it('允许日程越过工作日边界，例如 03:00～05:00', () => {
    const item = schedule({ start: '03:00', end: '05:00' });
    expect(isOverdue(item, new Date(2026, 9, 31, 4, 30), 4)).toBe(false); expect(isOverdue(item, new Date(2026, 9, 31, 5, 1), 4)).toBe(true);
  });
  it('开始按钮按分类跳到对应模块', () => { expect(destination('fitness')).toBe('/fitness'); expect(destination('study')).toBe('/english'); expect(destination('work')).toBe('/plan'); });
});
