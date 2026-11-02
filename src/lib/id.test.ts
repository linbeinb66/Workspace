import { afterEach, describe, expect, it, vi } from 'vitest';
import { id } from './id';

afterEach(() => vi.unstubAllGlobals());

describe('本机记录 ID', () => {
  it('普通 HTTP 环境没有 randomUUID 时仍能生成标准 UUID', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => {
        bytes.fill(0xab);
        return bytes;
      },
    });

    expect(id()).toBe('abababab-abab-4bab-abab-abababababab');
  });
});
