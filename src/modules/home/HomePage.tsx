import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { KpiGrid } from '../../components/KpiGrid';
import { destination } from '../../domain/stats';
import { fmtDate, fmtWeekday } from '../../lib/date';
import { useDashboard } from './useDashboard';
import { BackupReminder } from './BackupReminder';

export function HomePage() {
  const { now, today, hour, stats, next, upcoming, overdue, greeting } = useDashboard();
  const salutation = now.getHours() >= 6 && now.getHours() < 12 ? '早上好' : now.getHours() >= 12 && now.getHours() < 18 ? '下午好' : '晚上好';
  return <><BackupReminder/><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><p className="text-muted">今天是 {fmtDate(today)} <span className="mx-1 text-line">/</span> {fmtWeekday(today)}</p><span className="rounded-pill border border-line px-3 py-1.5 text-caption text-muted">{String(hour).padStart(2, '0')}:00 开启新一天</span></div>
    <div className="dashboard-grid">
      <Card className="lg:col-span-3"><div className="mb-6 flex items-start justify-between gap-4"><div><p className="eyebrow">回到自己的节奏</p><h1 className="mt-2 text-[26px] font-semibold">{salutation}，今天也慢慢来。</h1><p className="mt-2 text-muted">{greeting}</p></div><span className="hidden h-14 w-14 items-center justify-center rounded-[18px] bg-brand-soft text-brand-strong sm:flex"><Icon name="leaf" width="28" height="28" /></span></div>
        <KpiGrid items={[{ label: '今日任务', value: `${stats.done}/${stats.total}`, hint: '日程 + 待办' }, { label: '习惯打卡', value: `${stats.habitDone}/${stats.habitTotal}`, hint: '今日达标习惯' }, { label: '今日进度', value: `${stats.progress}%`, hint: '一步一步完成' }, { label: '连续打卡', value: `${stats.streak} 天`, hint: '每天完成一点' }]} />
      </Card>
      <Card title="接下来的日程" subtitle="今天接下来三条未完成日程" action={<a className="btn px-2 text-caption text-brand-strong" href="#/plan">查看全部</a>} className="lg:col-span-2">
        {upcoming.length ? <ol className="space-y-3">{upcoming.map((item) => <li key={item.id}><a href="#/plan" className="flex min-h-16 items-center gap-4 rounded-btn bg-canvas px-4 py-3"><span className="min-w-12 text-caption font-medium text-brand-strong">{item.start}</span><span className="min-w-0 flex-1 break-words font-medium">{item.title}{item.end && <span className="mt-1 block text-caption font-normal text-muted">{item.start}～{item.end}</span>}</span><Icon name="chevron" width="17" height="17" className="shrink-0 text-muted" /></a></li>)}</ol> : <div className="compact-empty"><Icon name="plan" /><p>接下来没有日程了</p><a href="#/plan" className="btn btn-secondary">看看今天的计划</a></div>}
        {overdue > 0 && <a href="#/plan" className="mt-4 flex min-h-11 items-center gap-2 rounded-btn bg-amber-soft px-3 text-caption text-amber"><Icon name="clock" width="17" height="17" />还有 {overdue} 项已过时间，去计划看看</a>}
      </Card>
      <Card title="下一个任务" className="flex flex-col bg-brand-soft/50"><Icon name={next?.category === 'fitness' ? 'fitness' : next?.category === 'study' ? 'english' : 'clock'} className="mb-5 text-brand-strong" width="30" height="30" />
        {next ? <><p className="text-caption text-muted">{next.start}{next.end ? `～${next.end}` : ''}</p><h2 className="mt-2 break-words text-xl font-semibold">{next.title}</h2><p className="mt-2 break-words text-caption text-muted">{next.note || '留一点专注，给接下来这件事。'}</p><a href={`#${destination(next.category)}`} className="btn btn-primary mt-6">开始<Icon name="arrow" width="18" height="18" /></a></> : <><h2 className="text-lg font-medium">今天也辛苦了 🌿</h2><p className="mt-3 text-muted">{overdue ? '先把剩下的事项理顺，再好好休息。' : '接下来没有未完成日程，留一点时间给自己。'}</p><a href="#/plan" className="btn btn-secondary mt-6">查看计划</a></>}
      </Card>
      <Card title="常用入口" subtitle="把每天要做的事，放在手边" className="lg:col-span-3"><div className="grid gap-3 sm:grid-cols-3">{([
        ['report', '写今日复盘', '整理今天的工作', '/more/report'], ['expense', '记一笔报账', '垫付和花销分开记', '/more/expense'], ['fitness', '记一组训练', '记住下一次的小进步', '/fitness'],
      ] as const).map(([icon, title, text, path], index) => <a key={path} href={`#${path}`} className={`quick-link ${index === 0 ? 'bg-brand-soft/50' : ''}`}><span className="feature-icon"><Icon name={icon} /></span><span className="min-w-0"><strong className="block font-medium">{title}</strong><span className="mt-1 block text-caption text-muted">{text}</span></span><Icon name="chevron" className="ml-auto shrink-0 text-muted" width="17" height="17" /></a>)}</div></Card>
    </div>
  </>;
}
