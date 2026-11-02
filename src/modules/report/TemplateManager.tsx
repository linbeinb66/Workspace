import { useState } from 'react';
import type { Report, ReportTemplate } from '../../types';
import { defaultTemplates } from '../../data/templates';
import { emptyContent } from '../../domain/report';
import { renderReport, REPORT_VARIABLES, templateErrors } from '../../domain/reportRender';
import { Card } from '../../components/Card';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';
import { id } from '../../lib/id';
import { useSettingsStore } from '../settings/store';
import { useReportStore } from './store';

export function TemplateManager() {
  const templates = useReportStore((state) => state.templates); const saveTemplate = useReportStore((state) => state.saveTemplate);
  const defaultId = useSettingsStore((state) => state.settings.defaultReportTemplateId); const updateSettings = useSettingsStore((state) => state.update);
  const [draft, setDraft] = useState<ReportTemplate>(() => ({ ...templates[0]! })); const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState<ReportTemplate | null>(null); const [restore, setRestore] = useState(false); const toast = useToast();
  const change = (patch: Partial<ReportTemplate>) => { setDraft((value) => ({ ...value, ...patch })); setDirty(true); };
  const select = (next: ReportTemplate) => { if (dirty) setPending(next); else setDraft({ ...next }); };
  const errors = templateErrors(draft.body, draft.mode);
  const sample: Report = { id: 'preview', date: '2026-10-31', type: draft.id === 'builtin-weekly' || draft.baseTemplateId === 'builtin-weekly' ? 'weekly' : 'daily', ...emptyContent(), done: ['完成直播前准备', '完成晚间团播'], undone: [{ text: '整理道具', reason: '等补货后继续' }], metrics: [{ label: '场次', value: '3', agg: 'sum' }], tomorrow: ['检查设备'], templateId: draft.id, updatedAt: draft.updatedAt };
  const original = defaultTemplates(draft.updatedAt).find((item) => item.id === (draft.baseTemplateId ?? draft.id));
  return <><div className="page-heading"><p className="eyebrow">把常说的话，先准备好</p><h1>日报与周报模板</h1><p>内置原版一直保留，修改后存为自己的模板。</p></div><a href="#/more/settings" className="btn btn-secondary mb-5">返回设置</a>
    <div className="grid items-start gap-5 lg:grid-cols-2"><Card title="我的模板" action={<button className="btn px-2 text-brand-strong" onClick={() => select({ id: id(), name: '我的日报', body: defaultTemplates(new Date().toISOString())[0]!.body, builtin: false, mode: 'block', demo: false, updatedAt: new Date().toISOString() })}>＋ 新建</button>}>
      <label htmlFor="template-select" className="field-label">选择模板</label><select id="template-select" className="field w-full" value={templates.some((item) => item.id === draft.id) ? draft.id : ''} onChange={(e) => { const next = templates.find((item) => item.id === e.target.value); if (next) select(next); }}>{!templates.some((item) => item.id === draft.id) && <option value="">未保存的新模板</option>}{templates.filter((item) => item.mode !== 'kv').map((item) => <option key={item.id} value={item.id}>{item.name}{item.builtin ? ' · 内置' : ''}</option>)}</select>
      <label htmlFor="template-name" className="field-label mt-5">模板名称</label><input id="template-name" className="field w-full" value={draft.name} onChange={(e) => change({ name: e.target.value })} maxLength={80} />
      <label htmlFor="template-mode" className="field-label mt-5">排版方式</label><select id="template-mode" className="field w-full" value={draft.mode} onChange={(e) => change({ mode: e.target.value as 'block' | 'inline' })}><option value="block">标准 · 分章节</option><option value="inline">简短 · 固定 3 行</option></select>
      <label htmlFor="template-body" className="field-label mt-5">模板内容</label><textarea id="template-body" className="field w-full min-h-80 resize-y font-mono text-sm" value={draft.body} onChange={(e) => change({ body: e.target.value })} />
      <p className="mt-3 break-words text-caption leading-6 text-muted">可用变量：{REPORT_VARIABLES.map((key) => `{{${key}}}`).join(' ')}。章节之间留一空行，空章节会自动消失。</p>
      {errors.length > 0 && <p role="alert" className="mt-3 text-danger">{errors.join('；')}</p>}
      <div className="mt-5 flex flex-wrap gap-3"><button className="btn btn-primary" disabled={errors.length > 0 || !draft.name.trim()} onClick={() => {
        try { const next = saveTemplate(draft); setDraft(next); setDirty(false); toast('模板已保存，复盘页可切换使用'); }
        catch (err) { toast(err instanceof Error ? err.message : '模板保存失败', true); }
      }}>{draft.builtin ? '保存为个人副本' : '保存模板'}</button>{original && <button className="btn btn-secondary" onClick={() => setRestore(true)}>恢复默认内容</button>}</div>
      <label htmlFor="default-template" className="field-label mt-6">新建日报默认使用</label><select id="default-template" className="field w-full" value={defaultId} onChange={(e) => { try { updateSettings({ defaultReportTemplateId: e.target.value }); toast('默认模板已保存'); } catch (err) { toast(err instanceof Error ? err.message : '设置保存失败', true); } }}>{templates.filter((item) => item.mode !== 'kv').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
    </Card><Card title="实时预览" subtitle="使用演示内容预览，实际日报以填写内容为准" className="lg:sticky lg:top-6"><pre data-testid="template-preview" className="whitespace-pre-wrap break-words rounded-btn bg-canvas p-4 font-sans text-body leading-7">{renderReport(draft, sample) || '先填点内容'}</pre><p className="mt-4 text-caption text-muted">{dirty ? '模板修改尚未保存' : '模板已保存'} · 日报里选择此模板后生效</p></Card></div>
    <ConfirmDialog open={pending !== null} title="放弃尚未保存的模板修改？" confirmLabel="放弃并切换" onClose={() => setPending(null)} onConfirm={() => { if (pending) setDraft({ ...pending }); setDirty(false); }}><p className="text-muted">已保存的个人模板不会受影响。</p></ConfirmDialog>
    <ConfirmDialog open={restore} title="恢复默认内容？" confirmLabel="恢复内容" onClose={() => setRestore(false)} onConfirm={() => { if (original) change({ body: original.body, mode: original.mode }); }}><p className="text-muted">将编辑区恢复为对应内置模板的内容，点击保存后才会写入个人副本。</p></ConfirmDialog>
  </>;
}
