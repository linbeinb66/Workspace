import { createStore,get,setMany,delMany,clear,keys } from 'idb-keyval';
import type { ReceiptImage } from '../types';
import { id } from './id';
export interface ReceiptPort {get:(key:string)=>Promise<Blob|undefined>;setMany:(entries:[string,Blob][])=>Promise<void>;removeMany:(keys:string[])=>Promise<void>;keys:()=>Promise<string[]>;clear:()=>Promise<void>}
let database:ReturnType<typeof createStore>|undefined;
const db=()=>database??=createStore('wb-receipts','files');
export const receiptFiles:ReceiptPort={get:(key)=>get<Blob>(key,db()),setMany:(entries)=>setMany(entries,db()),removeMany:(keys)=>delMany(keys,db()),keys:async()=>(await keys(db())).filter((key):key is string=>typeof key==='string'),clear:()=>clear(db())};
export async function removeReceiptCopies(media:ReceiptPort,removed:ReceiptImage[]):Promise<void>{if(!removed.length)return;const all=await media.keys();await media.removeMany(all.filter((key)=>removed.some((entry)=>key===entry.key||key===entry.thumbKey||key===`receipt/${entry.id}`||key.startsWith(`receipt/${entry.id}/`))));}
export const MAX_RECEIPT_BYTES=300*1024;
export interface PreparedReceipt {meta:ReceiptImage;image:Blob;thumb:Blob}
function loadImage(url:string):Promise<HTMLImageElement>{return new Promise((resolve,reject)=>{const image=new Image();const timer=window.setTimeout(()=>{image.src='';reject(new Error('图片读取超时，请换一张图片'));},15000);image.onload=()=>{clearTimeout(timer);resolve(image);};image.onerror=()=>{clearTimeout(timer);reject(new Error('图片无法读取，请使用 JPG、PNG、WebP 或 AVIF'));};image.src=url;});}
const jpeg=(canvas:HTMLCanvasElement,quality:number)=>new Promise<Blob>((resolve,reject)=>canvas.toBlob((blob)=>blob?resolve(blob):reject(new Error('图片压缩失败，请重试')),'image/jpeg',quality));
export async function prepareReceipt(file:File):Promise<PreparedReceipt>{
  if(!/\.(jpe?g|png|webp|avif)$/i.test(file.name)||file.size>20*1024*1024||file.size===0)throw new Error('请选择 20MB 以内的 JPG、PNG、WebP 或 AVIF 图片；HEIC 请先转成 JPG');
  const url=URL.createObjectURL(file);
  try{const image=await loadImage(url);if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>80000000)throw new Error('图片尺寸过大，请先缩小再上传');
    const canvas=document.createElement('canvas');const context=canvas.getContext('2d');if(!context)throw new Error('当前浏览器无法压缩图片');
    const scale=Math.min(1,1280/Math.max(image.naturalWidth,image.naturalHeight));let width=Math.max(1,Math.round(image.naturalWidth*scale));let height=Math.max(1,Math.round(image.naturalHeight*scale));let blob:Blob|undefined;
    for(let attempt=0;attempt<14;attempt++){canvas.width=width;canvas.height=height;context.fillStyle='#fff';context.fillRect(0,0,width,height);context.drawImage(image,0,0,width,height);blob=await jpeg(canvas,Math.max(.35,.8-attempt*.15));if(blob.size<=MAX_RECEIPT_BYTES)break;width=Math.max(1,Math.round(width*.8));height=Math.max(1,Math.round(height*.8));}
    if(!blob||blob.size>MAX_RECEIPT_BYTES)throw new Error('图片无法压至 300KB 以内，请换一张较小的图片');
    const thumbScale=Math.min(1,200/Math.max(width,height));canvas.width=Math.max(1,Math.round(width*thumbScale));canvas.height=Math.max(1,Math.round(height*thumbScale));context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);const thumb=await jpeg(canvas,.75);const rid=id();
    return {meta:{id:rid,key:`receipt/${rid}`,thumbKey:`receipt/${rid}/thumb`,width,height,size:blob.size,demo:false,updatedAt:new Date().toISOString()},image:blob,thumb};
  }finally{URL.revokeObjectURL(url);}
}
export async function validateReceiptBlob(blob:Blob,width:number,height:number):Promise<void>{const url=URL.createObjectURL(blob);try{const image=await loadImage(url);if(image.naturalWidth!==width||image.naturalHeight!==height)throw new Error('备份图片尺寸与记录不一致，原有数据未被覆盖');}finally{URL.revokeObjectURL(url);}}
