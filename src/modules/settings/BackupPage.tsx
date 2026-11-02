import { useRef,useState,type ChangeEvent } from 'react';
import { Card } from '../../components/Card';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Sheet } from '../../components/Sheet';
import { Icon } from '../../components/Icon';
import { useToast } from '../../components/Toast';
import { calendarDate,fmtTimestamp } from '../../lib/date';
import { countRecords,MAX_BACKUP_BYTES } from '../../lib/backup';
import { createFullBackup,importFullBackup,MAX_TRANSFER_BYTES,type ImportBackup } from '../../lib/fullBackup';
import { splitBackup,readBackupFiles,type TransferFile } from '../../lib/backupParts';
import { downloadBlob } from '../../lib/wallpaper';
import { useServices } from '../../app/services';
import { useSettingsStore } from './store';

export function BackupPage(){
  const {storage,reloadStores}=useServices();const lastBackupAt=useSettingsStore((state)=>state.settings.lastBackupAt);const update=useSettingsStore((state)=>state.update);const toast=useToast();const input=useRef<HTMLInputElement>(null);
  const [reading,setReading]=useState(false);const [pending,setPending]=useState<{name:string;backup:ImportBackup;multipart:boolean}>();const [generated,setGenerated]=useState<{files:TransferFile[];at:string}>();const [downloaded,setDownloaded]=useState<Set<string>>(new Set());const marked=useRef(false);const [revision,setRevision]=useState(0);const current=storage.readDatabase();
  const markExport=(at:string)=>{if(marked.current)return;try{update({lastBackupAt:at});marked.current=true;toast('备份文件已生成，请确认已保存');}catch{toast('备份已生成，但备份时间未能保存。请确认文件已保存。',true);}};
  const exportFile=async()=>{if(reading)return;setReading(true);marked.current=false;try{
    const now=new Date();const text=await createFullBackup(storage,now);const name=`个人工作台-备份-${calendarDate(now)}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;
    const files=await splitBackup(text,name);if(files.length===1){downloadBlob(new Blob([files[0]!.text],{type:'application/json;charset=utf-8'}),files[0]!.name);markExport(now.toISOString());}
    else{setDownloaded(new Set());setGenerated({files,at:now.toISOString()});}
  }catch(error){toast(error instanceof Error?error.message:'导出失败',true);}finally{setReading(false);}};
  const readFiles=async(event:ChangeEvent<HTMLInputElement>)=>{const files=Array.from(event.target.files??[]);event.target.value='';if(!files.length)return;setReading(true);try{setPending(await readBackupFiles(files));}catch(error){toast(error instanceof Error?error.message:'无法读取文件',true);}finally{setReading(false);}};
  return <><div className="page-heading"><p className="eyebrow">给自己的记录，留一份底</p><h1>数据备份</h1><p>换设备、清理浏览器前，先把记录带走。</p></div>
    <div className="dashboard-grid" data-revision={revision}>
      <Card title="导出一份备份" subtitle="记录、设置、报销凭证与当前壁纸，一起保存" className="lg:col-span-2"><div className="flex items-start gap-4"><span className="feature-icon h-14 w-14 shrink-0"><Icon name="backup" width="28" height="28"/></span><div><p className="font-medium">上次导出</p><p className="mt-1 text-muted">{fmtTimestamp(lastBackupAt)}</p><p className="mt-3 text-caption text-muted">文件会保存到浏览器下载位置；请确认已经保存成功。</p></div></div><button className="btn btn-primary mt-7 w-full sm:w-auto" onClick={()=>void exportFile()} disabled={reading}><Icon name="backup" width="19" height="19"/>{reading?'正在处理备份…':'导出 JSON 备份'}</button></Card>
      <Card title="从备份恢复" className="self-start"><p className="leading-7 text-muted">选择一个完整 JSON，或一次选择同一套备份的全部分卷。确认前会先校验文件，恢复前保留本机快照。</p><input ref={input} type="file" multiple accept=".json,application/json" className="sr-only" tabIndex={-1} aria-label="选择 JSON 备份文件" onChange={(event)=>void readFiles(event)}/><button className="btn btn-secondary mt-6 w-full" onClick={()=>input.current?.click()} disabled={reading}><Icon name="upload" width="19" height="19"/>{reading?'正在检查文件…':'选择备份文件'}</button></Card>
      <Card title="当前保存的内容" subtitle="学习进度、内置内容和训练计划也包含在备份中" className="lg:col-span-2"><dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">{([
        ['日程',current.schedule.length],['待办',current.todos.length],['重要事项',current.importantItems.length],['习惯',current.habits.length],['动作',current.exercises.length],['单词',current.words.length],['学习进度',current.wordProgress.length],['每日学习队列',current.studyQueue.length],['语法错题',current.mistakes.length],['报账记录',current.expenses.length],['凭证图片',current.receipts.length],['工作复盘',current.reports.length],['模板',current.templates.length],['当前壁纸',current.settings.appearance?.wallpaper?1:0],
      ] as const).map(([label,value])=><div key={label}><dt className="text-caption text-muted">{label}</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{value}<span className="ml-1.5 text-caption font-normal text-muted">项</span></dd></div>)}</dl><p className="mt-6 border-t border-line pt-4 text-caption text-muted">最后修改：{fmtTimestamp(storage.meta()?.lastModifiedAt)}</p></Card>
      <Card title="完整备份与分卷" className="self-start bg-amber-soft/50"><Icon name="shield" className="mb-4 text-amber"/><p className="leading-7 text-muted">新版 JSON 包含全部工作台记录、凭证压缩图和缩略图，以及当前使用的壁纸图片或视频。媒体只在文件和本机图片库中，不写入浏览器文字存储。</p><p className="mt-3 text-caption leading-6 text-amber">超过 50MB 会提示分卷，每卷逐个下载，恢复时必须选齐同一套文件；缺卷、混卷或损坏均不覆盖原记录。一次总量上限 200MB。</p><p className="mt-3 text-caption leading-6 text-muted">旧版 structured/receipts 备份仍可恢复，旧文件不含的壁纸需单独导入。临时跟读录音不在备份中，需要保留请关闭前下载。</p></Card>
    </div>
    <Sheet open={!!generated} title="超过 50MB，请分卷保存" onClose={()=>setGenerated(undefined)} footer={<button className="btn btn-secondary w-full" onClick={()=>setGenerated(undefined)}>关闭下载列表</button>}><p className="leading-7 text-muted">这套备份共 {generated?.files.length} 卷，请逐个下载并放在同一文件夹。恢复时一次选择全部文件。再次导出会生成另一套，不能混用。</p><div className="mt-4 space-y-3">{generated?.files.map((file,index)=><div key={file.name} className="rounded-btn border border-line p-3"><p className="break-all text-caption text-muted">{file.name}</p><button className="btn btn-secondary mt-2 w-full" onClick={()=>{downloadBlob(new Blob([file.text],{type:'application/json;charset=utf-8'}),file.name);const next=new Set(downloaded).add(file.name);setDownloaded(next);if(next.size===generated.files.length)markExport(generated.at);}}>{downloaded.has(file.name)?'已发起下载 · 再下载':`下载第 ${index+1} 卷`}</button></div>)}</div><p role="status" className="mt-4 text-caption text-brand-strong">已发起 {downloaded.size}/{generated?.files.length??0} 卷下载{downloaded.size===generated?.files.length?'，请确认每卷均已保存。':'，全部下载后才更新上次备份时间。'}</p></Sheet>
    <ConfirmDialog open={!!pending} title="恢复这份备份？" confirmLabel="确认恢复" onClose={()=>setPending(undefined)} onConfirm={async()=>{if(!pending)return;setReading(true);try{await importFullBackup(storage,pending.backup,new Date(),undefined,undefined,undefined,undefined,pending.multipart?MAX_TRANSFER_BYTES:MAX_BACKUP_BYTES);reloadStores();setRevision((value)=>value+1);toast(pending.backup.scope==='complete'?'完整备份已恢复，记录与媒体已更新':'旧版备份已恢复；未包含的壁纸请单独导入');}finally{setReading(false);}}}>
      {pending&&<div className="space-y-3 text-muted"><p className="break-all font-medium text-ink">{pending.name}</p><p>导出于 {fmtTimestamp(pending.backup.exportedAt)}，共 {countRecords(pending.backup.data)} 条记录，包含 {pending.backup.data.receipts.length} 张凭证{pending.backup.scope==='complete'&&pending.backup.wallpaper?'与当前壁纸文件':''}。</p><p>恢复会替换当前记录和设置。写入前先保存快照，失败会回滚；取消不会写入。</p></div>}
    </ConfirmDialog>
  </>;
}
