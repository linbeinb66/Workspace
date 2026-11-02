import type { Appearance } from '../types';
export const defaultAppearance: Appearance = {palette:'forest',backdrop:'plain',dim:0.65,blur:0,motion:true};
export function glassSettings(appearance: Appearance) {
  const mode=appearance.renderMode??'balanced';
  const configured=appearance.glassBlur??12;
  return { mode,opacity:appearance.glassOpacity??0.54,configuredBlur:configured,
    blur:Math.min(configured,mode==='smooth'?4:mode==='balanced'?8:20),
    videoBlur:mode==='smooth'?0:appearance.blur };
}
export const MAX_WALLPAPER_BYTES=30*1024*1024;
export function wallpaperFormat(file:{name:string;type:string;size:number}):{kind:'image'|'video';mime:string}{
  if(file.size<=0)throw new Error('文件是空的，请重新选择');
  if(file.size>MAX_WALLPAPER_BYTES)throw new Error('壁纸超过30MB，请选较小的图片或压缩视频后再导入');
  const ext=file.name.split('.').at(-1)?.toLowerCase()??'';
  const formats:Record<string,string>={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',avif:'image/avif',mp4:'video/mp4',webm:'video/webm'};
  const mime=formats[ext];
  if(!mime||file.type&&file.type!==mime)throw new Error('请选择 JPG、PNG、WebP、AVIF 图片或 MP4、WebM 视频。Wallpaper Engine 的 pkg/mpkg 场景包和创意工坊链接不能直接导入，请先准备图片或录制视频。');
  return {kind:mime.startsWith('video/')?'video':'image',mime};
}
