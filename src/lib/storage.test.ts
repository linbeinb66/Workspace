import { describe, expect, it } from 'vitest';
import { initialDatabase } from '../data/demo';
import { fixture, FIXED_NOW, MemoryStorage } from '../test/fixtures';
import { migrate } from './migrations';
import { createAppStorage, PREFIX, SNAPSHOT_KEY } from './storage';

describe('初始化和有归属的存储', () => {
  it('第一次写入一天日程、三动作、五单词和两条整数分报账', () => {
    const { data, storage } = fixture();
    expect(new Set(data.schedule.map((item) => item.date)).size).toBe(1);
    expect(data.exercises).toHaveLength(3); expect(data.words).toHaveLength(5); expect(data.expenses).toHaveLength(2);
    expect(data.expenses.every((item) => Number.isInteger(item.amountCents))).toBe(true);
    expect(data.settings.sleepTargetTime).toBe('01:00'); expect(storage.meta()?.schemaVersion).toBe(1);
  });
  it('初始化只执行一次，刷新不补回删除的示例', () => {
    const { storage } = fixture();
    storage.forOwner('plan').set('schedule', []);
    migrate(storage, () => { throw new Error('不应该再次生成示例'); }, FIXED_NOW);
    expect(storage.readDatabase().schedule).toEqual([]);
  });
  it('设置只写自己分区及公共元数据', () => {
    const { port, storage, data } = fixture();
    const untouched = port.getItem(`${PREFIX}expenses`);
    storage.forOwner('settings').set('settings', { ...data.settings, unit: 'lb' });
    expect(storage.readDatabase().settings.unit).toBe('lb');
    expect(port.getItem(`${PREFIX}expenses`)).toBe(untouched);
    const attack = storage.forOwner('settings') as unknown as { set(key: string, value: unknown): void };
    expect(() => attack.set('expenses', [])).toThrow('禁止跨模块');
  });
  it('元数据写入失败时设置也回滚', () => {
    const { port, storage, data } = fixture();
    const before = new Map(port.data);
    port.failKey = `${PREFIX}meta`;
    expect(() => storage.forOwner('settings').set('settings', { ...data.settings, unit: 'lb' })).toThrow('空间不足');
    expect(port.data).toEqual(before);
  });
  it('损坏的本机数据只报错，不自动重置', () => {
    const { port, storage } = fixture();
    port.data.set(`${PREFIX}settings`, '{broken');
    const writes = port.writes;
    expect(() => migrate(storage, () => initialDatabase(FIXED_NOW), FIXED_NOW)).toThrow('损坏');
    expect(port.writes).toBe(writes); expect(port.getItem(`${PREFIX}settings`)).toBe('{broken');
  });
  it('有数据但无版本信息时不覆盖', () => {
    const port = new MemoryStorage(); port.data.set(`${PREFIX}schedule`, '[]');
    const storage = createAppStorage(port);
    expect(() => migrate(storage, () => initialDatabase(FIXED_NOW), FIXED_NOW)).toThrow('缺少版本');
    expect(port.writes).toBe(0);
  });
  it('较新版本不降级覆盖', () => {
    const { port, storage } = fixture();
    port.data.set(`${PREFIX}meta`, JSON.stringify({ ...storage.meta(), schemaVersion: 2 }));
    const before = new Map(port.data);
    expect(() => migrate(storage, () => initialDatabase(FIXED_NOW), FIXED_NOW)).toThrow('较新版本');
    expect(port.data).toEqual(before);
  });
  it('本机读取权限失败时不尝试初始化写入', () => {
    const port = new MemoryStorage();
    port.getItem = () => { throw new DOMException('denied', 'SecurityError'); };
    expect(() => migrate(createAppStorage(port), () => initialDatabase(FIXED_NOW), FIXED_NOW)).toThrow('无法读取');
    expect(port.writes).toBe(0);
  });
  it('首次初始化中途失败会移除已写入的部分数据', () => {
    const port = new MemoryStorage(); port.failKey = `${PREFIX}words`;
    expect(() => migrate(createAppStorage(port), () => initialDatabase(FIXED_NOW), FIXED_NOW)).toThrow();
    expect(port.data.size).toBe(0);
  });
  it('初始化不会建立含图片的快照或碰其他应用的数据', () => {
    const port = new MemoryStorage(); port.data.set('unrelated.pref', 'keep');
    migrate(createAppStorage(port), () => initialDatabase(FIXED_NOW), FIXED_NOW);
    expect(port.getItem(SNAPSHOT_KEY)).toBeNull(); expect(port.getItem('unrelated.pref')).toBe('keep');
  });
});
