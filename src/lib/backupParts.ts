import { id } from './id';
import { encodeBase64,decodeBase64 } from './base64';
import { isRecord } from './validation';
import { MAX_BACKUP_BYTES,checkBackupSize } from './backup';
import { MAX_TRANSFER_BYTES,parseFullBackup,type ImportBackup } from './fullBackup';

export const PART_BYTES=20*1024*1024;
export interface BackupPart {format:'personal-workbench-part';schemaVersion:1;groupId:string;index:number;total:number;sha256:string;bytes:number;payload:string}
export interface TransferFile {name:string;text:string}
async function checksum(bytes:Uint8Array):Promise<string>{if(!globalThis.crypto?.subtle)throw new Error('分卷备份需要 HTTPS 或支持本地文件加密校验的浏览器');return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes as Uint8Array<ArrayBuffer>))].map((byte)=>byte.toString(16).padStart(2,'0')).join('');}
export async function splitBackup(text:string,name:string,partBytes=PART_BYTES,singleLimit=MAX_BACKUP_BYTES):Promise<TransferFile[]>{
  const bytes=new TextEncoder().encode(text);checkBackupSize(bytes.byteLength,MAX_TRANSFER_BYTES);if(bytes.byteLength<=singleLimit)return [{name:`${name}.json`,text}];
  if(!Number.isSafeInteger(partBytes)||partBytes<=0||partBytes>PART_BYTES)throw new Error('分卷大小无效');const total=Math.ceil(bytes.byteLength/partBytes);if(total>20)throw new Error('备份分卷数量超过上限，请先归档部分凭证');
  const groupId=id();const sha256=await checksum(bytes);const files:TransferFile[]=[];
  for(let index=0;index<total;index++){const part:BackupPart={format:'personal-workbench-part',schemaVersion:1,groupId,index:index+1,total,sha256,bytes:bytes.byteLength,payload:encodeBase64(bytes.subarray(index*partBytes,(index+1)*partBytes))};const text=JSON.stringify(part);checkBackupSize(new Blob([text]).size);files.push({name:`${name}-${groupId.slice(0,8)}-第${index+1}卷共${total}卷.json`,text});}
  return files;
}
export async function readBackupFiles(files:{name:string;size:number;text:()=>Promise<string>}[]):Promise<{backup:ImportBackup;multipart:boolean;name:string}>{
  if(!files.length||files.length>20)throw new Error('请选择一份 JSON，或同一套备份的全部分卷（最多20卷）');for(const file of files)checkBackupSize(file.size);
  if(files.reduce((sum,file)=>sum+file.size,0)>Math.ceil(MAX_TRANSFER_BYTES*4/3)+20*4096)throw new Error('所选文件总量超过允许大小，请只选同一套备份');
  const texts=await Promise.all(files.map((file)=>file.text()));let first:unknown;try{first=JSON.parse(texts[0]!);}catch{throw new Error('文件不是有效的 JSON，原有数据未被覆盖');}
  if(!isRecord(first)||first.format!=='personal-workbench-part'){if(files.length!==1)throw new Error('普通备份一次只选择一个文件');return {backup:parseFullBackup(texts[0]!),multipart:false,name:files[0]!.name};}
  const parts=texts.map((text):BackupPart=>{let part:unknown;try{part=JSON.parse(text);}catch{throw new Error('分卷 JSON 损坏，原有数据未被覆盖');}
    if(!isRecord(part)||Object.keys(part).some((key)=>!['format','schemaVersion','groupId','index','total','sha256','bytes','payload'].includes(key))||part.format!=='personal-workbench-part'||part.schemaVersion!==1||typeof part.groupId!=='string'||!part.groupId||!Number.isSafeInteger(part.index)||!Number.isSafeInteger(part.total)||(part.total as number)<2||(part.total as number)>20||(part.index as number)<1||(part.index as number)>(part.total as number)||typeof part.sha256!=='string'||!/^[a-f0-9]{64}$/.test(part.sha256)||!Number.isSafeInteger(part.bytes)||(part.bytes as number)<=0||(part.bytes as number)>MAX_TRANSFER_BYTES||typeof part.payload!=='string')throw new Error('分卷格式无效，原有数据未被覆盖');return part as unknown as BackupPart;});
  const header=parts[0]!;if(parts.length!==header.total||new Set(parts.map((part)=>part.index)).size!==header.total)throw new Error('分卷缺失或重复，请一次选择这套备份的全部分卷');
  if(parts.some((part)=>part.groupId!==header.groupId||part.total!==header.total||part.sha256!==header.sha256||part.bytes!==header.bytes))throw new Error('这些分卷不属于同一套备份，请重新选择');
  const chunks=parts.sort((a,b)=>a.index-b.index).map((part)=>decodeBase64(part.payload,PART_BYTES));
  if(chunks.reduce((sum,bytes)=>sum+bytes.length,0)!==header.bytes)throw new Error('分卷内容大小有误');
  const all=new Uint8Array(header.bytes);let offset=0;for(const bytes of chunks){all.set(bytes,offset);offset+=bytes.length;}
  if(await checksum(all)!==header.sha256)throw new Error('分卷校验失败，文件可能损坏，原有数据未被覆盖');
  let text:string;try{text=new TextDecoder('utf-8',{fatal:true}).decode(all);}catch{throw new Error('分卷文本编码损坏');}
  return {backup:parseFullBackup(text,MAX_TRANSFER_BYTES),multipart:true,name:`分卷备份 · ${header.total} 卷（${header.groupId.slice(0,8)}）`};
}
