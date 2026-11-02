import { describe, expect, it } from 'vitest';
import { fixture, FIXED_NOW } from '../../test/fixtures';
import { PREFIX } from '../../lib/storage';
import { emptyContent } from '../../domain/report';
import { createReportStore } from './store';

const draft = () => ({ date: '2026-10-30', type: 'daily' as const, ...emptyContent(), templateId: 'builtin-daily' });
describe('复盘分区持久化', () => {
  it('草稿只创建一次，重建保留手改，不重复带入', () => {
    const { storage } = fixture(); const store = createReportStore(storage.forOwner('report'), () => FIXED_NOW);
    const first = store.getState().ensureDraft(draft()); store.getState().update(first.id, { done: ['手写'], undone: [{ text: '设备', reason: '' }] });
    const same = store.getState().ensureDraft({ ...draft(), done: ['不应覆盖'] }); expect(same.id).toBe(first.id); expect(same.done).toEqual(['手写']);
    expect(createReportStore(storage.forOwner('report')).getState().reports).toHaveLength(1);
  });
  it('自动保存不会写copiedAt，只有显式复制成功回调才写', () => {
    const { storage } = fixture(); const store = createReportStore(storage.forOwner('report'), () => FIXED_NOW);
    const first = store.getState().ensureDraft(draft()); store.getState().update(first.id, { problems: '问题' }); expect(store.getState().reports[0]!.copiedAt).toBeUndefined();
    store.getState().markCopied(first.id); expect(storage.readDatabase().reports[0]!.copiedAt).toBe(FIXED_NOW.toISOString());
  });
  it('存储写入失败，UI状态与磁盘都保持旧稿', () => {
    const { storage, port } = fixture(); const store = createReportStore(storage.forOwner('report'));
    const first = store.getState().ensureDraft(draft()); port.failKey = `${PREFIX}reports`;
    expect(() => store.getState().update(first.id, { done: ['不能保存'] })).toThrow(); expect(store.getState().reports[0]!.done).toEqual([]); expect(storage.readDatabase().reports[0]!.done).toEqual([]);
  });
  it('编辑内置模板创建个人副本，原版及其他分区不变', () => {
    const { storage, port } = fixture(); const store = createReportStore(storage.forOwner('report'));
    const original = structuredClone(store.getState().templates[0]!); const before = new Map(port.data);
    const saved = store.getState().saveTemplate({ ...original, name: '自己的日报', body: '{{done}}' });
    expect(saved.id).not.toBe(original.id); expect(saved.baseTemplateId).toBe(original.id); expect(saved.builtin).toBe(false); expect(store.getState().templates.find((item) => item.id === original.id)).toEqual(original);
    for (const [key, value] of before) if (![`${PREFIX}templates`, `${PREFIX}meta`].includes(key)) expect(port.data.get(key)).toBe(value);
    expect(createReportStore(storage.forOwner('report')).getState().templates.find((item) => item.id === saved.id)).toEqual(saved);
  });
  it('个人模板再次保存不增加副本，非法模板不能写入', () => {
    const { storage } = fixture(); const store = createReportStore(storage.forOwner('report')); const original = store.getState().templates[0]!;
    const saved = store.getState().saveTemplate({ ...original, body: '{{done}}' }); store.getState().saveTemplate({ ...saved, body: '{{done}}\n{{support}}' }); expect(store.getState().templates).toHaveLength(4);
    expect(() => store.getState().saveTemplate({ ...saved, body: '{{未知}}' })).toThrow('未知变量'); expect(store.getState().templates).toHaveLength(4);
  });
  it('导入或清空后reload同步报告和模板，兼容没有新可选字段的P0数据', () => {
    const { storage } = fixture(); const store = createReportStore(storage.forOwner('report')); store.getState().ensureDraft(draft());
    storage.forOwner('report').set('reports', []); store.getState().reload(); expect(store.getState().reports).toEqual([]); expect(store.getState().templates[1]!.body).toContain('{{weekday}} 日报｜完成：');
  });
});
