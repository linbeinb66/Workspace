import { createStore, get, set, del, clear, keys } from 'idb-keyval';
import { wallpaperFormat } from '../domain/appearance';
import { id } from './id';
import type { Appearance } from '../types';
export interface WallpaperPort {get:(key:string)=>Promise<Blob|undefined>;set:(key:string,file:Blob)=>Promise<void>;remove:(key:string)=>Promise<void>;keys:()=>Promise<string[]>;clear:()=>Promise<void>}
const files=createStore('wb-wallpapers','files');
export const wallpaperFiles:WallpaperPort={get:(key:string)=>get<Blob>(key,files),set:(key:string,file:Blob)=>set(key,file,files),remove:(key:string)=>del(key,files),clear:()=>clear(files),keys:async()=>(await keys(files)).filter((key):key is string=>typeof key==='string')};
export async function verifyWallpaper(file:File){
  const format=wallpaperFormat(file);const url=URL.createObjectURL(file);
  try{await new Promise<void>((resolve,reject)=>{
    const timer=window.setTimeout(()=>{cleanup();reject(new Error('壁纸解码超时，请尝试较小的文件'));},12000);
    const media=format.kind==='video'?document.createElement('video'):new Image();
    const cleanup=()=>{window.clearTimeout(timer);media.onload=null;media.onerror=null;if(media instanceof HTMLVideoElement){media.onloadeddata=null;media.pause();media.removeAttribute('src');media.load();}};
    const good=()=>{cleanup();resolve();};const bad=()=>{cleanup();reject(new Error('浏览器无法读取此图片或视频编码，请改用 JPG/PNG 或 H.264 MP4/WebM'));};
    media.onerror=bad;if(media instanceof HTMLVideoElement){media.preload='auto';media.muted=true;media.onloadeddata=good;}else media.onload=good;media.src=url;
  });}finally{URL.revokeObjectURL(url);}
  return format;
}
export async function installWallpaper(file:File,commit:(wallpaper:NonNullable<Appearance['wallpaper']>)=>void){
  const format=await verifyWallpaper(file);const key=`wallpaper-${id()}`;
  await wallpaperFiles.set(key,file.slice(0,file.size,format.mime));
  try{commit({key,name:file.name,kind:format.kind,size:file.size,type:format.mime});}
  catch(error){await wallpaperFiles.remove(key).catch(()=>undefined);throw error;}
}
export function downloadBlob(blob:Blob,name:string){const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);}
