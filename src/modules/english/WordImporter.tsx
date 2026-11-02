import { useRef,useState,type ChangeEvent } from 'react';
import { Card } from '../../components/Card';
import { Sheet } from '../../components/Sheet';
import { useToast } from '../../components/Toast';
import { parseWordCsv } from '../../domain/wordCsv';
import { downloadBlob } from '../../lib/wallpaper';
import { previewWords,useEnglishStore } from './store';

export function WordImporter(){
  const words=useEnglishStore((state)=>state.words);const importCsv=useEnglishStore((state)=>state.importCsv);const input=useRef<HTMLInputElement>(null);const toast=useToast();
  const [pending,setPending]=useState<{text:string;name:string}>();const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const preview=pending?previewWords(parseWordCsv(pending.text),words):undefined;
  const pick=async(event:ChangeEvent<HTMLInputElement>)=>{const file=event.target.files?.[0];event.target.value='';if(!file)return;setBusy(true);setError('');
    try{if(file.size>2*1024*1024)throw new Error('词库文件超过 2MB，请分批导入');const text=await file.text();parseWordCsv(text);setPending({text,name:file.name});}
    catch(reason){setError(reason instanceof Error?reason.message:'读取失败，请选择 UTF-8 CSV 文件');}finally{setBusy(false);}};
  return <><Card title="英语词库" subtitle={`当前 ${words.length} 个词条 · 可导入自己的词汇`} className="lg:col-span-3"><p className="text-muted leading-7">选择 UTF-8 CSV 文件，先预览再加入。相同英文（忽略大小写与首尾空格）会跳过，保留已有释义和进度。新词追加到词库末尾，当天计划保持不变。</p>
    <code className="mt-3 block break-all rounded-btn bg-canvas p-3 text-caption">word,phonetic,pos,cn,example,exampleCn</code><p className="mt-2 text-caption text-muted">表头六列固定，英文和中文释义必填，其余可留空。一次最多 2000 条、2MB。</p>
    <div className="mt-4 flex flex-wrap gap-3"><button className="btn btn-primary" disabled={busy} onClick={()=>input.current?.click()}>{busy?'正在读取…':'导入词库 CSV'}</button><button className="btn btn-secondary" onClick={()=>downloadBlob(new Blob(['\uFEFFword,phonetic,pos,cn,example,exampleCn\r\npodcast,/ˈpɑːdkæst/,n.,播客,I listen to a podcast.,我听一档播客。\r\nschedule,/ˈskedʒuːl/,n.,时间表,Check the schedule.,核对时间表。\r\n'],{type:'text/csv;charset=utf-8'}),'词库导入示例.csv')}>下载 CSV 示例</button></div>
    <input ref={input} type="file" id="word-csv" className="hidden" accept=".csv,text/csv" onChange={(event)=>void pick(event)}/>{error&&<p role="alert" className="mt-3 text-danger">{error}</p>}
  </Card><Sheet open={!!pending} title="确认加入词库" onClose={()=>setPending(undefined)} footer={<div className="grid grid-cols-2 gap-3"><button className="btn btn-secondary" onClick={()=>setPending(undefined)}>取消</button><button className="btn btn-primary" disabled={!preview?.added.length} onClick={()=>{if(!pending)return;try{const result=importCsv(pending.text);setPending(undefined);toast(`已加入 ${result.added} 个新词，跳过 ${result.skipped} 个重复词`);}catch(reason){toast(reason instanceof Error?reason.message:'导入失败',true);}}}>确认加入 {preview?.added.length??0} 个词</button></div>}>
    <p className="break-all text-muted">{pending?.name}</p><p className="mt-3">新增 <strong>{preview?.added.length??0}</strong> 个，跳过重复 <strong>{preview?.skipped??0}</strong> 个。</p><ul className="mt-4 divide-y divide-line">{preview?.added.slice(0,10).map((word)=><li key={word.word} className="py-3"><span lang="en" className="font-semibold">{word.word}</span><span className="ml-3 text-muted">{word.cn}</span></li>)}</ul>{(preview?.added.length??0)>10&&<p className="text-caption text-muted">仅展示前 10 个词，确认后加入全部新词。</p>}<p className="mt-3 text-caption text-muted">当前词库会保留，今天已经生成的计划和学习进度不变。</p>
  </Sheet></>;
}
