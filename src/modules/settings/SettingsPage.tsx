import { useEffect, useState } from 'react';
import type { Settings } from '../../types';
import { Card } from '../../components/Card';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Icon } from '../../components/Icon';
import { useToast } from '../../components/Toast';
import { fmtDate, fmtWeekday } from '../../lib/date';
import { useWorkDate } from '../../lib/useWorkDate';
import { useServices } from '../../app/services';
import { useSettingsStore } from './store';
import { HabitManager } from './HabitManager';
import { WordImporter } from '../english/WordImporter';
import { PwaSettings } from '../../app/PwaProvider';

export function SettingsPage() {
  const settings = useSettingsStore((state) => state.settings);
  const update = useSettingsStore((state) => state.update);
  const today = useWorkDate(settings.dayStartHour);
  const services = useServices();
  const toast = useToast();
  const [confirmation, setConfirmation] = useState<'demo' | 'all' | null>(null);
  const [greeting, setGreeting] = useState(settings.greeting ?? '一件一件来，也很好。');
  useEffect(() => setGreeting(settings.greeting ?? '一件一件来，也很好。'), [settings.greeting]);
  const save = (patch: Partial<Settings>) => {
    try { update(patch); toast('设置已保存'); } catch (error) { toast(error instanceof Error ? error.message : '保存失败', true); }
  };
  return <><div className="page-heading"><p className="eyebrow">按自己的节奏来</p><h1>设置</h1><p>改好就会保存，下次打开还是你习惯的样子。</p></div>
    <div className="dashboard-grid">
      <PwaSettings/>
      <Card title="我的一天" subtitle="凌晨收工，也不用赶着在零点前记录" className="lg:col-span-2"><div className="space-y-6">
        <div className="setting-row"><div><label htmlFor="day-start" className="font-medium">新一天从几点开始</label><p className="setting-hint">调整后不改变历史记录的归属。</p></div><select id="day-start" className="field w-auto min-w-28" value={settings.dayStartHour} onChange={(e) => save({ dayStartHour: Number(e.target.value) })}>{Array.from({ length: 7 }, (_, hour) => <option key={hour} value={hour}>{String(hour).padStart(2, '0')}:00</option>)}</select></div>
        <div className="flex items-start gap-3 rounded-btn bg-brand-soft/60 p-4 text-brand-strong"><Icon name="clock" className="mt-0.5 shrink-0" width="20" height="20" /><p>按当前设置，现在属于 <strong>{fmtDate(today)} {fmtWeekday(today)}</strong>。凌晨 {settings.dayStartHour} 点前的记录归前一天。</p></div>
        <div className="setting-row"><div><label htmlFor="sleep-target" className="font-medium">目标入睡时间</label><p className="setting-hint">先定一个适合自己收工作息的目标。</p></div><input id="sleep-target" type="time" className="field w-auto min-w-28" value={settings.sleepTargetTime} onChange={(e) => { if (e.target.value) save({ sleepTargetTime: e.target.value }); }} /></div>
        <div className="setting-row"><div><label id="carry-label" className="font-medium">未完成待办自动顺延</label><p className="setting-hint">第二天继续，不用重新记一遍。</p></div><button type="button" className={`switch ${settings.autoCarryOverTodo ? 'bg-brand' : 'bg-line'}`} role="switch" aria-checked={settings.autoCarryOverTodo} aria-labelledby="carry-label" onClick={() => save({ autoCarryOverTodo: !settings.autoCarryOverTodo })}><span className={settings.autoCarryOverTodo ? 'translate-x-5' : 'translate-x-0'} /></button></div>
      </div></Card>
      <Card title="外观" subtitle="选一个看着舒服的样子" className="self-start"><div role="radiogroup" aria-label="主题" className="grid grid-cols-3 gap-1 rounded-btn bg-canvas p-1">{([
        ['system', '跟随系统'], ['light', '浅色'], ['dark', '深色'],
      ] as const).map(([value, label]) => <button key={value} role="radio" aria-checked={settings.theme === value} className={`min-h-11 rounded-[9px] px-1 text-caption ${settings.theme === value ? 'bg-surface font-semibold text-brand-strong shadow-card' : 'text-muted'}`} onClick={() => save({ theme: value })}>{label}</button>)}</div><div className="mt-5 rounded-btn border border-line bg-canvas p-4"><div className="mb-3 h-2 w-12 rounded-full bg-brand" /><div className="h-2 w-full rounded-full bg-line" /><div className="mt-2 h-2 w-2/3 rounded-full bg-line" /><span className="mt-4 inline-block rounded-pill bg-brand-soft px-3 py-1 text-caption text-brand-strong">舒服，就很好</span></div></Card>
      <Card title="训练偏好" subtitle="先设好，训练时少点几下" className="lg:col-span-2"><div className="space-y-6">
        <div className="setting-row"><div><label htmlFor="unit" className="font-medium">重量单位</label><p className="setting-hint">切换显示单位，历史重量保持一致。</p></div><select id="unit" className="field w-auto min-w-28" value={settings.unit} onChange={(e) => save({ unit: e.target.value as Settings['unit'] })}><option value="kg">公斤 kg</option><option value="lb">磅 lb</option></select></div>
        <div className="setting-row"><div><label htmlFor="rest-timer" className="font-medium">组间休息计时</label><p className="setting-hint">每组记录后的默认休息时长。</p></div><select id="rest-timer" className="field w-auto min-w-28" value={settings.restTimerSec} onChange={(e) => save({ restTimerSec: Number(e.target.value) })}>{[0, 60, 90, 120, 180].map((sec) => <option key={sec} value={sec}>{sec === 0 ? '关闭' : `${sec} 秒`}</option>)}</select></div>
      </div></Card>
      <Card title="给记录留个备份" className="self-start"><p className="text-muted">记录只在当前浏览器里。换设备前，记得带走一份。</p><a href="#/more/backup" className="btn btn-primary mt-5 w-full"><Icon name="backup" width="19" height="19" />导出 / 恢复备份</a></Card>
      <Card title="主题与壁纸" subtitle="森野绿、晴空蓝、雾紫、落日杏，以及你自己的图片或视频" className="lg:col-span-3"><a href="#/more/settings/appearance" className="btn btn-secondary">挑选主题与壁纸</a></Card>
      <HabitManager />
      <WordImporter />
      <Card title="日报与周报模板" subtitle="把每天的复盘写成自己习惯的样子" className="lg:col-span-3"><p className="text-muted">标准、简短三行、周报三套内置模板，可修改后保存为个人副本。</p><a href="#/more/settings/templates" className="btn btn-secondary mt-4">管理模板</a></Card>
      <Card title="首页的一句话" className="lg:col-span-3"><label htmlFor="home-greeting" className="field-label">给自己一句提醒</label><div className="flex flex-wrap gap-3"><input id="home-greeting" className="field min-w-0 flex-1" maxLength={60} value={greeting} onChange={(event) => setGreeting(event.target.value)} /><button className="btn btn-secondary" onClick={() => save({ greeting: greeting.trim() })}>保存这句话</button></div></Card>
      <Card title="数据管理" subtitle="清理前，请先保存一份备份" className="lg:col-span-3"><div className="divide-y divide-line">
        <div className="setting-row pb-5"><div><p className="font-medium">清空示例数据</p><p className="setting-hint">只删示例记录，保留动作库、词库和模板。</p></div><button className="btn btn-secondary shrink-0" onClick={() => setConfirmation('demo')}>清空示例</button></div>
        <div className="setting-row pt-5"><div><p className="font-medium text-danger">清空全部数据</p><p className="setting-hint">清除个人记录、凭证与壁纸副本，设置恢复默认。</p></div><button className="btn btn-outline-danger shrink-0" onClick={() => setConfirmation('all')}>清空全部</button></div>
      </div></Card>
    </div>
    <ConfirmDialog open={confirmation !== null} title={confirmation === 'all' ? '清空全部数据？' : '清空示例数据？'} confirmLabel={confirmation === 'all' ? '确认清空' : '清空示例'} destructive onClose={() => setConfirmation(null)} onConfirm={async () => {
      if (confirmation === 'all') { await services.resetAll(); toast('个人记录已清空，设置已恢复默认'); }
      else { await services.clearDemo(); toast('示例已清空，内置内容已保留'); }
    }}><p className="leading-7 text-muted">{confirmation === 'all' ? '全部个人记录、设置、凭证和壁纸副本会被清除，内置动作、词库、习惯与模板保留，示例不会重新出现。新版完整 JSON 可包含壁纸文件，请先确认完整备份和需要的临时录音已保存。' : '只删除标记为示例的记录，自己新增的数据和内置内容都会保留。此操作不会自动补回示例。'}</p></ConfirmDialog>
  </>;
}
