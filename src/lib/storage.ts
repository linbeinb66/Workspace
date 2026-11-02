import { DATA_KEYS, type Database, type DataKey, type Meta } from '../types';
import { assertDatabase, assertMeta, assertValue, isRecord } from './validation';

export const PREFIX = 'wb.v1.';
export const SCHEMA_VERSION = 1;
export const SNAPSHOT_KEY = `${PREFIX}backup`;
export interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
type AppKey = DataKey | 'meta';
type Entries = Record<AppKey, string | null>;
interface Snapshot { format: 'workbench-rollback'; pending: boolean; createdAt: string; entries: Entries }
export interface OwnedStorage<K extends DataKey> {
  get<T extends K>(key: T, fallback: Database[T]): Database[T];
  set<T extends K>(key: T, value: Database[T]): void;
  setMany(values: Partial<Pick<Database, K>>): void;
}
const OWNERS = {
  settings: ['settings'], plan: ['schedule', 'todos', 'importantItems', 'habits', 'habitLogs'],
  fitness: ['exercises', 'sessions', 'sets', 'bodyMetrics'],
  english: ['words', 'wordProgress', 'studyLogs', 'studyQueue', 'shadowingLogs', 'mistakes'],
  expense: ['expenses', 'receipts'], report: ['reports', 'templates'],
} as const satisfies Record<string, readonly DataKey[]>;
type Owner = keyof typeof OWNERS;
const allKeys = [...DATA_KEYS, 'meta'] as const;

function storageError(error: unknown): Error {
  const name = error instanceof Error ? error.name : '';
  if (name === 'QuotaExceededError') return new Error('本机存储空间不足，本次更改未保存。请先导出备份并释放空间。');
  return new Error('暂时无法写入本机存储，本次更改未保存。请检查浏览器是否允许保存数据。');
}

export function createAppStorage(port: StoragePort, clock: () => Date = () => new Date()) {
  const readRaw = (key: string): string | null => {
    try { return port.getItem(key); } catch { throw new Error('无法读取本机数据，请检查浏览器存储权限。'); }
  };
  const get = <T>(key: AppKey, fallback: T): T => {
    const raw = readRaw(`${PREFIX}${key}`);
    if (raw === null) return fallback;
    try { return JSON.parse(raw) as T; } catch { throw new Error(`「${key}」本机数据损坏，已保留原内容，请勿清理浏览器数据。`); }
  };
  const capture = (): Entries => Object.fromEntries(allKeys.map((key) => [key, readRaw(`${PREFIX}${key}`)])) as Entries;
  const restore = (entries: Entries): void => {
    for (const key of allKeys) {
      const value = entries[key];
      if (value === null) port.removeItem(`${PREFIX}${key}`);
      else port.setItem(`${PREFIX}${key}`, value);
    }
  };
  const meta = (): Meta | null => {
    const value = get<unknown>('meta', null);
    if (value === null) return null;
    assertMeta(value);
    return value;
  };
  const readDatabase = (): Database => {
    const value = Object.fromEntries(DATA_KEYS.map((key) => [key, get<unknown>(key, null)]));
    assertDatabase(value);
    return value;
  };
  const replace = (data: Database, nextMeta: Meta, snapshot = true): void => {
    assertDatabase(data);
    assertMeta(nextMeta);
    if (nextMeta.schemaVersion !== SCHEMA_VERSION) throw new Error('当前应用不支持这份数据的版本');
    const before = capture();
    const recovery: Snapshot = { format: 'workbench-rollback', pending: true, createdAt: clock().toISOString(), entries: before };
    if (snapshot) {
      try { port.setItem(SNAPSHOT_KEY, JSON.stringify(recovery)); } catch (error) {
        throw new Error(`无法保存导入前快照，已停止操作。${storageError(error).message}`);
      }
    }
    try {
      for (const key of DATA_KEYS) port.setItem(`${PREFIX}${key}`, JSON.stringify(data[key]));
      port.setItem(`${PREFIX}meta`, JSON.stringify(nextMeta));
      if (snapshot) port.setItem(SNAPSHOT_KEY, JSON.stringify({ ...recovery, pending: false }));
    } catch (error) {
      try { restore(before); } catch {
        throw new Error('写入和回滚被浏览器中断，导入前快照已保留。请释放空间后刷新。');
      }
      if (snapshot) {
        try { port.setItem(SNAPSHOT_KEY, JSON.stringify({ ...recovery, pending: false })); } catch { /* 下次启动再次恢复同一份原始快照。 */ }
      }
      throw storageError(error);
    }
  };
  const recoverPending = (): boolean => {
    const raw = readRaw(SNAPSHOT_KEY);
    if (raw === null) return false;
    let recovery: unknown;
    try { recovery = JSON.parse(raw); } catch { throw new Error('恢复快照损坏，已停止自动写入，请保留本机数据。'); }
    if (!isRecord(recovery) || recovery.format !== 'workbench-rollback' || typeof recovery.pending !== 'boolean'
      || typeof recovery.createdAt !== 'string' || !isRecord(recovery.entries)) throw new Error('恢复快照格式无效，原数据已保留。');
    if (!recovery.pending) return false;
    const entries = recovery.entries;
    if (Object.keys(entries).length !== allKeys.length || allKeys.some((key) => !Object.hasOwn(entries, key)
      || (entries[key] !== null && typeof entries[key] !== 'string'))) throw new Error('恢复快照不完整，已停止自动恢复。');
    try {
      restore(entries as Entries);
      port.setItem(SNAPSHOT_KEY, JSON.stringify({ ...recovery, pending: false }));
      return true;
    } catch { throw new Error('尚不能完成快照恢复，请释放存储空间后重试。'); }
  };
  function forOwner<O extends Owner>(owner: O): OwnedStorage<typeof OWNERS[O][number]> {
    type K = typeof OWNERS[O][number];
    const check = (key: K) => { if (!(OWNERS[owner] as readonly string[]).includes(key)) throw new Error('禁止跨模块写入数据'); };
    const writeMany = (values: Partial<Pick<Database, K>>) => {
      const keys = Object.keys(values) as K[];
      for (const key of keys) { check(key); assertValue(key, values[key]); }
      const oldMeta = meta();
      if (!oldMeta || oldMeta.schemaVersion !== SCHEMA_VERSION) throw new Error('数据尚未正确初始化');
      const before = new Map<string, string | null>([...keys.map((key) => [`${PREFIX}${key}`, readRaw(`${PREFIX}${key}`)] as const), [`${PREFIX}meta`, readRaw(`${PREFIX}meta`)]]);
      try {
        for (const key of keys) port.setItem(`${PREFIX}${key}`, JSON.stringify(values[key]));
        port.setItem(`${PREFIX}meta`, JSON.stringify({ ...oldMeta, lastModifiedAt: clock().toISOString() }));
      } catch (error) {
        try { for (const [key, value] of before) { if (value === null) port.removeItem(key); else port.setItem(key, value); } }
        catch { throw new Error('本次保存与回滚被浏览器中断，请释放存储空间后重试。'); }
        throw storageError(error);
      }
    };
    return {
      get(key, fallback) { check(key); const value = get<unknown>(key, fallback); assertValue(key, value); return value; },
      set(key, value) { writeMany({ [key]: value } as Partial<Pick<Database, K>>); },
      setMany: writeMany,
    };
  }
  return { get, meta, readDatabase, replace, recoverPending, forOwner,
    discardSnapshot: () => { try { port.removeItem(SNAPSHOT_KEY); } catch (error) { throw storageError(error); } },
    hasData: () => allKeys.some((key) => readRaw(`${PREFIX}${key}`) !== null),
  };
}
export type AppStorage = ReturnType<typeof createAppStorage>;
