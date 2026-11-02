import { describe, expect, it } from 'vitest';
import type { Report, ScheduleItem, Todo } from '../types';
import { aggregateWeek, emptyContent, missingReasons, parseMinutes, supplementPlan, weekRange } from './report';

const stamp = '2026-10-31T00:00:00Z';
const report = (patch: Partial<Report> = {}): Report => ({ id: 'r', date: '2026-10-31', type: 'daily', ...emptyContent(), templateId: 'builtin-daily', updatedAt: stamp, ...patch });
const todo = (patch: Partial<Todo> = {}): Todo => ({ id: 't', date: '2026-10-31', title: '直播准备', done: true, priority: 'medium', carryCount: 0, updatedAt: stamp, ...patch });
const schedule = (patch: Partial<ScheduleItem> = {}): ScheduleItem => ({ id: 's', date: '2026-10-31', title: '检查设备', done: true, start: '20:00', category: 'work', updatedAt: stamp, ...patch });
describe('计划补入与周报', () => {
  it('首次带入当天已完成和明天未完成，来源 ID 去重', () => {
    const result = supplementPlan(report(), [schedule(), schedule({ id: 's2', date: '2026-11-01', done: false }), schedule({ id: 's3', done: false })], [todo(), todo({ id: 't2', date: '2026-11-01', title: '排练', done: false })]);
    expect(result.done).toEqual(['检查设备', '直播准备']); expect(result.tomorrow).toEqual(['检查设备', '排练']); expect(result.sourceItemIds).toHaveLength(4);
    expect(supplementPlan(result, [schedule()], [todo()])).toEqual(result);
  });
  it('编辑和删除带入的行后补入不复原，不覆盖问题和原因', () => {
    const first = supplementPlan(report(), [schedule()], [todo()]);
    const edited = { ...first, done: ['自己写的'], problems: '设备故障', undone: [{ text: '道具', reason: '' }] };
    const next = supplementPlan(edited, [schedule(), schedule({ id: 'new', title: '新事项' })], [todo({ title: '改名后的待办' })]);
    expect(next.done).toEqual(['自己写的', '新事项']); expect(next.problems).toBe('设备故障'); expect(next.undone).toEqual(edited.undone);
  });
  it('同名来源不重复出现，但都记住身份', () => {
    const result = supplementPlan(report(), [schedule({ title: '直播准备' })], [todo()]);
    expect(result.done).toEqual(['直播准备']); expect(result.sourceItemIds).toHaveLength(2);
  });
  it('空原因只统计有事项的行', () => expect(missingReasons(report({ undone: [{ text: '排练', reason: ' ' }, { text: '', reason: '' }, { text: '准备', reason: '等货' }] }))).toBe(1));
  it('周一和周日起始跨月范围正确', () => {
    expect(weekRange('2026-11-01')).toEqual({ start: '2026-10-26', end: '2026-11-01' });
    expect(weekRange('2026-11-01', 0)).toEqual({ start: '2026-11-01', end: '2026-11-07' });
  });
  it.each([['90分钟', 90], ['1小时30分', 90], ['1.5h', 90], ['01:30', 90], ['1h30m', 90], ['90', 90], ['2小时', 120], ['等确认', null], ['01:90', null], ['', null]])('解析时长 %s', (input, expected) => expect(parseMinutes(String(input))).toBe(expected));
  it('只聚合范围内7天日报，完成去重，未完成原因保留', () => {
    const daily = Array.from({ length: 7 }, (_, index) => report({ id: `d${index}`, date: `2026-10-${26 + index > 31 ? '01' : 26 + index}`, done: ['直播', `第${index}天`] }));
    daily[6]!.date = '2026-11-01';
    const result = aggregateWeek([...daily, report({ date: '2026-11-02', done: ['范围外'] }), report({ type: 'weekly', done: ['不应重复算周报'] })], '2026-10-26');
    expect(result.done).toHaveLength(8); expect(result.done).not.toContain('范围外'); expect(result.done).not.toContain('不应重复算周报');
    expect(aggregateWeek([report({ undone: [{ text: '排练', reason: '场地' }] }), report({ date: '2026-10-30', undone: [{ text: '排练', reason: '等货' }] })], '2026-10-26').undone).toHaveLength(2);
  });
  it('数值求和、时长求和、峰值最大、last按日期，无法解析保留全明细', () => {
    const metrics: Report['metrics'] = [{ label: '场次', value: '2' }, { label: '时长', value: '1小时30分' }, { label: '峰值', value: '1,200', agg: 'max' }, { label: '状态', value: '准备', agg: 'last' }, { label: '说明', value: '1' }];
    const result = aggregateWeek([report({ date: '2026-10-31', metrics: metrics.map((row) => ({ ...row, value: ({ 场次: '3', 时长: '01:00', 峰值: '900', 状态: '收工', 说明: '待确认' } as Record<string, string>)[row.label]! })) }), report({ date: '2026-10-30', metrics })], '2026-10-26');
    expect(result.metrics).toEqual([{ label: '场次', value: '5', agg: 'sum' }, { label: '时长', value: '2小时30分钟', agg: 'sum' }, { label: '峰值', value: '1200', agg: 'max' }, { label: '状态', value: '收工', agg: 'last' }, { label: '说明', value: '2026-10-30：1；2026-10-31：待确认', agg: 'sum' }]);
  });
  it('list保留日期，同名不同agg分开，不猜合并规则', () => {
    const result = aggregateWeek([report({ metrics: [{ label: '场次', value: '2', agg: 'sum' }, { label: '场次', value: '3', agg: 'max' }, { label: '备注', value: '正常', agg: 'list' }] })], '2026-10-26');
    expect(result.metrics.map((row) => row.label)).toEqual(['场次（求和）', '场次（最大）', '备注']); expect(result.metrics[2]!.value).toContain('2026-10-31：正常');
  });
  it('下周计划取本周最后一份日报的明日计划，不混入过期计划', () => {
    const result = aggregateWeek([report({ date: '2026-10-30', tomorrow: ['周六排练'] }), report({ date: '2026-10-31', tomorrow: ['周日准备'] })], '2026-10-26');
    expect(result.tomorrow).toEqual(['周日准备']);
  });
  it('聚合为空时各内容为空，输入不变', () => {
    expect(aggregateWeek([], '2026-10-26')).toEqual({ done: [], undone: [], metrics: [], problems: '', tomorrow: [], support: '' });
    const source = [report({ done: [' 直播 ', '直播'] })]; const before = structuredClone(source); aggregateWeek(source, '2026-10-26'); expect(source).toEqual(before);
  });
});
