export const BACKUP_WEEK_MS=7*24*60*60*1000;
export function backupReminderDue(nowMs:number,initializedAt:string,lastBackupAt?:string,dismissedAt?:string):boolean {
  const reference=Date.parse(lastBackupAt??initializedAt);const dismissed=dismissedAt?Date.parse(dismissedAt):NaN;
  return Number.isFinite(nowMs)&&Number.isFinite(reference)&&nowMs-reference>BACKUP_WEEK_MS&&(!Number.isFinite(dismissed)||nowMs-dismissed>=BACKUP_WEEK_MS);
}
