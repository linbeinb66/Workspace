import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import type { IconName } from '../components/Icon';

const details: Record<string, { title: string; icon: IconName; description: string }> = {
  '/plan': { title: '每日计划', icon: 'plan', description: '日程、待办、重要事项和习惯，会在这里排好。' },
  '/fitness': { title: '健身记录', icon: 'fitness', description: '记下每一组，也记住下一次的小进步。' },
  '/english': { title: '英语学习', icon: 'english', description: '每天学一点，给单词和表达留个位置。' },
  '/more/report': { title: '工作复盘', icon: 'report', description: '整理今天的完成事项，轻松复制发到工作群。' },
  '/more/expense': { title: '报账记录', icon: 'expense', description: '垫付报销和个人支出，分开记得清清楚楚。' },
};
export function PlaceholderPage({ route }: { route: string }) {
  const page = details[route] ?? details['/plan']!;
  return <><div className="page-heading"><p className="eyebrow">给日常一个位置</p><h1>{page.title}</h1><p>{page.description}</p></div>
    <Card><EmptyState icon={page.icon} title="这个角落，正在准备中" description="这里还不能新增记录。你可以先设置自己的作息、选择主题，试试备份和恢复。" action="先去设置" href="#/more/settings" /></Card>
  </>;
}
