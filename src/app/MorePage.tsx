import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { extraRoutes } from './routes';

export function MorePage() {
  return <><div className="page-heading"><p className="eyebrow">更多一点，从容一点</p><h1>我的工具箱</h1><p>工作、生活和属于自己的小习惯，都有位置。</p></div>
    <div className="dashboard-grid"><Card className="lg:col-span-2" title="常用工具"><div className="divide-y divide-line">
      {Object.entries(extraRoutes).map(([path, item]) => <a key={path} href={`#${path}`} className="flex min-h-24 items-center gap-4 py-4 first:pt-1 last:pb-1">
        <span className="feature-icon"><Icon name={item.icon} /></span><span className="min-w-0 flex-1"><strong className="block font-medium">{item.title}</strong><span className="mt-1 block text-caption text-muted">{item.description}</span></span><Icon name="chevron" width="18" height="18" className="shrink-0 text-muted" />
      </a>)}
    </div></Card><Card className="self-start bg-brand-soft/50" title="给自己留个底"><Icon name="backup" className="mb-5 text-brand-strong" width="32" height="32" /><p className="leading-7 text-muted">换手机或清理浏览器前，先导出一份备份。新的设备也能接着记。</p><a href="#/more/backup" className="btn btn-secondary mt-6 w-full">管理备份<Icon name="arrow" width="18" height="18" /></a></Card></div>
  </>;
}
