import type { Report } from '../../types';
import { Card } from '../../components/Card';
import { FormField } from '../../components/FormField';

type Patch = Partial<Pick<Report, 'done' | 'undone' | 'metrics' | 'problems' | 'tomorrow' | 'support'>>;
export function ReportFields({ report, update }: { report: Report; update: (patch: Patch) => void }) {
  return <div className="space-y-5">
    <Card title={report.type === 'daily' ? '今日完成' : '本周完成'} subtitle="每行一项，带入的内容也可以直接修改"><FormField label="完成事项" htmlFor="report-done"><textarea id="report-done" className="field w-full min-h-36 resize-y" value={report.done.join('\n')} placeholder="今天完成了什么？" onChange={(e) => update({ done: e.target.value.split('\n') })} /></FormField></Card>
    <Card title="未完成及原因" subtitle="原因可以晚点补，不影响保存" action={<button className="btn px-2 text-brand-strong" onClick={() => update({ undone: [...report.undone, { text: '', reason: '' }] })}>＋ 添加</button>}>
      {!report.undone.length && <p className="py-3 text-muted">没有未完成事项，也很好。</p>}
      <div className="space-y-4">{report.undone.map((row, index) => <div className="rounded-btn bg-canvas p-3" key={index}>
        <div className="mb-2 flex items-center justify-between"><span className="text-caption text-muted">第 {index + 1} 项</span><button className="btn min-w-11 px-2 text-caption text-danger" aria-label={`删除未完成第${index + 1}项`} onClick={() => update({ undone: report.undone.filter((_, i) => i !== index) })}>删除</button></div>
        <FormField label="事项" htmlFor={`undone-${index}`}><input id={`undone-${index}`} className="field w-full" value={row.text} onChange={(e) => update({ undone: report.undone.map((item, i) => i === index ? { ...item, text: e.target.value } : item) })} /></FormField>
        <div className="mt-3"><FormField label="原因（可稍后填写）" htmlFor={`reason-${index}`}><input id={`reason-${index}`} className={`field w-full ${row.text.trim() && !row.reason.trim() ? 'border-danger' : ''}`} aria-invalid={Boolean(row.text.trim() && !row.reason.trim())} value={row.reason} onChange={(e) => update({ undone: report.undone.map((item, i) => i === index ? { ...item, reason: e.target.value } : item) })} /></FormField></div>
      </div>)}</div>
    </Card>
    <Card title="数据" subtitle="填写有意义的数字；空白行不会出现在日报里" action={<button className="btn px-2 text-brand-strong" onClick={() => update({ metrics: [...report.metrics, { label: '', value: '', agg: 'sum' }] })}>＋ 添加指标</button>}>
      <div className="space-y-4">{report.metrics.map((row, index) => {
        const change = (patch: Partial<typeof row>) => update({ metrics: report.metrics.map((item, i) => i === index ? { ...item, ...patch } : item) });
        return <div key={index} className="rounded-btn bg-canvas p-3"><div className="grid grid-cols-2 gap-3"><FormField label="指标名称" htmlFor={`metric-label-${index}`}><input id={`metric-label-${index}`} className="field w-full" value={row.label} onChange={(e) => change({ label: e.target.value })} /></FormField><FormField label="数值或时长" htmlFor={`metric-value-${index}`}><input id={`metric-value-${index}`} className="field w-full" placeholder={row.label === '时长' ? '例如 1小时30分' : '例如 3'} value={row.value} onChange={(e) => change({ value: e.target.value })} /></FormField></div>
          <div className="mt-3 flex items-end gap-3"><div className="min-w-0 flex-1"><FormField label="周报汇总方式" htmlFor={`metric-agg-${index}`}><select id={`metric-agg-${index}`} className="field w-full" value={row.agg ?? 'sum'} onChange={(e) => change({ agg: e.target.value as NonNullable<typeof row.agg> })}><option value="sum">求和</option><option value="max">最大值（如峰值）</option><option value="last">最后一次</option><option value="list">保留每日明细</option></select></FormField></div><button className="btn px-3 text-danger" aria-label={`删除指标第${index + 1}项`} onClick={() => update({ metrics: report.metrics.filter((_, i) => i !== index) })}>删除</button></div>
        </div>;
      })}</div><p className="mt-3 text-caption text-muted">时长可填 90分钟、1小时30分、1.5h、01:30；纯数字按分钟。无法求和的内容在周报中保留明细。</p>
    </Card>
    <Card title="接下来的安排"><div className="space-y-5">
      <FormField label="问题与需求" htmlFor="report-problems"><textarea id="report-problems" className="field w-full min-h-24 resize-y" value={report.problems} onChange={(e) => update({ problems: e.target.value })} /></FormField>
      <FormField label={report.type === 'daily' ? '明日计划（每行一项）' : '下周计划（每行一项）'} htmlFor="report-tomorrow"><textarea id="report-tomorrow" className="field w-full min-h-28 resize-y" value={report.tomorrow.join('\n')} onChange={(e) => update({ tomorrow: e.target.value.split('\n') })} /></FormField>
      <FormField label="需要支持" htmlFor="report-support"><textarea id="report-support" className="field w-full min-h-24 resize-y" value={report.support} onChange={(e) => update({ support: e.target.value })} /></FormField>
    </div></Card>
  </div>;
}
