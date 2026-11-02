import { DATA_KEYS, type Database, type Meta } from '../types';
import { assertDatabase, assertMeta, isRecord } from './validation';
import { SCHEMA_VERSION, type AppStorage } from './storage';

export const MAX_BACKUP_BYTES = 50 * 1024 * 1024;
export interface StructuredBackup {
  format: 'personal-workbench'; schemaVersion: number; scope: 'structured'; exportedAt: string; data: Database; meta: Meta;
}
export function checkBackupSize(size: number,maxBytes=MAX_BACKUP_BYTES): void {
  if (size > maxBytes) throw new Error(maxBytes===MAX_BACKUP_BYTES?'文件超过 50MB，请分批导出后再操作。当前单个备份文件上限为 50MB。':'备份总量超过 200MB，请先归档部分凭证，分次处理。');
}
function requireStructuredOnly(data: Database): void {
  if (data.receipts.length || data.expenses.some((entry) => entry.receiptIds.length)) {
    throw new Error('这份数据含凭证图片，请使用包含图片的完整备份入口。');
  }
}
export function createBackup(storage: AppStorage, now: Date,maxBytes=MAX_BACKUP_BYTES): string {
  const data = storage.readDatabase();
  requireStructuredOnly(data);
  const meta = storage.meta();
  if (!meta) throw new Error('没有可以备份的数据');
  const exportedAt = now.toISOString();
  data.settings = { ...data.settings, lastBackupAt: exportedAt, updatedAt: exportedAt };
  const file: StructuredBackup = { format: 'personal-workbench', schemaVersion: SCHEMA_VERSION,
    scope: 'structured', exportedAt, data, meta: { ...meta, lastModifiedAt: exportedAt } };
  const text = JSON.stringify(file, null, 2);
  checkBackupSize(new Blob([text]).size,maxBytes);
  return text;
}
export function parseBackup(text: string,maxBytes=MAX_BACKUP_BYTES): StructuredBackup {
  checkBackupSize(new Blob([text]).size,maxBytes);
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error('文件不是有效的 JSON，原有数据未被覆盖。'); }
  if (!isRecord(value) || value.format !== 'personal-workbench' || value.scope !== 'structured') throw new Error('请选择本工作台导出的结构化备份文件。');
  if (value.schemaVersion !== SCHEMA_VERSION) throw new Error('备份版本不兼容，原有数据未被覆盖。');
  if (Object.keys(value).some((key) => !['format', 'schemaVersion', 'scope', 'exportedAt', 'data', 'meta'].includes(key))) throw new Error('备份包含当前版本无法识别的内容。');
  if (typeof value.exportedAt !== 'string' || !Number.isFinite(Date.parse(value.exportedAt))) throw new Error('备份时间无效。');
  assertDatabase(value.data); assertMeta(value.meta);
  if (value.meta.schemaVersion !== SCHEMA_VERSION || !value.meta.initialized) throw new Error('备份版本信息不一致。');
  requireStructuredOnly(value.data);
  return value as unknown as StructuredBackup;
}
export function importBackup(storage: AppStorage, backup: StructuredBackup, now: Date): void {
  // 确认框显示后仍再次校验，任何校验失败均发生在写快照之前。
  const checked = parseBackup(JSON.stringify(backup));
  storage.replace(checked.data, { ...checked.meta, lastModifiedAt: now.toISOString() });
}
export function withoutDemo(data: Database): Database {
  const result = structuredClone(data);
  for (const key of DATA_KEYS) {
    if (key === 'settings') continue;
    Object.assign(result, { [key]: result[key].filter((entry) => entry.demo !== true) });
  }
  return result;
}
export function countRecords(data: Database): number {
  return DATA_KEYS.reduce((total, key) => total + (key === 'settings' ? 0 : data[key].length), 0);
}
