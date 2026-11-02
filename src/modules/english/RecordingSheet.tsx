import { useEffect,useRef,useState } from 'react';
import type { Sentence } from '../../types';
import { Sheet } from '../../components/Sheet';
import { downloadBlob } from '../../lib/wallpaper';

export function RecordingSheet({sentence,onClose}:{sentence:Sentence;onClose:()=>void}){
  const [status,setStatus]=useState<'idle'|'asking'|'recording'|'ready'>('idle');const [error,setError]=useState('');const [seconds,setSeconds]=useState(0);const [audio,setAudio]=useState<{blob:Blob;url:string}>();
  const recorder=useRef<MediaRecorder>();const stream=useRef<MediaStream>();const active=useRef(true);const generation=useRef(0);const timer=useRef<number>();const url=useRef<string>();
  const stop=()=>{if(recorder.current?.state==='recording')recorder.current.stop();stream.current?.getTracks().forEach((track)=>track.stop());window.clearInterval(timer.current);};
  useEffect(()=>{active.current=true;const hidden=()=>{if(document.visibilityState==='hidden')stop();};document.addEventListener('visibilitychange',hidden);
    return ()=>{active.current=false;generation.current++;stop();if(url.current)URL.revokeObjectURL(url.current);document.removeEventListener('visibilitychange',hidden);};},[]);
  const start=async()=>{
    if(status==='asking'||status==='recording')return;setError('');
    if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){setError('录音需要 HTTPS 或 localhost，以及支持录音的浏览器。你仍可以朗读并手动勾选完成。');return;}
    const token=++generation.current;setStatus('asking');
    try{const source=await navigator.mediaDevices.getUserMedia({audio:true});if(!active.current||generation.current!==token||document.visibilityState==='hidden'){source.getTracks().forEach((track)=>track.stop());if(active.current)setStatus(audio?'ready':'idle');return;}
      stream.current=source;const mime=['audio/webm;codecs=opus','audio/webm','audio/mp4'].find((type)=>MediaRecorder.isTypeSupported(type));
      const current=new MediaRecorder(source,mime?{mimeType:mime}:undefined);recorder.current=current;const chunks:Blob[]=[];let bytes=0;
      current.ondataavailable=(event)=>{if(event.data.size){chunks.push(event.data);bytes+=event.data.size;if(bytes>5*1024*1024&&current.state==='recording')stop();}};
      current.onstop=()=>{source.getTracks().forEach((track)=>track.stop());window.clearInterval(timer.current);if(!active.current||generation.current!==token)return;
        const blob=new Blob(chunks,{type:current.mimeType||'audio/webm'});if(!blob.size||blob.size>5*1024*1024){setError('录音为空或超过 5MB，请重新录制短句。');setStatus(audio?'ready':'idle');return;}
        if(url.current)URL.revokeObjectURL(url.current);url.current=URL.createObjectURL(blob);setAudio({blob,url:url.current});setStatus('ready');};
      current.onerror=()=>{stop();if(active.current){setError('录音被浏览器中断，请重试。');setStatus('idle');}};
      current.start(500);setStatus('recording');setSeconds(0);const started=performance.now();timer.current=window.setInterval(()=>{const elapsed=Math.floor((performance.now()-started)/1000);setSeconds(elapsed);if(elapsed>=60)stop();},250);
    }catch(reason){stream.current?.getTracks().forEach((track)=>track.stop());if(active.current&&generation.current===token){setStatus(audio?'ready':'idle');setError(reason instanceof DOMException&&['NotAllowedError','PermissionDeniedError'].includes(reason.name)?'麦克风权限未开启，请在浏览器地址栏允许麦克风后重试。':'暂时无法使用麦克风，请检查设备是否连接、是否被其他应用占用。');}}
  };
  return <Sheet open title="录一遍，听听自己" onClose={onClose}><p lang="en" className="text-lg leading-relaxed">{sentence.en}</p><p className="mt-2 text-muted">{sentence.cn}</p><p className="mt-5 text-caption text-muted">最多 60 秒。录音只在当前页面临时保留，不上传、不写入备份；关闭后移除，需要保留请先下载。</p>
    <div className="my-5 flex flex-wrap items-center gap-3"><button className="btn btn-primary" disabled={status==='asking'} onClick={()=>status==='recording'?stop():void start()}>{status==='asking'?'等待麦克风权限…':status==='recording'?`停止录音 · ${seconds}s`:audio?'重新录音':'开始录音'}</button>{status==='recording'&&<span role="status" className="text-danger">正在录音</span>}</div>
    {audio&&<div className="space-y-4"><audio controls src={audio.url} className="w-full" aria-label="我的跟读录音"/><button className="btn btn-secondary" onClick={()=>downloadBlob(audio.blob,`跟读-${sentence.id}.${audio.blob.type.includes('mp4')?'m4a':'webm'}`)}>下载这段录音</button></div>}
    {error&&<p role="alert" className="mt-4 text-danger">{error}</p>}
  </Sheet>;
}
