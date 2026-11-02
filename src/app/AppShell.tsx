import type { ReactNode } from 'react';
import { Icon } from '../components/Icon';
import { TabBar } from './TabBar';
import { Sidebar } from './Sidebar';
import { PwaNotice } from './PwaProvider';

export function AppShell({ route, children }: { route: string; children: ReactNode }) {
  return <div className="relative z-10 min-h-dvh"><a className="skip-link" href="#main-content" onClick={(event) => { event.preventDefault(); document.getElementById('main-content')?.focus(); }}>跳到主要内容</a>
    <Sidebar route={route} />
    <div className="lg:pl-[232px]">
      <header className="app-header"><a href="#/home" className="flex min-h-11 items-center gap-2.5 font-semibold"><span className="brand-mark h-8 w-8 lg:hidden"><Icon name="leaf" width="18" height="18" /></span><span className="lg:font-normal lg:text-muted">个人工作台</span></a>
        <span className="inline-flex items-center gap-1.5 text-caption text-muted"><span className="h-1.5 w-1.5 rounded-full bg-brand" />本机保存</span>
      </header>
      <main id="main-content" tabIndex={-1} className="main-content"><PwaNotice/>{children}</main>
    </div><TabBar route={route} />
  </div>;
}
