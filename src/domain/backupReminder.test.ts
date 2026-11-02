import { describe,expect,it } from 'vitest';
import { backupReminderDue,BACKUP_WEEK_MS } from './backupReminder';
const start='2026-11-01T04:00:00+08:00';const at=Date.parse(start);
describe('每周备份提醒',()=>{
  it('首次使用不立即催，刚好7天仍不提示，超过才提示',()=>{expect(backupReminderDue(at,start)).toBe(false);expect(backupReminderDue(at+BACKUP_WEEK_MS,start)).toBe(false);expect(backupReminderDue(at+BACKUP_WEEK_MS+1,start)).toBe(true);});
  it('以上次导出为准，而非首次使用时间',()=>{expect(backupReminderDue(at+BACKUP_WEEK_MS+1,'2026-01-01T00:00:00Z',start)).toBe(true);expect(backupReminderDue(at+BACKUP_WEEK_MS,'2026-01-01T00:00:00Z',start)).toBe(false);});
  it('关闭后完整7天不再出现，届满再提示',()=>{const now=at+BACKUP_WEEK_MS+1;const dismissed=new Date(now).toISOString();expect(backupReminderDue(now+BACKUP_WEEK_MS-1,start,undefined,dismissed)).toBe(false);expect(backupReminderDue(now+BACKUP_WEEK_MS,start,undefined,dismissed)).toBe(true);});
  it('导出后即使关闭提醒已经过期仍不提示',()=>{const now=at+BACKUP_WEEK_MS*3;expect(backupReminderDue(now,start,new Date(now).toISOString(),start)).toBe(false);});
  it('设备时间倒退与无效时间不会产生误报',()=>{expect(backupReminderDue(at-1,start)).toBe(false);expect(backupReminderDue(NaN,start)).toBe(false);expect(backupReminderDue(at,'broken')).toBe(false);});
});
