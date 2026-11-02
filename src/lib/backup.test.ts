import { describe, expect, it } from 'vitest';
import { DATA_KEYS } from '../types';
import { initialDatabase } from '../data/demo';
import { fixture, FIXED_NOW } from '../test/fixtures';
import { migrate } from './migrations';
import { PREFIX, SNAPSHOT_KEY } from './storage';
import { checkBackupSize, countRecords, createBackup, importBackup, MAX_BACKUP_BYTES, parseBackup, withoutDemo } from './backup';

describe('完整结构化备份及恢复', () => {
  it('导出后替换本机数据，再导入能恢复设置和全部记录', () => {
    const { storage, data } = fixture();
    const backup = parseBackup(createBackup(storage, FIXED_NOW));
    storage.replace(initialDatabase(FIXED_NOW, false), storage.meta()!);
    storage.forOwner('settings').set('settings', { ...data.settings, unit: 'lb' });
    importBackup(storage, backup, FIXED_NOW);
    expect(storage.readDatabase()).toEqual({ ...data, settings: { ...data.settings, lastBackupAt: FIXED_NOW.toISOString() } });
    expect(storage.readDatabase().settings.unit).toBe('kg');
  });
  it('备份只包含业务数据，不包含其他应用及回滚快照', () => {
    const { storage, port } = fixture();
    port.data.set('unrelated.pref', 'not-in-backup');
    port.data.set(SNAPSHOT_KEY, 'not-in-backup-either');
    const text = createBackup(storage, FIXED_NOW);
    expect(text).not.toContain('not-in-backup'); expect(text).not.toContain('wb.v1.backup');
  });
  it('只有 demo:true 会被清除，自己记录和内置内容保留', () => {
    const { data } = fixture();
    data.expenses.push({ ...data.expenses[0]!, id: 'personal-entry', demo: false });
    const result = withoutDemo(data);
    expect(result.schedule).toEqual([]); expect(result.expenses.map((entry) => entry.id)).toEqual(['personal-entry']);
    expect(result.exercises).toHaveLength(3); expect(result.words).toHaveLength(5); expect(result.templates).toHaveLength(3);
    expect(data.schedule).toHaveLength(3);
  });
  it('损坏 JSON 不做任何写入', () => {
    const { port } = fixture(); const writes = port.writes;
    expect(() => parseBackup('{broken')).toThrow('不是有效'); expect(port.writes).toBe(writes);
  });
  it.each([
    ['缺分区', (file: Record<string, unknown>) => { delete (file.data as Record<string, unknown>).todos; }],
    ['未知分区', (file: Record<string, unknown>) => { (file.data as Record<string, unknown>).unknown = []; }],
    ['小数分金额', (file: Record<string, unknown>) => { ((file.data as Record<string, unknown>).expenses as Record<string, unknown>[])[0]!.amountCents = 1.2; }],
    ['负金额', (file: Record<string, unknown>) => { ((file.data as Record<string, unknown>).expenses as Record<string, unknown>[])[0]!.amountCents = -1; }],
    ['旧元金额字段', (file: Record<string, unknown>) => { ((file.data as Record<string, unknown>).expenses as Record<string, unknown>[])[0]!.amount = 36; }],
    ['重复 ID', (file: Record<string, unknown>) => { const rows = (file.data as Record<string, unknown>).expenses as unknown[]; rows.push(rows[0]); }],
    ['无效日期', (file: Record<string, unknown>) => { ((file.data as Record<string, unknown>).schedule as Record<string, unknown>[])[0]!.date = '2026-02-30'; }],
    ['缺少修改时间', (file: Record<string, unknown>) => { delete ((file.data as Record<string, unknown>).words as Record<string, unknown>[])[0]!.updatedAt; }],
    ['不兼容版本', (file: Record<string, unknown>) => { file.schemaVersion = 2; }],
    ['内外版本不一致', (file: Record<string, unknown>) => { (file.meta as Record<string, unknown>).schemaVersion = 2; }],
  ])('%s 被拒绝，当前记录不变', (_name, mutate) => {
    const { storage, port } = fixture();
    const file = JSON.parse(createBackup(storage, FIXED_NOW)) as Record<string, unknown>;
    const before = new Map(port.data); mutate(file);
    expect(() => parseBackup(JSON.stringify(file))).toThrow(); expect(port.data).toEqual(before);
  });
  it('导入前快照写失败则停止，当前数据不变', () => {
    const { storage, port } = fixture();
    const file = parseBackup(createBackup(storage, FIXED_NOW));
    const before = new Map(port.data); port.failKey = SNAPSHOT_KEY;
    expect(() => importBackup(storage, file, FIXED_NOW)).toThrow('无法保存导入前快照'); expect(port.data).toEqual(before);
  });
  it('恢复中途配额错误时回滚全部业务分区', () => {
    const { storage, port, data } = fixture();
    const file = parseBackup(createBackup(storage, FIXED_NOW)); file.data.settings.unit = 'lb'; file.data.schedule = [];
    port.failKey = `${PREFIX}exercises`;
    expect(() => importBackup(storage, file, FIXED_NOW)).toThrow('空间不足');
    expect(storage.readDatabase()).toEqual(data);
    expect(JSON.parse(port.getItem(SNAPSHOT_KEY)!).pending).toBe(false);
  });
  it('页面中断留下 pending 快照，下次启动先恢复旧数据', () => {
    const { storage, port, data } = fixture();
    const entries = Object.fromEntries([...DATA_KEYS, 'meta'].map((key) => [key, port.getItem(`${PREFIX}${key}`)]));
    port.data.set(SNAPSHOT_KEY, JSON.stringify({ format: 'workbench-rollback', pending: true, createdAt: FIXED_NOW.toISOString(), entries }));
    port.data.set(`${PREFIX}schedule`, '[]');
    expect(migrate(storage, () => { throw new Error('不应重新初始化'); }, FIXED_NOW).recovered).toBe(true);
    expect(storage.readDatabase()).toEqual(data);
  });
  it('写入及即时回滚都失败时保留快照，释放空间后能恢复', () => {
    const { storage, port, data } = fixture();
    const file = parseBackup(createBackup(storage, FIXED_NOW)); file.data.settings.unit = 'lb';
    port.failKey = `${PREFIX}exercises`; port.permanentFailure = true;
    expect(() => importBackup(storage, file, FIXED_NOW)).toThrow('快照已保留');
    expect(JSON.parse(port.getItem(SNAPSHOT_KEY)!).pending).toBe(true);
    port.failKey = null;
    expect(storage.recoverPending()).toBe(true); expect(storage.readDatabase()).toEqual(data);
  });
  it('不接受无法完整恢复的图片引用', () => {
    const { storage } = fixture(); const file = parseBackup(createBackup(storage, FIXED_NOW));
    file.data.expenses[0]!.receiptIds = ['missing-image'];
    expect(() => parseBackup(JSON.stringify(file))).toThrow('凭证图片');
  });
  it('50MB 边界有明确提示', () => {
    expect(() => checkBackupSize(MAX_BACKUP_BYTES)).not.toThrow();
    expect(() => checkBackupSize(MAX_BACKUP_BYTES + 1)).toThrow('分批导出');
  });
  it('记录统计包含全部结构化列表但不把设置算成业务记录', () => {
    const { data } = fixture(); expect(countRecords(data)).toBe(21);
  });
});
