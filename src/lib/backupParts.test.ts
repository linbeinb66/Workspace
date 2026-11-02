import { describe,expect,it } from 'vitest';
import { splitBackup,readBackupFiles,type TransferFile } from './backupParts';
import { createFullBackup } from './fullBackup';
import { fixture,FIXED_NOW } from '../test/fixtures';
import { MAX_BACKUP_BYTES } from './backup';
import { encodeBase64,decodeBase64 } from './base64';
const input=(files:TransferFile[])=>files.map((file)=>({name:file.name,size:new Blob([file.text]).size,text:async()=>file.text}));
async function sample(){const {storage}=fixture();const text=await createFullBackup(storage,FIXED_NOW);return {text,files:await splitBackup(text,'测试',1024,100)};}
describe('分卷传输完整性',()=>{
  it('小备份不分卷，可直接识别完整JSON',async()=>{const {text}=await sample();const files=await splitBackup(text,'test');expect(files).toEqual([{name:'test.json',text}]);expect((await readBackupFiles(input(files))).multipart).toBe(false);});
  it('UTF-8跨分片仍完整恢复，任意顺序选卷均可',async()=>{const {files}=await sample();expect(files.length).toBeGreaterThan(1);const result=await readBackupFiles(input([...files].reverse()));expect(result.multipart).toBe(true);expect(result.backup.data.settings.dayStartHour).toBe(4);expect(result.backup.data.words).toHaveLength(5);});
  it('缺卷和重复卷拒绝，不提供部分恢复',async()=>{const {files}=await sample();await expect(readBackupFiles(input(files.slice(1)))).rejects.toThrow('缺失或重复');await expect(readBackupFiles(input([...files.slice(1),files[1]!]))).rejects.toThrow('缺失或重复');});
  it('混用两次导出或篡改组号拒绝',async()=>{const {files}=await sample();const changed=files.map((file,index)=>index===0?{...file,text:JSON.stringify({...JSON.parse(file.text),groupId:'another-export'})}:file);await expect(readBackupFiles(input(changed))).rejects.toThrow('同一套');});
  it('有效base64被篡改但长度相同，SHA256校验仍拒绝',async()=>{const {files}=await sample();const part=JSON.parse(files[0]!.text);part.payload=(part.payload[0]==='A'?'B':'A')+part.payload.slice(1);await expect(readBackupFiles(input([{...files[0]!,text:JSON.stringify(part)},...files.slice(1)]))).rejects.toThrow('校验失败');});
  it('伪造总大小在分配大缓冲区前拒绝',async()=>{const {files}=await sample();const changed=files.map((file)=>({...file,text:JSON.stringify({...JSON.parse(file.text),bytes:200*1024*1024})}));await expect(readBackupFiles(input(changed))).rejects.toThrow('大小有误');});
  it('不支持的格式、非法索引、未知字段、非JSON、超大单文件均拒绝',async()=>{const {files}=await sample();for(const patch of [{index:0},{total:99},{schemaVersion:99},{unknown:true},{payload:'!'}]){const changed=[{...files[0]!,text:JSON.stringify({...JSON.parse(files[0]!.text),...patch})},...files.slice(1)];await expect(readBackupFiles(input(changed))).rejects.toThrow();}await expect(readBackupFiles([{name:'bad',size:1,text:async()=>'{'}])).rejects.toThrow('JSON');await expect(readBackupFiles([{name:'huge',size:MAX_BACKUP_BYTES+1,text:async()=>''}])).rejects.toThrow('50MB');});
  it('普通文件不能多选、空选择与超过20卷拒绝',async()=>{const {text}=await sample();const normal=input([{name:'normal',text}]);await expect(readBackupFiles([...normal,...normal])).rejects.toThrow('一次只选择');await expect(readBackupFiles([])).rejects.toThrow('请选择');await expect(readBackupFiles(Array(21).fill(normal[0]!))).rejects.toThrow('20');});
  it('分卷大小非法和过多分卷拒绝',async()=>{const {text}=await sample();await expect(splitBackup(text,'x',0,1)).rejects.toThrow('大小无效');await expect(splitBackup(text,'x',1,1)).rejects.toThrow('数量');});
  it('二进制base64往返，超长与非法编码拒绝',()=>{const bytes=new Uint8Array([0,255,128,1,2]);expect(decodeBase64(encodeBase64(bytes),5)).toEqual(bytes);expect(()=>decodeBase64('a===',5)).toThrow();expect(()=>decodeBase64('AAAA',1)).toThrow();expect(()=>decodeBase64('bad!',5)).toThrow();});
});
