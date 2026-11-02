import { Icon } from '../components/Icon';
import { tabs, isTabActive } from './routes';

export function Sidebar({ route }: { route: string }) {
  return <aside className="sidebar hidden lg:flex">
    <a href="#/home" className="mb-12 flex items-center gap-3 px-2"><span className="brand-mark"><Icon name="leaf" /></span><span><strong className="block text-base font-semibold">个人工作台</strong><span className="text-caption text-muted">把每天，慢慢理顺</span></span></a>
    <p className="mb-3 px-4 text-caption text-muted">我的空间</p>
    <nav aria-label="侧栏导航" className="space-y-2">{tabs.map((tab) => <a key={tab.path} href={`#${tab.path}`}
      aria-current={isTabActive(tab.path, route) ? 'page' : undefined}
      className={`side-link ${isTabActive(tab.path, route) ? 'bg-brand-soft font-semibold text-brand-strong' : 'text-muted hover:bg-canvas'}`}>
      <Icon name={tab.icon} />{tab.label}{isTabActive(tab.path, route) && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand" />}
    </a>)}</nav>
    <div className="mt-auto rounded-card bg-canvas p-4"><Icon name="shield" className="mb-3 text-brand-strong" />
      <p className="font-medium">只属于你的日常</p><p className="mt-1 text-caption text-muted">记录保存在当前浏览器。<br />记得留一份备份。</p>
      <a href="#/more/backup" className="mt-2 inline-flex min-h-11 items-center gap-2 font-medium text-brand-strong">去备份<Icon name="arrow" width="16" height="16" /></a>
    </div>
    <p className="mt-5 text-center text-caption text-muted">一件一件来，也很好。</p>
  </aside>;
}
