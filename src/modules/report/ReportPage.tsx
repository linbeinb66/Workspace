import { useEffect, useState } from 'react';
import type { Report } from '../../types';
import { aggregateWeek, emptyContent, supplementPlan, weekRange } from '../../domain/report';
import { renderReport } from '../../domain/reportRender';
import { Card } from '../../components/Card';
import { DateNavigator } from '../../components/DateNavigator';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';
import { fmtDate, fmtTimestamp } from '../../lib/date';
import { useWorkDate } from '../../lib/useWorkDate';
import { usePlanStore } from '../plan/store';
import { useSettingsStore } from '../settings/store';
import { useReportStore } from './store';
import { ReportFields } from './ReportFields';
import { ReportCopy } from './ReportCopy';

export function ReportPage() {
  const hour = useSettingsStore((state) => state.settings.dayStartHour);
  const weekStart = useSettingsStore((state) => state.settings.weekStart);
  const defaultTemplateId = useSettingsStore((state) => state.settings.defaultReportTemplateId);
  const today = useWorkDate(hour);
  const [selected, setSelected] = useState(today); const [type, setType] = useState<Report['type']>('daily');
  const [rebuild, setRebuild] = useState(false); const [error, setError] = useState(''); const [historyCount, setHistoryCount] = useState(10);
  const state = useReportStore((value) => value);
  const schedule = usePlanStore((value) => value.schedule); const todos = usePlanStore((value) => value.todos);
  const toast = useToast(); const range = weekRange(selected, weekStart);
  const date = type === 'weekly' ? range.start : selected;
  const report = state.reports.find((item) => item.date === date && item.type === type);
  useEffect(() => setError(''), [date, type]);
  useEffect(() => {
    if (report) return;
    const draft: Report = { id: '', date, type, ...emptyContent(), templateId: type === 'weekly' ? 'builtin-weekly' : defaultTemplateId, updatedAt: '' };
    try {
      if (type === 'weekly') state.ensureDraft({ ...draft, ...aggregateWeek(state.reports, date, range.end), periodEnd: range.end });
      else state.ensureDraft(supplementPlan(draft, schedule, todos));
      setError('');
    } catch (err) { setError(err instanceof Error ? err.message : '草稿保存失败'); }
  }, [date, type, report, defaultTemplateId, range.end, schedule, todos, state.ensureDraft, state.reports]);
  const update = (patch: Parameters<typeof state.update>[1]) => {
    if (!report) return;
    try { state.update(report.id, patch); setError(''); }
    catch (err) { setError(err instanceof Error ? err.message : '保存失败'); }
  };
  const template = state.templates.find((item) => item.id === report?.templateId) ?? state.templates.find((item) => item.id === (type === 'weekly' ? 'builtin-weekly' : 'builtin-daily'));
  const text = report && template ? renderReport(template, report) : '';
  const history = [...state.reports].sort((a, b) => b.date.localeCompare(a.date) || b.type.localeCompare(a.type));
  return <><div className="page-heading"><p className="eyebrow">收工前，给今天一个交代</p><h1>工作复盘</h1><p>把做过的事记下来，复制好，就可以去群里发了。</p></div>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="inline-flex rounded-btn bg-surface p-1 ring-1 ring-line" role="tablist" aria-label="复盘类型">{(['daily', 'weekly'] as const).map((value) => <button key={value} role="tab" aria-selected={type === value} className={`btn px-5 ${type === value ? 'bg-brand-soft text-brand-strong' : 'text-muted'}`} onClick={() => setType(value)}>{value === 'daily' ? '日报' : '周报'}</button>)}</div>{report && <ReportCopy report={report} text={text} />}</div>
    <DateNavigator value={selected} today={today} onChange={setSelected} label={type === 'daily' ? '选择复盘日期' : '选择周报中的任一天'} />
    {report && <div className="mb-5 flex flex-wrap items-center gap-3"><label htmlFor="report-template" className="text-caption font-medium text-muted">切换模板</label><select id="report-template" className="field min-w-0 flex-1 sm:max-w-sm" value={template?.id ?? ''} onChange={(e) => update({ templateId: e.target.value })}>{state.templates.filter((item) => item.mode !== 'kv').map((item) => <option key={item.id} value={item.id}>{item.name}{item.builtin ? ' · 内置' : ''}</option>)}</select></div>}
    {type === 'weekly' && <p className="mb-5 rounded-btn bg-brand-soft p-3 text-brand-strong">本周：{date} ～ {report?.periodEnd ?? range.end} · 该周已有 {state.reports.filter((item) => item.type === 'daily' && item.date >= date && item.date <= (report?.periodEnd ?? range.end)).length}/7 天日报。日报有改动时，点“重新汇总本周”更新。</p>}
    {error && <p role="alert" className="mb-5 rounded-btn bg-danger-soft p-4 text-danger">保存未成功：{error}。请先导出备份并检查存储空间，再重试。</p>}
    {report && <><div className="mb-5 flex flex-wrap items-center justify-between gap-2 text-caption text-muted"><span role="status">{error ? '有内容未保存' : '草稿已自动保存在本机'} · {report.copiedAt ? `已复制 · ${fmtTimestamp(report.copiedAt)}${report.updatedAt > report.copiedAt ? '（之后有修改）' : ''}` : '未复制'}</span><button className="btn btn-secondary text-caption" onClick={() => {
      if (type === 'weekly') { setRebuild(true); return; }
      const next = supplementPlan(report, schedule, todos); update({ done: next.done, tomorrow: next.tomorrow, sourceItemIds: next.sourceItemIds });
      toast('已补入新增事项，原有内容保留');
    }}>{type === 'daily' ? '补入新增事项' : '重新汇总本周'}</button></div>
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]"><div className="min-w-0"><ReportFields report={report} update={update} /></div>
      <div className="min-w-0 space-y-5 xl:sticky xl:top-6"><Card title="发出去的样子" subtitle={`纯文本预览 · ${template?.name ?? '默认模板'}`}>
        <pre data-testid="report-preview" className="mt-5 max-h-[65vh] overflow-y-auto whitespace-pre-wrap break-words rounded-btn bg-canvas p-4 font-sans text-body leading-7">{text || '先填点内容'}</pre>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2"><ReportCopy report={report} text={text} /><a href="#/more/settings/templates" className="btn px-2 text-caption text-brand-strong">管理模板</a></div><p className="mt-3 text-caption text-muted">复制状态只表示复制成功，不代表已发送到群。</p>
      </Card></div></div></>}
    <div className="mt-5"><Card title="历史复盘" subtitle="按日期倒序，点开继续编辑或再次复制"><div className="divide-y divide-line">{history.slice(0, historyCount).map((item) => <button key={item.id} className={`flex min-h-20 w-full items-center justify-between gap-3 py-3 text-left ${item.id === report?.id ? 'text-brand-strong' : ''}`} onClick={() => { setType(item.type); setSelected(item.date); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><span className="min-w-0"><strong className="block font-medium">{fmtDate(item.date)} · {item.type === 'daily' ? '日报' : '周报'}</strong><span className="mt-1 block truncate text-caption text-muted">{item.done.filter((line) => line.trim()).slice(0, 2).join('、') || '草稿，慢慢写'}</span></span><span className="shrink-0 text-right text-caption text-muted">{item.copiedAt ? `已复制 · ${fmtTimestamp(item.copiedAt)}` : '未复制'}{item.copiedAt && item.updatedAt > item.copiedAt && <span className="block">之后有修改</span>}</span></button>)}</div>{history.length > historyCount && <button className="btn btn-secondary mt-3 w-full" onClick={() => setHistoryCount((count) => count + 10)}>再看 10 份</button>}</Card></div>
    <ConfirmDialog open={rebuild} title="重新汇总本周？" confirmLabel="重新汇总" onClose={() => setRebuild(false)} onConfirm={() => {
      if (!report) return;
      state.update(report.id, aggregateWeek(state.reports, report.date, report.periodEnd)); setError(''); toast('已按最新日报重新汇总');
    }}><p className="leading-7 text-muted">会用最新日报替换这份周报的内容，包括手工修改。日报本身会保留。</p></ConfirmDialog>
  </>;
}
