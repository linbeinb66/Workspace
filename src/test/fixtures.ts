import { initialDatabase } from '../data/demo';
import { migrate } from '../lib/migrations';
import { createAppStorage, type StoragePort } from '../lib/storage';

export const FIXED_NOW = new Date('2026-10-31T02:30:00+08:00');
export class MemoryStorage implements StoragePort {
  data = new Map<string, string>();
  failKey: string | null = null;
  permanentFailure = false;
  writes = 0;
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) {
    this.writes++;
    if (key === this.failKey) {
      if (!this.permanentFailure) this.failKey = null;
      throw new DOMException('测试用存储空间不足', 'QuotaExceededError');
    }
    this.data.set(key, value);
  }
  removeItem(key: string) { this.data.delete(key); }
}
export function fixture() {
  const port = new MemoryStorage();
  const storage = createAppStorage(port, () => FIXED_NOW);
  migrate(storage, () => initialDatabase(FIXED_NOW), FIXED_NOW);
  return { port, storage, data: storage.readDatabase() };
}
