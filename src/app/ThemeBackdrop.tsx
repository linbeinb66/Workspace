import { useEffect, useRef, useState } from 'react';
import { defaultAppearance,glassSettings } from '../domain/appearance';
import { wallpaperFiles } from '../lib/wallpaper';
import { useSettingsStore } from '../modules/settings/store';
import { useToast } from '../components/Toast';
export function ThemeBackdrop(){
  const stored=useSettingsStore((state)=>state.settings.appearance);const appearance=stored??defaultAppearance;const key=appearance.wallpaper?.key;const toast=useToast();
  const glass=glassSettings(appearance);const mediaBlur=appearance.wallpaper?.kind==='video'?glass.videoBlur:appearance.blur;
  const mediaStyle={filter:mediaBlur?`blur(${mediaBlur}px)`:'none',inset:mediaBlur?'-2%':'0',width:mediaBlur?'104%':'100%',height:mediaBlur?'104%':'100%'};
  const [resource,setResource]=useState({key:'',url:''});const url=resource.key===key?resource.url:'';const [blocked,setBlocked]=useState(false);const [failed,setFailed]=useState(false);const video=useRef<HTMLVideoElement>(null);
  useEffect(()=>{document.documentElement.dataset.palette=appearance.palette;document.documentElement.dataset.backdrop=key?'wallpaper':appearance.backdrop;const color=getComputedStyle(document.documentElement).getPropertyValue('--color-canvas').trim();document.querySelector('meta[name="theme-color"]')?.setAttribute('content',`rgb(${color})`);},[appearance.palette,appearance.backdrop,key]);
  useEffect(()=>{const root=document.documentElement;root.dataset.wallpaperMode=glass.mode;root.style.setProperty('--glass-opacity',String(glass.opacity));root.style.setProperty('--glass-filter',glass.blur?`blur(${glass.blur}px)`:'none');},[glass.mode,glass.opacity,glass.blur]);
  useEffect(()=>{
    let active=true;let objectUrl='';setResource({key:'',url:''});setFailed(false);setBlocked(false);
    if(key)void wallpaperFiles.get(key).then((blob)=>{if(!active)return;if(!blob){toast('壁纸文件不在这台设备，请到主题与壁纸重新导入',true);return;}objectUrl=URL.createObjectURL(blob);setResource({key,url:objectUrl});}).catch(()=>{if(active)toast('无法读取壁纸文件，请检查浏览器存储权限',true);});
    return()=>{active=false;if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[key,toast]);
  useEffect(()=>{
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');let active=true;const node=video.current;
    const apply=()=>{if(!node)return;if(document.hidden||media.matches||!appearance.motion||failed){node.pause();setBlocked(false);return;}void node.play().then(()=>{if(!active)return;if(document.hidden||media.matches||!appearance.motion)node.pause();else setBlocked(false);}).catch(()=>{if(active&&!document.hidden&&appearance.motion&&!media.matches)setBlocked(true);});};
    apply();document.addEventListener('visibilitychange',apply);media.addEventListener('change',apply);
    return()=>{active=false;node?.pause();document.removeEventListener('visibilitychange',apply);media.removeEventListener('change',apply);};
  },[url,appearance.motion,failed]);
  const onError=()=>{setFailed(true);toast('壁纸无法显示，请换用当前浏览器支持的图片或视频',true);};
  return <><div className="theme-backdrop" aria-hidden="true">{url&&!failed&&(appearance.wallpaper?.kind==='video'?<video id="wallpaper-video" ref={video} src={url} muted loop playsInline preload="auto" onError={onError} style={mediaStyle}/>:<img src={url} alt="" onError={onError} style={mediaStyle}/>)}{url&&<div className="theme-scrim" style={{opacity:appearance.dim}}/>}</div>{blocked&&!failed&&appearance.motion&&<button className="btn btn-secondary fixed right-4 top-20 z-40 shadow-card" onClick={()=>{void video.current?.play().then(()=>setBlocked(false)).catch(()=>toast('浏览器暂时不允许播放，请尝试其他视频',true));}}>点击播放壁纸</button>}</>;
}
