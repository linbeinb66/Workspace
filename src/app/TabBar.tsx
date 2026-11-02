import { Icon } from '../components/Icon';
import { tabs, isTabActive } from './routes';

export function TabBar({ route }: { route: string }) {
  return <nav aria-label="底部导航" className="tab-bar lg:hidden"><div className="mx-auto grid max-w-lg grid-cols-5">
    {tabs.map((tab) => <a key={tab.path} href={`#${tab.path}`} aria-current={isTabActive(tab.path, route) ? 'page' : undefined}
      className={`tab-item ${isTabActive(tab.path, route) ? 'text-brand-strong' : 'text-muted'}`}>
      <span className={`rounded-pill px-4 py-1 ${isTabActive(tab.path, route) ? 'bg-brand-soft' : ''}`}><Icon name={tab.icon} width="21" height="21" /></span>
      <span className="text-[11px] font-medium">{tab.label}</span>
    </a>)}
  </div></nav>;
}
