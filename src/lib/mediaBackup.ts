import type { Database,Meta } from '../types';
import { assertDatabase,assertMeta,isRecord } from './validation';
import { SCHEMA_VERSION,type AppStorage } from './storage';
import { checkBackupSize,createBackup,parseBackup,type StructuredBackup,MAX_BACKUP_BYTES } from './backup';
import { type ReceiptPort,receiptFiles,validateReceiptBlob,MAX_RECEIPT_BYTES } from './receipt';
import { id } from './id';
interface EncodedImage {type:'image/jpeg';base64:string}
interface ReceiptMedia {id:string;image:EncodedImage;thumb:EncodedImage}
export interface ReceiptBackup {format:'personal-workbench';schemaVersion:number;scope:'receipts';exportedAt:string;data:Database;meta:Meta;media:ReceiptMedia[]}
export type AnyBackup=StructuredBackup|ReceiptBackup;
function encode(bytes:Uint8Array):string {let text='';for(let start=0;start<bytes.length;start+=8192)text+=String.fromCharCode(...bytes.subarray(start,start+8192));return btoa(text);}
function decode(value:unknown):Blob {
  if(!isRecord(value)||Object.keys(value).some((key)=>!['type','base64'].includes(key))||value.type!=='image/jpeg'||typeof value.base64!=='string'||!value.base64.length||value.base64.length>MAX_RECEIPT_BYTES*4/3+4||! /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value.base64))throw new Error('备份凭证图片编码损坏，原有数据未被覆盖');
  const raw=atob(value.base64);const bytes=Uint8Array.from(raw,(char)=>char.charCodeAt(0));if(bytes.length>MAX_RECEIPT_BYTES||bytes[0]!==255||bytes[1]!==216||bytes.at(-2)!==255||bytes.at(-1)!==217)throw new Error('备份凭证图片损坏，原有数据未被覆盖');
  return new Blob([bytes],{type:'image/jpeg'});
}
export function parseAnyBackup(text:string,maxBytes=MAX_BACKUP_BYTES):AnyBackup {
  checkBackupSize(new Blob([text]).size,maxBytes);let value:unknown;try{value=JSON.parse(text);}catch{throw new Error('文件不是有效的 JSON，原有数据未被覆盖。');}
  if(isRecord(value)&&value.scope==='structured')return parseBackup(text,maxBytes);
  if(!isRecord(value)||value.format!=='personal-workbench'||value.scope!=='receipts'||value.schemaVersion!==SCHEMA_VERSION||Object.keys(value).some((key)=>!['format','schemaVersion','scope','exportedAt','data','meta','media'].includes(key)))throw new Error('请选择兼容的工作台备份文件，原有数据未被覆盖');
  if(typeof value.exportedAt!=='string'||!Number.isFinite(Date.parse(value.exportedAt)))throw new Error('备份时间无效');assertDatabase(value.data);assertMeta(value.meta);
  if(value.meta.schemaVersion!==SCHEMA_VERSION||!value.meta.initialized)throw new Error('备份版本信息不一致');
  if(!Array.isArray(value.media)||value.media.length!==value.data.receipts.length)throw new Error('备份凭证图片数量不完整');const seen=new Set<string>();
  for(const entry of value.media){if(!isRecord(entry)||typeof entry.id!=='string'||Object.keys(entry).some((key)=>!['id','image','thumb'].includes(key))||seen.has(entry.id))throw new Error('备份凭证图片重复或无效');seen.add(entry.id);const meta=value.data.receipts.find((row)=>row.id===entry.id);if(!meta)throw new Error('备份凭证图片引用无效');const image=decode(entry.image);decode(entry.thumb);if(image.size!==meta.size)throw new Error('备份凭证图片大小与记录不一致');}
  return value as unknown as ReceiptBackup;
}
export async function createMediaBackup(storage:AppStorage,now:Date,media:ReceiptPort=receiptFiles,maxBytes=MAX_BACKUP_BYTES):Promise<string>{
  const data=storage.readDatabase();if(!data.receipts.length)return createBackup(storage,now,maxBytes);const currentMeta=storage.meta();if(!currentMeta)throw new Error('没有可以备份的数据');
  const exportedAt=now.toISOString();data.settings={...data.settings,lastBackupAt:exportedAt,updatedAt:exportedAt};const files:ReceiptMedia[]=[];let estimate=new Blob([JSON.stringify(data)]).size;
  for(const receipt of data.receipts){const image=await media.get(receipt.key);const thumb=await media.get(receipt.thumbKey);if(!image||!thumb)throw new Error('本机有凭证图片缺失，请重新添加凭证后再备份');estimate+=Math.ceil(image.size/3)*4+Math.ceil(thumb.size/3)*4+200;checkBackupSize(estimate,maxBytes);files.push({id:receipt.id,image:{type:'image/jpeg',base64:encode(new Uint8Array(await image.arrayBuffer()))},thumb:{type:'image/jpeg',base64:encode(new Uint8Array(await thumb.arrayBuffer()))}});}
  const file:ReceiptBackup={format:'personal-workbench',schemaVersion:SCHEMA_VERSION,scope:'receipts',exportedAt,data,meta:{...currentMeta,lastModifiedAt:exportedAt},media:files};const text=JSON.stringify(file);checkBackupSize(new Blob([text]).size,maxBytes);parseAnyBackup(text,maxBytes);return text;
}
export async function importMediaBackup(storage:AppStorage,backup:AnyBackup,now:Date,media:ReceiptPort=receiptFiles,verify:typeof validateReceiptBlob=validateReceiptBlob,maxBytes=MAX_BACKUP_BYTES):Promise<void>{
  const checked=parseAnyBackup(JSON.stringify(backup),maxBytes);const data=structuredClone(checked.data);const staged:[string,Blob][]=[];
  if(checked.scope==='receipts'){
    const token=id();
    for(const entry of checked.media){const meta=data.receipts.find((row)=>row.id===entry.id)!;const image=decode(entry.image);const thumb=decode(entry.thumb);await verify(image,meta.width,meta.height);const scale=Math.min(1,200/Math.max(meta.width,meta.height));await verify(thumb,Math.max(1,Math.round(meta.width*scale)),Math.max(1,Math.round(meta.height*scale)));
      // 新键先落盘，旧图片一直保留，保证结构化回滚/刷新恢复时仍可读取原图。
      meta.key=`receipt/${meta.id}/restored-${token}`;meta.thumbKey=`${meta.key}/thumb`;staged.push([meta.key,image],[meta.thumbKey,thumb]);
    }
  }
  assertDatabase(data);
  const before=storage.readDatabase();
  if(staged.length)await media.setMany(staged);
  try{storage.replace(data,{...checked.meta,lastModifiedAt:now.toISOString()});}
  catch(error){try{const current=storage.readDatabase();const referenced=new Set(current.receipts.flatMap((row)=>[row.key,row.thumbKey]));await media.removeMany(staged.map(([key])=>key).filter((key)=>!referenced.has(key)));}catch{/* 回滚若被浏览器中断，保留两套图片供快照恢复。 */}throw error;}
  // 成功后只保留当前和最近一次快照使用的图片，重复恢复不累积无主副本。
  try{const keep=new Set([...before.receipts,...data.receipts].flatMap((row)=>[row.key,row.thumbKey]));await media.removeMany((await media.keys()).filter((key)=>!keep.has(key)));}catch{/* 清理失败不撤销已经成功的恢复；清空全部仍可清理。 */}
}
