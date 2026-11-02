import { type ReceiptBackup,type AnyBackup,createMediaBackup,parseAnyBackup,importMediaBackup } from './mediaBackup';
import { checkBackupSize,MAX_BACKUP_BYTES } from './backup';
import { isRecord } from './validation';
import { type AppStorage,SCHEMA_VERSION } from './storage';
import { type ReceiptPort,receiptFiles,validateReceiptBlob } from './receipt';
import { type WallpaperPort,wallpaperFiles,verifyWallpaper } from './wallpaper';
import { wallpaperFormat,MAX_WALLPAPER_BYTES } from '../domain/appearance';
import { encodeBase64,decodeBase64 } from './base64';
import { id } from './id';

export const MAX_TRANSFER_BYTES=200*1024*1024;
export interface FullBackup extends Omit<ReceiptBackup,'scope'> {scope:'complete';wallpaper?:{type:string;base64:string}}
export type ImportBackup=AnyBackup|FullBackup;
function receipts(backup:FullBackup):ReceiptBackup {const {wallpaper:_wallpaper,...rest}=backup;return {...rest,scope:'receipts'};}
export function parseFullBackup(text:string,maxBytes=MAX_BACKUP_BYTES):ImportBackup {
  checkBackupSize(new Blob([text]).size,maxBytes);let value:unknown;try{value=JSON.parse(text);}catch{throw new Error('文件不是有效的 JSON，原有数据未被覆盖。');}
  if(!isRecord(value)||value.scope!=='complete')return parseAnyBackup(text,maxBytes);
  if(value.format!=='personal-workbench'||value.schemaVersion!==SCHEMA_VERSION||Object.keys(value).some((key)=>!['format','schemaVersion','scope','exportedAt','data','meta','media','wallpaper'].includes(key)))throw new Error('完整备份格式不兼容，原有数据未被覆盖');
  const {wallpaper,...rest}=value;const legacy=parseAnyBackup(JSON.stringify({...rest,scope:'receipts'}),maxBytes);const metadata=legacy.data.settings.appearance?.wallpaper;
  if(metadata){
    if(!isRecord(wallpaper)||Object.keys(wallpaper).some((key)=>!['type','base64'].includes(key))||wallpaper.type!==metadata.type)throw new Error('备份壁纸缺失或类型有误，原有数据未被覆盖');
    const bytes=decodeBase64(wallpaper.base64,MAX_WALLPAPER_BYTES);const format=wallpaperFormat({name:metadata.name,type:metadata.type,size:bytes.byteLength});
    if(bytes.byteLength!==metadata.size||format.kind!==metadata.kind)throw new Error('备份壁纸大小或格式与设置不一致');
  }else if(wallpaper!==undefined)throw new Error('备份含有未引用的壁纸文件');
  return value as unknown as FullBackup;
}
export async function createFullBackup(storage:AppStorage,now:Date,media:ReceiptPort=receiptFiles,wallpapers:WallpaperPort=wallpaperFiles):Promise<string>{
  const legacy=parseAnyBackup(await createMediaBackup(storage,now,media,MAX_TRANSFER_BYTES),MAX_TRANSFER_BYTES);
  const backup:FullBackup={...legacy,scope:'complete',media:legacy.scope==='receipts'?legacy.media:[]};const metadata=backup.data.settings.appearance?.wallpaper;
  if(metadata){const blob=await wallpapers.get(metadata.key);if(!blob||blob.size!==metadata.size||blob.type!==metadata.type)throw new Error('当前壁纸文件缺失或损坏，请重新导入壁纸，或移除壁纸设置后再备份');
    const estimate=new Blob([JSON.stringify(backup)]).size+Math.ceil(blob.size/3)*4+100;checkBackupSize(estimate,MAX_TRANSFER_BYTES);backup.wallpaper={type:blob.type,base64:encodeBase64(new Uint8Array(await blob.arrayBuffer()))};}
  const text=JSON.stringify(backup);checkBackupSize(new Blob([text]).size,MAX_TRANSFER_BYTES);return text;
}
export async function importFullBackup(storage:AppStorage,backup:ImportBackup,now:Date,media:ReceiptPort=receiptFiles,wallpapers:WallpaperPort=wallpaperFiles,verifyReceipt:typeof validateReceiptBlob=validateReceiptBlob,verifyPaper:typeof verifyWallpaper=verifyWallpaper,maxBytes=MAX_BACKUP_BYTES):Promise<void>{
  const checked=parseFullBackup(JSON.stringify(backup),maxBytes);if(checked.scope!=='complete'){await importMediaBackup(storage,checked,now,media,verifyReceipt,maxBytes);return;}
  const next=structuredClone(checked);const paper=next.data.settings.appearance?.wallpaper;let staged:string|undefined;const previous=storage.readDatabase().settings.appearance?.wallpaper?.key;
  try{
    if(paper&&next.wallpaper){const blob=new Blob([decodeBase64(next.wallpaper.base64,MAX_WALLPAPER_BYTES) as Uint8Array<ArrayBuffer>],{type:next.wallpaper.type});await verifyPaper(new File([blob],paper.name,{type:blob.type}));staged=`wallpaper-restored-${id()}`;await wallpapers.set(staged,blob);paper.key=staged;}
    await importMediaBackup(storage,receipts(next),now,media,verifyReceipt,maxBytes);
  }catch(error){if(staged)try{if(storage.readDatabase().settings.appearance?.wallpaper?.key!==staged)await wallpapers.remove(staged);}catch{/* 回滚中断时保留新旧文件供快照恢复。 */}throw error;}
  try{const keep=new Set([previous,staged]);for(const key of await wallpapers.keys())if(!keep.has(key))await wallpapers.remove(key);}catch{/* 清理失败不改变已恢复的数据。 */}
}
