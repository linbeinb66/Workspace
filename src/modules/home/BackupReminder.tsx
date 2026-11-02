import { useServices } from '../../app/services';
import { useSettingsStore } from '../settings/store';
import { useNow } from '../../lib/useWorkDate';
import { backupReminderDue } from '../../domain/backupReminder';
import { useToast } from '../../components/Toast';

export function BackupReminder(){
  const settings=useSettingsStore((state)=>state.settings);const update=useSettingsStore((state)=>state.update);const {storage}=useServices();const now=useNow();const toast=useToast();const initialized=storage.meta()?.initializedAt;
  if(!initialized||!backupReminderDue(now.getTime(),initialized,settings.lastBackupAt,settings.backupDismissedAt))return null;
  return <div id="backup-reminder" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-btn border border-amber/20 bg-amber-soft p-4 text-amber" role="status"><div><p className="font-medium">该备份了</p><p className="mt-1 text-caption">超过 7 天没导出，给本机记录留一份副本。</p></div><div className="flex flex-wrap gap-2"><a href="#/more/backup" className="btn btn-secondary">去备份</a><button className="btn text-caption" onClick={()=>{try{update({backupDismissedAt:new Date().toISOString()});}catch(error){toast(error instanceof Error?error.message:'暂时无法保存提醒设置',true);}}}>7 天后提醒</button></div></div>;
}
