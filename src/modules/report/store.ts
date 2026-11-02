import { createContext, useContext } from 'react';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type { Report, ReportTemplate } from '../../types';
import type { OwnedStorage } from '../../lib/storage';
import { id } from '../../lib/id';
import { defaultTemplates } from '../../data/templates';
import { templateErrors } from '../../domain/reportRender';

export interface ReportState {
  reports: Report[]; templates: ReportTemplate[];
  ensureDraft: (draft: Omit<Report, 'id' | 'updatedAt'>) => Report;
  update: (reportId: string, patch: Partial<Pick<Report, 'done' | 'undone' | 'metrics' | 'problems' | 'tomorrow' | 'support' | 'templateId' | 'sourceItemIds'>>) => void;
  markCopied: (reportId: string) => void;
  saveTemplate: (template: ReportTemplate) => ReportTemplate;
  reload: () => void;
}
export function createReportStore(port: OwnedStorage<'reports' | 'templates'>, clock: () => Date = () => new Date()) {
  const readTemplates = () => {
    const stored = port.get('templates', []);
    // 内置模板来自代码中的不可变原版；旧 P0/P1 简短模板在此升级，个人副本不变。
    const defaults = defaultTemplates('2026-10-31T00:00:00.000Z');
    const builtinIds = new Set(defaults.map((template) => template.id));
    return [...defaults, ...stored.filter((template) => !builtinIds.has(template.id))];
  };
  return createStore<ReportState>((set, get) => ({
    reports: port.get('reports', []), templates: readTemplates(),
    ensureDraft(draft) {
      const existing = get().reports.find((report) => report.type === draft.type && report.date === draft.date);
      if (existing) return existing;
      const report: Report = { ...draft, id: id(), updatedAt: clock().toISOString(), demo: false };
      const reports = [...get().reports, report];
      port.set('reports', reports); set({ reports }); return report;
    },
    update(reportId, patch) {
      if (!get().reports.some((report) => report.id === reportId)) throw new Error('这份复盘已不存在，请重新打开');
      const reports = get().reports.map((report) => report.id === reportId ? { ...report, ...patch, updatedAt: clock().toISOString() } : report);
      port.set('reports', reports); set({ reports });
    },
    markCopied(reportId) {
      const stamp = clock().toISOString();
      const reports = get().reports.map((report) => report.id === reportId ? { ...report, copiedAt: stamp, updatedAt: stamp } : report);
      port.set('reports', reports); set({ reports });
    },
    saveTemplate(template) {
      const errors = templateErrors(template.body, template.mode);
      if (!template.name.trim()) errors.unshift('请填写模板名称');
      if (errors.length) throw new Error(errors.join('；'));
      const original = get().templates.find((item) => item.id === template.id);
      const builtin = original?.builtin === true;
      const next: ReportTemplate = { ...template, id: builtin ? id() : template.id, name: template.name.trim(), builtin: false, demo: false, updatedAt: clock().toISOString(),
        ...(builtin ? { baseTemplateId: original.id } : {}) };
      const templates = [...get().templates.filter((item) => item.id !== next.id), next];
      port.set('templates', templates); set({ templates }); return next;
    },
    reload() { set({ reports: port.get('reports', []), templates: readTemplates() }); },
  }));
}
export type ReportStore = ReturnType<typeof createReportStore>;
export const ReportContext = createContext<ReportStore | null>(null);
export function useReportStore<T>(selector: (state: ReportState) => T): T {
  const store = useContext(ReportContext);
  if (!store) throw new Error('复盘尚未初始化');
  return useStore(store, selector);
}
