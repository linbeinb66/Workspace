import { useEffect,useState } from 'react';
import { receiptFiles } from '../../lib/receipt';
export function ReceiptThumb({fileKey,blob,full=false,onClick}:{fileKey:string;blob?:Blob;full?:boolean;onClick?:()=>void}){
  const [resource,setResource]=useState({key:'',url:'',failed:false});
  useEffect(()=>{let active=true;let url='';setResource({key:fileKey,url:'',failed:false});void (blob?Promise.resolve(blob):receiptFiles.get(fileKey)).then((file)=>{if(!active)return;if(!file){setResource({key:fileKey,url:'',failed:true});return;}url=URL.createObjectURL(file);setResource({key:fileKey,url,failed:false});}).catch(()=>{if(active)setResource({key:fileKey,url:'',failed:true});});return()=>{active=false;if(url)URL.revokeObjectURL(url);};},[fileKey,blob]);
  const current=resource.key===fileKey?resource:null;const content=current?.url?<img src={current.url} alt={full?'凭证大图':'凭证缩略图'} className={full?'mx-auto max-h-[65dvh] max-w-full object-contain':'h-16 w-16 rounded-btn object-cover'} loading={full?'eager':'lazy'}/>:<span className="flex h-16 w-16 items-center justify-center rounded-btn bg-canvas p-1 text-center text-caption text-muted">{current?.failed?'图片缺失':'读取中'}</span>;
  return onClick?<button className="min-h-11 min-w-11" aria-label="查看凭证大图" onClick={onClick}>{content}</button>:content;
}
