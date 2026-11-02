import dayjs from 'dayjs';
import type { Report, ReportTemplate } from '../types';
import { addDays } from './plan';

export const REPORT_VARIABLES = ['date', 'weekday', 'done', 'undone', 'metrics', 'problems', 'tomorrow', 'support', 'start', 'end'] as const;
const contentVariables = ['done', 'undone', 'metrics', 'problems', 'tomorrow', 'support'] as const;
type Variable = typeof REPORT_VARIABLES[number];
const heading = /^\s*[一二三四五六七八九十百]+、/;
const cn = (n: number): string => n < 10 ? '一二三四五六七八九'[n - 1] ?? '' : n === 10 ? '十' : n < 20 ? `十${cn(n - 10)}` : n < 100 ? `${cn(Math.floor(n / 10))}十${n % 10 ? cn(n % 10) : ''}` : String(n);
// 只移除格式标记，保留其文本；ASCII 表格分隔符换为中文分隔。
export function plainText(value: string): string {
  return value.replace(/\r\n?/g, '\n').replace(/\*\*|##|~~|`/g, '').replace(/\|/g, '｜')
    .replace(/^\s*#{1,6}\s+/gm, '').replace(/^\s*[-*+]\s+/gm, '').trim();
}
const compact = (value: string) => plainText(value).split('\n').map((line) => line.trim()).filter(Boolean).join('、');
export function templateErrors(body: string, mode: ReportTemplate['mode']): string[] {
  const errors: string[] = [];
  if (!body.trim()) errors.push('请填写模板内容');
  const unknown = [...body.matchAll(/{{\s*([^{}]+?)\s*}}/g)].map((match) => match[1]?.trim() ?? '').filter((key) => !REPORT_VARIABLES.includes(key as Variable));
  if (unknown.length) errors.push(`未知变量：${[...new Set(unknown)].join('、')}`);
  if (body.replace(/{{\s*\w+\s*}}/g, '').includes('{{') || body.replace(/{{\s*\w+\s*}}/g, '').includes('}}')) errors.push('变量请写成 {{done}} 这样的完整格式');
  if (mode === 'inline' && body.trim().split(/\r?\n/).length !== 3) errors.push('简短模板必须恰好 3 行');
  if (!contentVariables.some((key) => new RegExp(`{{\\s*${key}\\s*}}`).test(body))) errors.push('请至少放入一个内容变量，例如 {{done}}');
  return errors;
}
export function renderReport(template: Pick<ReportTemplate, 'body' | 'mode'>, report: Report): string {
  const inline = template.mode === 'inline';
  const list = (lines: string[]) => lines.map((line) => inline ? compact(line) : plainText(line)).filter(Boolean)
    .map((line, index) => inline ? line : `${index + 1}. ${line}`).join(inline ? '、' : '\n');
  const values: Record<Variable, string> = {
    date: report.date, weekday: `周${'日一二三四五六'[dayjs(report.date).day()]}`,
    start: report.date, end: report.periodEnd ?? addDays(report.date, 6),
    done: list(report.done), undone: list(report.undone.filter((row) => row.text.trim()).map((row) => `${row.text}${row.reason.trim() ? `（${row.reason}）` : '（原因待补）'}`)),
    metrics: list(report.metrics.filter((row) => row.label.trim() && row.value.trim()).map((row) => `${row.label}：${row.value}`)),
    problems: inline ? compact(report.problems) : plainText(report.problems), tomorrow: list(report.tomorrow), support: inline ? compact(report.support) : plainText(report.support),
  };
  if (!contentVariables.some((key) => values[key] && new RegExp(`{{\\s*${key}\\s*}}`).test(template.body))) return '';
  const substitute = (block: string, fillEmpty = false) => block.replace(/{{\s*(\w+)\s*}}/g, (_all, key: string) => (Object.hasOwn(values, key) ? values[key as Variable] : '') || (fillEmpty && contentVariables.includes(key as typeof contentVariables[number]) ? '无' : ''));
  if (inline) return plainText(substitute(template.body.trim(), true)).split('\n').slice(0, 3).map((line) => compact(line) || '无').join('\n');
  // 接受无空行的中文章节标题；每个章节都独立参与整块判空。
  const normalized = template.body.replace(/\r\n?/g, '\n').split('\n').map((line) => heading.test(line) ? `\n${line}` : line).join('\n');
  const blocks = normalized.split(/\n\s*\n/).filter((block) => {
    const keys = [...block.matchAll(/{{\s*(\w+)\s*}}/g)].map((match) => match[1] as Variable);
    const content = keys.filter((key) => contentVariables.includes(key as typeof contentVariables[number]));
    if (content.length) return content.some((key) => Boolean(values[key]));
    // 静态章节只有标题而没有实际正文时也不留下空壳。
    return !heading.test(block.trim()) || block.split('\n').slice(1).some((line) => line.trim());
  });
  let section = 0;
  return blocks.map((block) => substitute(block)).join('\n\n').split('\n')
    .filter((line) => !/^\s*\d+[.、]\s*$/.test(line))
    .map((line) => heading.test(line) ? line.replace(heading, `${cn(++section)}、`) : line.trimEnd())
    .map((line) => plainText(line)).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
