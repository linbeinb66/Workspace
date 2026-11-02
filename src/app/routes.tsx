import { useEffect, useSyncExternalStore } from 'react';
import type { IconName } from '../components/Icon';

export const tabs = [
  { path: '/home', label: '首页', icon: 'home' },
  { path: '/plan', label: '计划', icon: 'plan' },
  { path: '/fitness', label: '健身', icon: 'fitness' },
  { path: '/english', label: '英语', icon: 'english' },
  { path: '/more', label: '更多', icon: 'more' },
] as const satisfies readonly { path: string; label: string; icon: IconName }[];
export const extraRoutes = {
  '/more/report': { title: '工作复盘', icon: 'report', description: '把今天的努力，整理成可以轻松发出的日报。' },
  '/more/expense': { title: '报账记录', icon: 'expense', description: '公司垫付和自己的花销，各自记清楚。' },
  '/more/settings': { title: '设置', icon: 'settings', description: '让工作台适应你的生活节奏。' },
  '/more/backup': { title: '数据备份', icon: 'backup', description: '把自己的记录，好好留一份。' },
} as const;
export const knownPaths: readonly string[] = [...tabs.map((tab) => tab.path), ...Object.keys(extraRoutes), '/more/settings/templates','/more/settings/appearance'];
export const isTabActive = (tab: string, route: string) => tab === '/more' ? route.startsWith('/more') : tab === route;
const subscribe = (callback: () => void) => { window.addEventListener('hashchange', callback); return () => window.removeEventListener('hashchange', callback); };
export function useHashRoute(): string {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash.slice(1), () => '/home');
  useEffect(() => {
    if (!knownPaths.includes(hash)) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#/home`);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  }, [hash]);
  return knownPaths.includes(hash) ? hash : '/home';
}
