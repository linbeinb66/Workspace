import { useEffect, useState } from 'react';
import { playbackRateSample,type VideoFrameSample } from '../../domain/videoQuality';
interface Health { width:number;height:number;fps:number|null;drop:number|null;status:'playing'|'paused'|'buffering'|'missing' }
export function VideoHealth({wallpaperKey}:{wallpaperKey?:string}) {
  const [health,setHealth]=useState<Health>({width:0,height:0,fps:null,drop:null,status:'missing'});
  useEffect(()=>{
    let previous:VideoFrameSample|null=null;let previousVideo:HTMLVideoElement|null=null;
    const read=()=>{
      const video=document.getElementById('wallpaper-video');
      if(!(video instanceof HTMLVideoElement)){previous=null;previousVideo=null;setHealth({width:0,height:0,fps:null,drop:null,status:'missing'});return;}
      if(video!==previousVideo){previous=null;previousVideo=video;}
      const status=video.paused?'paused':video.readyState<3?'buffering':'playing';
      const quality=typeof video.getVideoPlaybackQuality==='function'?video.getVideoPlaybackQuality():null;
      const sample=quality?{timeMs:performance.now(),total:quality.totalVideoFrames,dropped:quality.droppedVideoFrames}:null;
      const rate=status==='playing'&&sample&&previous?playbackRateSample(previous,sample):null;
      previous=status==='playing'?sample:null;
      setHealth({width:video.videoWidth,height:video.videoHeight,fps:rate?.fps??null,drop:rate?.dropPercent??null,status});
    };
    read();const timer=window.setInterval(read,2000);const visibility=()=>{previous=null;read();};
    document.addEventListener('visibilitychange',visibility);
    return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',visibility);};
  },[wallpaperKey]);
  if(health.status==='missing')return <p className="text-caption leading-6 text-muted">导入视频壁纸后，这里会显示分辨率和实际播放采样，方便判断是否仍有掉帧。</p>;
  return <div><dl className="grid grid-cols-2 gap-3"><div className="rounded-btn bg-canvas/50 p-3"><dt className="text-caption text-muted">播放帧率（估算）</dt><dd className="mt-1 text-xl font-semibold text-brand-strong">{health.status==='paused'?'已暂停':health.status==='buffering'?'缓冲中':health.fps===null?'采样中…':`${health.fps} fps`}</dd></div><div className="rounded-btn bg-canvas/50 p-3"><dt className="text-caption text-muted">近2秒丢帧</dt><dd className="mt-1 text-xl font-semibold text-brand-strong">{health.drop===null?'—':`${health.drop}%`}</dd></div></dl><p className="mt-3 text-caption text-muted">{health.width&&health.height?`${health.width} × ${health.height}`:'正在读取分辨率'} · {health.status==='playing'?'播放中':health.status==='paused'?'暂停':'等待视频数据'}</p><p className="mt-3 text-caption leading-6 text-muted">这是浏览器视频帧计数的估算，不是网页刷新率。30帧源视频不会因切换模式变成60帧；丢帧持续偏高时先试“流畅优先”。</p>{health.width>1920&&<p className="mt-3 rounded-btn bg-amber-soft p-3 text-caption leading-6 text-amber">这段视频超过 1080p，解码负担较大。如果流畅档仍卡顿，可准备 1080p / 30fps 的视频副本再导入。</p>}</div>;
}
