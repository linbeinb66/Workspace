import type { Database } from '../types';
import { SCHEMA_VERSION, type AppStorage } from './storage';

// 产品 v1.1 的首次数据结构是 schema 1；有真实旧结构时再添加迁移步骤。
export function migrate(storage: AppStorage, initial: () => Database, now: Date): { recovered: boolean } {
  const recovered = storage.recoverPending();
  const meta = storage.meta();
  if (!meta) {
    if (storage.hasData()) throw new Error('发现缺少版本信息的已有数据，已停止初始化，避免覆盖。');
    const stamp = now.toISOString();
    storage.replace(initial(), { schemaVersion: SCHEMA_VERSION, initialized: true, initializedAt: stamp, lastModifiedAt: stamp }, false);
  } else {
    if (meta.schemaVersion > SCHEMA_VERSION) throw new Error('本机数据来自较新版本，请使用较新的应用打开。');
    if (meta.schemaVersion < SCHEMA_VERSION) throw new Error('此旧版本尚无迁移规则，原数据已保留。');
    if (!meta.initialized) throw new Error('本机初始化未完成，原数据已保留。');
    storage.readDatabase();
  }
  return { recovered };
}
