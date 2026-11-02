import { describe, expect, it } from 'vitest';
import { fixture, FIXED_NOW } from '../../test/fixtures';
import { PREFIX } from '../../lib/storage';
import { createPlanStore } from './store';

function setup() { const result = fixture(); return { ...result, store: createPlanStore(result.storage.forOwner('plan'), () => FIXED_NOW) }; }
describe('计划 store 持久化和模块边界', () => {
  it('新建、编辑、勾选、删除日程并能重载', () => {
    const { store, storage } = setup(); const state = store.getState();
    state.saveSchedule({ date: '2026-10-30', title: '新增训练', start: '18:00', category: 'fitness', done: false });
    const item = store.getState().schedule.at(-1)!;
    expect(item.id).toMatch(/^[0-9a-f-]{36}$/); expect(item.demo).toBe(false);
    state.saveSchedule({ ...item, title: '修改训练' }); state.toggle('schedule', item.id);
    expect(createPlanStore(storage.forOwner('plan')).getState().schedule.at(-1)).toMatchObject({ title: '修改训练', done: true });
    state.remove('schedule', item.id); expect(store.getState().schedule.some((row) => row.id === item.id)).toBe(false);
  });
  it('待办顺延保存后再次重载不产生重复记录', () => {
    const { store, storage } = setup();
    store.getState().saveTodo({ date: '2026-10-29', title: '待办', priority: 'high', done: false, carryCount: 0 });
    const identity = store.getState().todos[0]!.id;
    expect(store.getState().carry('2026-10-30')).toBe(1); expect(store.getState().carry('2026-10-30')).toBe(0);
    expect(createPlanStore(storage.forOwner('plan')).getState().todos).toMatchObject([{ id: identity, date: '2026-10-30', carriedFrom: '2026-10-29', carryCount: 1 }]);
  });
  it('习惯同一天反复改数值只更新一条日志，并保存目标快照', () => {
    const { store } = setup(); store.getState().setHabitValue('habit-water', '2026-10-30', 1, 8); store.getState().setHabitValue('habit-water', '2026-10-30', 8, 8);
    expect(store.getState().habitLogs).toHaveLength(1); expect(store.getState().habitLogs[0]).toMatchObject({ value: 8, target: 8 });
  });
  it('编辑待办时跨过日切，旧草稿不会覆盖最新顺延归属', () => {
    const { store } = setup();
    store.getState().saveTodo({ date: '2026-10-30', title: '准备服装', priority: 'medium', done: false, carryCount: 0 });
    const draft = { ...store.getState().todos[0]! };
    store.getState().carry('2026-10-31');
    store.getState().saveTodo({ ...draft, title: '准备明天服装' });
    expect(store.getState().todos[0]).toMatchObject({ id: draft.id, date: '2026-10-31', title: '准备明天服装', carriedFrom: '2026-10-30', carryCount: 1 });
  });
  it('删除习惯保留已有打卡，删除后不能继续记', () => {
    const { store } = setup(); store.getState().setHabitValue('habit-water', '2026-10-30', 8, 8); store.getState().remove('habits', 'habit-water');
    expect(store.getState().habitLogs).toHaveLength(1); expect(() => store.getState().setHabitValue('habit-water', '2026-10-30', 9, 8)).toThrow('删除');
  });
  it('重要事项完成状态和时间窗能持久化', () => {
    const { store, storage } = setup(); store.getState().saveImportant({ date: '2026-10-30', title: '开会', done: false, priority: 'high', window: { start: '08:00', end: '09:00' } });
    store.getState().toggle('importantItems', store.getState().importantItems[0]!.id);
    expect(storage.readDatabase().importantItems[0]).toMatchObject({ done: true, window: { start: '08:00', end: '09:00' } });
  });
  it('配额失败时，store 内存和磁盘都不声称已保存', () => {
    const { store, port } = setup(); const before = store.getState().schedule;
    port.failKey = `${PREFIX}meta`;
    expect(() => store.getState().toggle('schedule', before[0]!.id)).toThrow(); expect(store.getState().schedule).toBe(before);
    expect(JSON.parse(port.getItem(`${PREFIX}schedule`)!)).toEqual(before);
  });
  it('计划操作完全不修改设置或报账分区', () => {
    const { store, port } = setup(); const settings = port.getItem(`${PREFIX}settings`); const expenses = port.getItem(`${PREFIX}expenses`);
    store.getState().toggle('schedule', store.getState().schedule[0]!.id);
    expect(port.getItem(`${PREFIX}settings`)).toBe(settings); expect(port.getItem(`${PREFIX}expenses`)).toBe(expenses);
  });
  it('非法记录和负数习惯进度被拒绝', () => {
    const { store } = setup(); expect(() => store.getState().setHabitValue('habit-water', '2026-10-30', -1, 8)).toThrow();
    expect(() => store.getState().saveTodo({ date: '2026-02-30', title: '无效', priority: 'low', done: false, carryCount: 0 })).toThrow();
    expect(store.getState().todos).toHaveLength(0);
  });
  it('旧备份重载后替换内存，而不是继续展示旧列表', () => {
    const { store, storage, data } = setup(); store.getState().saveTodo({ date: '2026-10-30', title: '新增', priority: 'low', done: false, carryCount: 0 });
    storage.replace(data, storage.meta()!); store.getState().reload();
    expect(store.getState().todos).toHaveLength(0); expect(store.getState().dataRevision).toBe(1);
  });
});
