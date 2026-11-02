import { useEffect, useRef } from 'react';
import { useNow } from '../../lib/useWorkDate';
import { useToast } from '../../components/Toast';
import { useFitnessStore } from './store';
export function RestTimer(){
  const end=useFitnessStore((state)=>state.restUntil);const start=useFitnessStore((state)=>state.startRest);const now=useNow();const last=useRef<number|null>(null);const toast=useToast();const seconds=end?Math.max(0,Math.ceil((end-now.getTime())/1000)):0;
  useEffect(()=>{if(end&&seconds===0&&last.current!==end){last.current=end;start(0);toast('休息时间到了，准备好再继续');}},[end,seconds,start,toast]);
  if(!end)return null;
  return <aside aria-label="组间休息计时" className="fixed bottom-24 right-4 z-40 w-[calc(100%-32px)] max-w-sm rounded-card border border-brand/30 bg-surface p-4 shadow-lg lg:bottom-6"><div className="flex items-center justify-between gap-3"><div><p className="text-caption text-muted">组间休息</p><p className="text-2xl font-semibold tabular-nums text-brand-strong" role="timer">{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</p></div><div className="flex gap-2"><button className="btn btn-secondary text-caption" onClick={()=>start(seconds+30)}>＋30 秒</button><button className="btn btn-primary text-caption" onClick={()=>start(0)}>结束休息</button></div></div></aside>;
}
