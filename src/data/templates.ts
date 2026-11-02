import type { ReportTemplate } from '../types';

// 文案来自本项目 PRD，不引用外部模板或数据。
export function defaultTemplates(updatedAt: string): ReportTemplate[] {
  const base = { builtin: true, demo: false, updatedAt };
  return [
    { ...base, id: 'builtin-daily', name: '日报（标准）', mode: 'block', body: '【工作日报】{{date}} {{weekday}}\n\n一、今日完成\n{{done}}\n\n二、未完成及原因\n{{undone}}\n\n三、数据\n{{metrics}}\n\n四、问题与需求\n{{problems}}\n\n五、明日计划\n{{tomorrow}}\n\n六、需要支持\n{{support}}' },
    { ...base, id: 'builtin-short', name: '日报（简短·3 行）', mode: 'inline', body: '{{date}} {{weekday}} 日报｜完成：{{done}}\n未完成：{{undone}}\n明日：{{tomorrow}}' },
    { ...base, id: 'builtin-weekly', name: '周报', mode: 'block', body: '【工作周报】{{start}} - {{end}}\n\n一、本周完成\n{{done}}\n\n二、未完成及原因\n{{undone}}\n\n三、数据汇总\n{{metrics}}\n\n四、下周计划\n{{tomorrow}}' },
  ];
}
