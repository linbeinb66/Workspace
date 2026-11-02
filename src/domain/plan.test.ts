import { describe, expect, it } from 'vitest';
import type { ScheduleItem, Todo } from '../types';
import { addDays, canAutoCarry, carryTodos, copyYesterday, sortedSchedule } from './plan';

const stamp = '2026-10-31T04:00:00+08:00';
const todo = (changes: Partial<Todo> = {}): Todo => ({ id: 'todo-1', title: '准备服装', date: '2026-10-30', priority: 'medium', done: false, carryCount: 0, updatedAt: stamp, ...changes });
const schedule = (changes: Partial<ScheduleItem> = {}): ScheduleItem => ({ id: 'schedule-1', date: '2026-10-30', title: '直播', start: '23:00', category: 'work', done: true, updatedAt: stamp, ...changes });
describe('待办顺延的身份与幂等性', () => {
  it('移动原记录并记录来源，不复制新 ID', () => {
    const original = todo(); const result = carryTodos([original], '2026-10-31', stamp);
    expect(result).toHaveLength(1); expect(result[0]).toMatchObject({ id: original.id, date: '2026-10-31', carriedFrom: '2026-10-30', carryCount: 1 });
    expect(original.date).toBe('2026-10-30');
  });
  it('同一天重复执行不写入也不重复累计', () => {
    const once = carryTodos([todo()], '2026-10-31', stamp);
    expect(carryTodos(once, '2026-10-31', stamp)).toBe(once); expect(once[0]?.carryCount).toBe(1);
  });
  it('只处理过去未完成项，跳过今天、未来和已完成项', () => {
    const rows = [todo(), todo({ id: 'done', done: true }), todo({ id: 'today', date: '2026-10-31' }), todo({ id: 'future', date: '2026-11-01' })];
    const result = carryTodos(rows, '2026-10-31', stamp);
    expect(result[0]).not.toBe(rows[0]); expect(result.slice(1)).toEqual(rows.slice(1));
  });
  it('继续顺延保留最初来源，次数逐次增加', () => {
    const twice = carryTodos(carryTodos([todo()], '2026-10-31', stamp), '2026-11-01', stamp);
    expect(twice[0]).toMatchObject({ id: 'todo-1', carriedFrom: '2026-10-30', carryCount: 2 });
  });
  it('批量选择只移动来源日期的选中项', () => {
    const rows = [todo(), todo({ id: 'two' }), todo({ id: 'old', date: '2026-10-29' })];
    const result = carryTodos(rows, '2026-10-31', stamp, ['todo-1', 'old'], '2026-10-30');
    expect(result.map((item) => item.date)).toEqual(['2026-10-31', '2026-10-30', '2026-10-29']);
  });
  it('空选择及倒退日期不产生移动', () => {
    const rows = [todo()]; expect(carryTodos(rows, '2026-10-31', stamp, [])).toBe(rows); expect(carryTodos(rows, '2026-10-29', stamp)).toBe(rows);
  });
  it('离开几天后直接搬到当前工作日，计为一次实际操作', () => expect(carryTodos([todo()], '2026-11-03', stamp)[0]?.carryCount).toBe(1));
  it('修改日切当天不触发批量搬移，下一工作日恢复', () => {
    const changedAt = new Date(2026, 9, 31, 2).toISOString();
    expect(canAutoCarry('2026-10-31', 0, changedAt)).toBe(false);
    expect(canAutoCarry('2026-11-01', 0, changedAt)).toBe(true);
    expect(canAutoCarry('2026-10-31', 4)).toBe(true);
  });
});
describe('凌晨日程和复制', () => {
  it('按工作日排序，凌晨 2 点在 23 点后面', () => {
    const rows = [schedule({ id: 'early', start: '02:00' }), schedule({ id: 'evening', start: '23:00' }), schedule({ id: 'morning', start: '04:00' })];
    expect(sortedSchedule(rows, '2026-10-30', 4).map((item) => item.id)).toEqual(['morning', 'evening', 'early']);
    expect(rows[0]?.id).toBe('early');
  });
  it('复制昨天生成新 ID，清除完成和示例标记', () => {
    const original = schedule({ demo: true }); const result = copyYesterday([original], '2026-10-31', ['new'], stamp);
    expect(result[1]).toMatchObject({ id: 'new', date: '2026-10-31', done: false, demo: false }); expect(result[0]).toBe(original);
  });
  it('重复复制不会添加相同日程，也不重置已勾选项', () => {
    const rows = [schedule()]; const once = copyYesterday(rows, '2026-10-31', ['new'], stamp);
    once[1]!.done = true;
    expect(copyYesterday(once, '2026-10-31', ['another'], stamp)).toBe(once); expect(once[1]?.done).toBe(true);
  });
  it('没有昨天内容时保持原数组', () => { const rows = [schedule()]; expect(copyYesterday(rows, '2026-11-02', [], stamp)).toBe(rows); });
  it('复制缺 ID 时明确报错且原数据不变', () => { const rows = [schedule()]; expect(() => copyYesterday(rows, '2026-10-31', [], stamp)).toThrow('ID'); expect(rows).toHaveLength(1); });
  it('日期加减跨月和闰年', () => { expect(addDays('2026-10-31', 1)).toBe('2026-11-01'); expect(addDays('2028-03-01', -1)).toBe('2028-02-29'); });
});
