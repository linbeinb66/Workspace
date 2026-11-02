import { describe, expect, it } from 'vitest';
import type { Report } from '../types';
import { defaultTemplates } from '../data/templates';
import { emptyContent } from './report';
import { plainText, renderReport, templateErrors } from './reportRender';

export const reportFixture = (patch: Partial<Report> = {}): Report => ({ id: 'r1', date: '2026-10-31', type: 'daily', ...emptyContent(), templateId: 'builtin-daily', updatedAt: '2026-10-31T00:00:00Z', ...patch });
const standard = defaultTemplates('2026-10-31T00:00:00Z')[0]!;
const short = defaultTemplates('2026-10-31T00:00:00Z')[1]!;
describe('日报纯文本渲染', () => {
  it('只有日期和空指标时为空串', () => expect(renderReport(standard, reportFixture())).toBe(''));
  it('整块去除空章节，重新排列中文序号', () => {
    const text = renderReport(standard, reportFixture({ done: ['准备', '', '直播'], tomorrow: ['检查设备'], support: '需要新话筒' }));
    expect(text).toBe('【工作日报】2026-10-31 周六\n\n一、今日完成\n1. 准备\n2. 直播\n\n二、明日计划\n1. 检查设备\n\n三、需要支持\n需要新话筒');
  });
  it('只有问题与需求时不留下其他章节标题', () => {
    expect(renderReport(standard, reportFixture({ problems: '设备故障' }))).toBe('【工作日报】2026-10-31 周六\n\n一、问题与需求\n设备故障');
  });
  it('未完成原因可空，空事项行被丢弃', () => {
    const text = renderReport(standard, reportFixture({ undone: [{ text: '', reason: '不显示' }, { text: '道具', reason: '' }, { text: '排练', reason: '等场地' }] }));
    expect(text).toContain('1. 道具（原因待补）\n2. 排练（等场地）'); expect(text).not.toContain('不显示');
  });
  it('空指标、仅有label或value的指标都不生成数据块', () => {
    const text = renderReport(standard, reportFixture({ done: ['直播'], metrics: [{ label: '场次', value: '' }, { label: '', value: '10' }] }));
    expect(text).not.toContain('数据');
  });
  it('保留值0，清理模板和内容中的格式标记', () => {
    const text = renderReport({ body: '## 汇报 {{date}}\n\n一、数据\n{{metrics}}\n\n二、问题\n{{problems}}', mode: 'block' }, reportFixture({ metrics: [{ label: '场次', value: '0' }], problems: '**设备** | ~~等待~~' }));
    expect(text).toContain('场次：0'); expect(text).toContain('设备 ｜ 等待'); expect(text).not.toMatch(/\*\*|##|\||~~/);
  });
  it('简短模板内容多行也恰好三行，多项用顿号', () => {
    const text = renderReport(short, reportFixture({ done: ['准备\n开播', '收工'], tomorrow: ['复查'] }));
    expect(text.split('\n')).toEqual(['2026-10-31 周六 日报｜完成：准备、开播、收工', '未完成：无', '明日：复查']);
  });
  it('简短模板所有内容空时仍为空，不能复制只有日期的日报', () => expect(renderReport(short, reportFixture())).toBe(''));
  it('选中模板未包含已填的字段时不复制全是无的空壳', () => expect(renderReport(short, reportFixture({ support: '话筒' }))).toBe(''));
  it('没有空行分隔的周报也能去掉空章节', () => {
    const text = renderReport({ body: '【周报】{{start}} - {{end}}\n一、本周完成\n{{done}}\n二、未完成\n{{undone}}\n三、数据汇总\n{{metrics}}', mode: 'block' }, reportFixture({ date: '2026-10-26', periodEnd: '2026-11-01', type: 'weekly', done: ['直播'] }));
    expect(text).toBe('【周报】2026-10-26 - 2026-11-01\n\n一、本周完成\n1. 直播');
  });
  it('清理空编号行与多余空行', () => {
    const text = renderReport({ body: '{{done}}\n2.\n\n\n\n{{support}}', mode: 'block' }, reportFixture({ done: ['准备'], support: '支持' }));
    expect(text).not.toMatch(/\n{3}|^2\.$/m);
  });
  it('变量替换一次，用户内容中的花括号不作为模板执行', () => {
    expect(renderReport(standard, reportFixture({ done: ['检查 {{support}}'], support: '话筒' }))).toContain('1. 检查 {{support}}');
  });
  it('不修改输入的模板或日报', () => {
    const report = reportFixture({ done: [' 直播 '] }); const before = structuredClone(report);
    renderReport(standard, report); expect(report).toEqual(before);
  });
  it('校验未知变量、不完整变量与三行约束', () => {
    expect(templateErrors('{{done}}\n{{unknown}}', 'inline').join(' ')).toMatch(/未知变量.*3 行/);
    expect(templateErrors('{{done', 'block').join(' ')).toContain('完整格式');
    expect(templateErrors('{{date}}', 'block').join(' ')).toContain('内容变量');
    expect(templateErrors(short.body, short.mode)).toEqual([]);
  });
  it('基础纯文本清理保留文本与中文符号', () => expect(plainText(' **你好** | ~~世界~~ ')).toBe('你好 ｜ 世界'));
});
