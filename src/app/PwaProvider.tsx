import { createContext,useCallback,useContext,useEffect,useRef,useState,type ReactNode } from 'react';
import { Card } from '../components/Card';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface InstallEvent extends Event {prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>}
interface PwaState {portable:boolean;version:string;online:boolean;ready:boolean;installed:boolean;checking:boolean;waiting:boolean;canInstall:boolean;message:string;check:()=>Promise<void>;install:()=>Promise<void>;update:()=>void}
const PwaContext=createContext<PwaState|null>(null);
export const usePwa=()=>{const state=useContext(PwaContext);if(!state)throw new Error('应用状态尚未初始化');return state;};
export function PwaProvider({children}:{children:ReactNode}){
  const portable=__WB_PORTABLE__;const version=document.querySelector('meta[name=wb-build]')?.getAttribute('content')??(portable?'便携版':'开发预览');
  const [online,setOnline]=useState(navigator.onLine);const [ready,setReady]=useState(false);const [waiting,setWaiting]=useState(false);const [checking,setChecking]=useState(false);
  const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||(navigator as Navigator&{standalone?:boolean}).standalone===true;
  const [installed,setInstalled]=useState(standalone);const [canInstall,setCanInstall]=useState(false);const [message,setMessage]=useState('');const registration=useRef<ServiceWorkerRegistration>();const prompt=useRef<InstallEvent>();const reload=useRef(false);
  const probe=useCallback(async(repair=false)=>{
    const worker=registration.current?.active;if(!worker)return false;
    const channel=new MessageChannel();let timer:number|undefined;
    const cached=await new Promise<boolean>((resolve)=>{timer=window.setTimeout(()=>resolve(false),repair?15000:4000);channel.port1.onmessage=(event)=>resolve(event.data?.ready===true);worker.postMessage({type:'CACHE_STATUS',repair},[channel.port2]);});
    clearTimeout(timer);channel.port1.close();setReady(cached);navigator.serviceWorker.controller?.postMessage({type:'APP_READY',version});return cached;
  },[version]);
  useEffect(()=>{
    const connection=()=>setOnline(navigator.onLine);window.addEventListener('online',connection);window.addEventListener('offline',connection);
    if(portable||!import.meta.env.PROD){setMessage(portable?'便携版不启用安装与离线缓存；请定期导出备份。':'开发预览不启用离线缓存，安装请使用生产版。');return ()=>{window.removeEventListener('online',connection);window.removeEventListener('offline',connection);};}
    if(!window.isSecureContext||!('serviceWorker' in navigator)){setMessage('安装与离线使用需要 HTTPS，以及支持 PWA 的浏览器。');return ()=>{window.removeEventListener('online',connection);window.removeEventListener('offline',connection);};}
    let alive=true;let lastCheck=Date.now();let observed:ServiceWorkerRegistration|undefined;
    const markWaiting=()=>{if(alive)setWaiting(!!registration.current?.waiting);};
    const watch=()=>{const worker=registration.current?.installing;if(!worker)return;let activated=worker.state==='activated';worker.addEventListener('statechange',()=>{if(!alive)return;if(worker.state==='installed')markWaiting();if(worker.state==='activated'){activated=true;void probe();}if(worker.state==='redundant'&&!activated)setMessage('离线资源尚未准备好，请联网后重新检查。');});};
    const changed=()=>{if(reload.current){window.location.reload();return;}void probe();};
    const visible=()=>{if(document.visibilityState==='visible'){void probe();if(navigator.onLine&&Date.now()-lastCheck>60000){lastCheck=Date.now();void registration.current?.update().catch(()=>undefined);}}};
    const beforeInstall=(event:Event)=>{event.preventDefault();prompt.current=event as InstallEvent;setCanInstall(true);};
    const appInstalled=()=>{setInstalled(true);setCanInstall(false);prompt.current=undefined;};
    navigator.serviceWorker.addEventListener('controllerchange',changed);window.addEventListener('beforeinstallprompt',beforeInstall);window.addEventListener('appinstalled',appInstalled);document.addEventListener('visibilitychange',visible);window.addEventListener('focus',visible);
    const base=new URL(import.meta.env.BASE_URL,window.location.href);
    void navigator.serviceWorker.register(new URL('sw.js',base),{scope:base.pathname,updateViaCache:'none'}).then((reg)=>{if(!alive)return;registration.current=reg;observed=reg;reg.addEventListener('updatefound',watch);watch();markWaiting();void probe();}).catch(()=>{if(alive)setMessage('离线资源准备失败，现有记录保留；请联网后重新打开。');});
    return ()=>{alive=false;observed?.removeEventListener('updatefound',watch);window.removeEventListener('online',connection);window.removeEventListener('offline',connection);navigator.serviceWorker.removeEventListener('controllerchange',changed);window.removeEventListener('beforeinstallprompt',beforeInstall);window.removeEventListener('appinstalled',appInstalled);document.removeEventListener('visibilitychange',visible);window.removeEventListener('focus',visible);};
  },[portable,probe]);
  const check=async()=>{if(!navigator.onLine){setMessage('当前离线，联网后再检查更新；本机记录可以继续使用。');return;}if(!registration.current){setMessage(portable?'便携版不检查更新，请使用正式 HTTPS 网址。':'尚未建立离线缓存，请使用 HTTPS 生产版并重新打开。');return;}setChecking(true);try{await registration.current.update();const cached=await probe(true);setWaiting(!!registration.current.waiting);setMessage(cached?'已检查更新；如有新版，准备完成后会显示更新提示。':'离线资源尚未准备好，请检查网络与存储空间后重试。');}catch{setMessage('暂时无法检查更新，当前版本和记录保留，请稍后重试。');}finally{setChecking(false);}};
  const install=async()=>{if(!prompt.current)return;try{await prompt.current.prompt();const choice=await prompt.current.userChoice;if(choice.outcome==='accepted')setMessage('已发起安装，请查看桌面或浏览器应用列表。');}catch{setMessage('安装未完成，可用浏览器菜单中的“安装应用”或“添加到主屏幕”。');}finally{prompt.current=undefined;setCanInstall(false);}};
  const update=()=>{const worker=registration.current?.waiting;if(!worker){setWaiting(false);setMessage('新版还未准备好，请稍后检查。');return;}reload.current=true;worker.postMessage({type:'SKIP_WAITING'});};
  return <PwaContext.Provider value={{portable,version,online,ready,installed,checking,waiting,canInstall,message,check,install,update}}>{children}</PwaContext.Provider>;
}
export function PwaNotice(){
  const state=usePwa();const [confirm,setConfirm]=useState(false);const [dismissed,setDismissed]=useState(false);
  if(!state.portable&&state.online&&!state.waiting)return null;
  return <>{(!dismissed||state.waiting)&&<div className="mx-auto mb-5 flex max-w-[1400px] flex-wrap items-center justify-between gap-3 rounded-btn border border-line bg-brand-soft p-4 text-caption text-brand-strong" role="status"><p>{state.waiting?'新版已准备好，保存手头内容后再更新。':state.portable?'便携单文件版：保存能力由浏览器决定，请定期导出备份。':state.ready?'当前离线，已缓存页面可继续使用，记录保存在本机。':'当前离线；此设备尚未完成离线准备，请联网打开一次。'}</p><div className="flex gap-2">{state.waiting?<button className="btn btn-primary" onClick={()=>setConfirm(true)}>更新并重新打开</button>:<button className="btn btn-secondary" onClick={()=>setDismissed(true)}>知道了</button>}</div></div>}
    <ConfirmDialog open={confirm} title="现在更新工作台？" confirmLabel="更新并重开" onClose={()=>setConfirm(false)} onConfirm={state.update}><p className="leading-7 text-muted">这会重新载入当前页面。已保存的记录和图片会保留；请先保存尚未提交的表单、下载想保留的临时录音。也可以取消，等收工后再更新。</p></ConfirmDialog>
  </>;
}
export function PwaSettings(){const state=usePwa();return <Card title="安装与离线使用" subtitle={state.portable?'便携版':`当前版本 ${state.version}`} className="lg:col-span-3"><div className="flex flex-wrap items-center gap-3"><span className="rounded-pill bg-brand-soft px-3 py-2 text-caption text-brand-strong">{state.portable?'单文件打开':state.installed?'已安装到设备':state.ready?'离线页面已准备好':'离线页面尚未就绪'}</span>{state.canInstall&&!state.installed&&<button className="btn btn-primary" onClick={()=>void state.install()}>安装到桌面</button>}<button className="btn btn-secondary" disabled={state.checking||state.portable} onClick={()=>void state.check()}>{state.checking?'正在检查…':'检查更新'}</button></div>{state.message&&<p role="status" className="mt-3 text-caption leading-6 text-muted">{state.message}</p>}
    <details className="mt-4 rounded-btn bg-canvas p-4"><summary className="min-h-11 cursor-pointer py-2 font-medium">手机上怎样加到桌面</summary><ol className="list-decimal space-y-3 pl-5 pt-3 text-caption leading-7 text-muted"><li>先用固定的正式 HTTPS 网址打开，等待显示“离线页面已准备好”。</li><li>iPhone：用 Safari 打开，点分享，再选“添加到主屏幕”。安卓：用 Chrome/Edge 菜单中的“安装应用”或“添加到主屏幕”；具体名称以浏览器为准。</li><li>从桌面图标重新打开，再开飞行模式并刷新，核对计划、训练、学习和图片仍可用。第一次访问必须联网。</li><li>电脑与手机的数据独立。换设备先导出 JSON，在新设备导入；朗读需要系统本机英语语音包。</li></ol></details>
  </Card>;}
