import { describe, expect, it } from 'vitest';
import { fixture, FIXED_NOW } from '../../test/fixtures';
import { PREFIX } from '../../lib/storage';
import { createSettingsStore } from './store';

describe('设置 store 的持久化一致性', () => {
  it('保存后重建 store 仍保留设置', () => {
    const { storage } = fixture();
    const store = createSettingsStore(storage.forOwner('settings'), () => FIXED_NOW);
    store.getState().update({ theme: 'dark', unit: 'lb', dayStartHour: 6, sleepTargetTime: '02:00', restTimerSec: 120, autoCarryOverTodo: false });
    const rebuilt = createSettingsStore(storage.forOwner('settings'));
    expect(rebuilt.getState().settings).toMatchObject({ theme: 'dark', unit: 'lb', dayStartHour: 6, sleepTargetTime: '02:00', restTimerSec: 120, autoCarryOverTodo: false });
  });
  it('落盘失败时内存状态也保持原值', () => {
    const { storage, port } = fixture();
    const store = createSettingsStore(storage.forOwner('settings'));
    port.failKey = `${PREFIX}settings`;
    expect(() => store.getState().update({ unit: 'lb' })).toThrow();
    expect(store.getState().settings.unit).toBe('kg'); expect(storage.readDatabase().settings.unit).toBe('kg');
  });
  it('拒绝不在 0～6 的日切，不污染状态', () => {
    const { storage } = fixture(); const store = createSettingsStore(storage.forOwner('settings'));
    expect(() => store.getState().update({ dayStartHour: 7 })).toThrow();
    expect(store.getState().settings.dayStartHour).toBe(4);
  });
});
