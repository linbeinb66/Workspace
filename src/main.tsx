import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import { bootstrap } from './app/bootstrap';
import { selectTheme } from './modules/settings/store';
import './styles.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);
try {
  const services = bootstrap(window.localStorage);
  const theme = selectTheme(services.settingsStore.getState());
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  root.render(<React.StrictMode><App services={services} /></React.StrictMode>);
} catch (error) {
  root.render(<main className="mx-auto max-w-lg px-6 pt-20"><p className="eyebrow">本机数据保护</p><h1 className="mt-3 text-2xl font-semibold">工作台暂时没能打开</h1>
    <p role="alert" className="my-5 leading-7 text-muted">{error instanceof Error ? error.message : '请检查浏览器是否允许保存本机数据。'}</p>
    <p className="mb-6 text-caption text-muted">应用没有清空现有记录。请保留浏览器数据，处理后重新打开。</p><button className="btn btn-primary" onClick={() => window.location.reload()}>重新打开</button></main>);
}
