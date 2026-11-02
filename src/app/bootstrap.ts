import { initialDatabase } from '../data/demo';
import { createAppStorage, SCHEMA_VERSION, type StoragePort } from '../lib/storage';
import { migrate } from '../lib/migrations';
import { withoutDemo } from '../lib/backup';
import { createSettingsStore } from '../modules/settings/store';
import { createPlanStore } from '../modules/plan/store';
import { createReportStore } from '../modules/report/store';
import { createFitnessStore } from '../modules/fitness/store';
import { wallpaperFiles } from '../lib/wallpaper';
import { receiptFiles,removeReceiptCopies } from '../lib/receipt';
import { createExpenseStore } from '../modules/expense/store';
import { createEnglishStore } from '../modules/english/store';

export function bootstrap(port: StoragePort, now = new Date()) {
  const storage = createAppStorage(port);
  const { recovered } = migrate(storage, () => initialDatabase(now), now);
  const settingsStore = createSettingsStore(storage.forOwner('settings'));
  const planStore = createPlanStore(storage.forOwner('plan'));
  const reportStore = createReportStore(storage.forOwner('report'));
  const fitnessStore = createFitnessStore(storage.forOwner('fitness'));
  const expenseStore = createExpenseStore(storage.forOwner('expense'));
  const englishStore = createEnglishStore(storage.forOwner('english'));
  const reloadStores = () => { settingsStore.getState().reload(); planStore.getState().reload(); reportStore.getState().reload(); fitnessStore.getState().reload();expenseStore.getState().reload();englishStore.getState().reload(); };
  const clearDemo = async () => {
    const meta = storage.meta();
    if (!meta) throw new Error('本机数据尚未初始化');
    const before=storage.readDatabase();const next=withoutDemo(before);
    storage.replace(next, { ...meta, lastModifiedAt: new Date().toISOString() });
    reloadStores();
    const removed=before.receipts.filter((entry)=>!next.receipts.some((kept)=>kept.id===entry.id));
    if(removed.length)try{await removeReceiptCopies(receiptFiles,removed);}catch{throw new Error('示例记录已清理，部分凭证副本未能清理，请检查本机存储权限');}
  };
  const resetAll = async () => {
    const stamp = new Date();
    storage.replace(initialDatabase(stamp, false), { schemaVersion: SCHEMA_VERSION,
      initialized: true, initializedAt: stamp.toISOString(), lastModifiedAt: stamp.toISOString() });
    storage.discardSnapshot();
    reloadStores();
    const cleanup=await Promise.allSettled([wallpaperFiles.clear(),receiptFiles.clear()]);if(cleanup.some((entry)=>entry.status==='rejected'))throw new Error('文字记录和设置已清空，但部分媒体副本未能移除，请检查浏览器存储权限后重试');
  };
  return { storage, settingsStore, planStore, reportStore, fitnessStore,expenseStore,englishStore, reloadStores, recovered, clearDemo, resetAll };
}
export type AppServices = ReturnType<typeof bootstrap>;
