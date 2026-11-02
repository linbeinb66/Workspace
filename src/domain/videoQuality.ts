export interface VideoFrameSample { timeMs:number; total:number; dropped:number }
// 浏览器帧计数的采样估算，不把视频解码速率当成网页刷新率或源文件帧率。
export function playbackRateSample(before:VideoFrameSample,after:VideoFrameSample):{fps:number;dropPercent:number}|null {
  const elapsed=after.timeMs-before.timeMs;const frames=after.total-before.total;const dropped=after.dropped-before.dropped;
  if(![elapsed,frames,dropped].every(Number.isFinite)||elapsed<500||frames<0||dropped<0||dropped>frames)return null;
  return {fps:Math.round((frames-dropped)*10000/elapsed)/10,dropPercent:frames?Math.round(dropped/frames*1000)/10:0};
}
