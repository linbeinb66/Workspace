import type { Exercise, Recommendation } from '../../types';
import { weightText } from '../../domain/fitness';
export function RecommendCard({exercise,recommendation,unit,onAdopt,onPrevious,onManual}:{exercise:Exercise;recommendation:Recommendation;unit:'kg'|'lb';onAdopt:()=>void;onPrevious:()=>void;onManual:()=>void}) {
  return <div className="rounded-card border border-brand/20 bg-brand-soft/70 p-4">
    <p className="text-caption font-medium text-brand-strong">下次的小进步 · {exercise.name}</p>
    <p className="mt-2 text-xl font-semibold">{weightText(recommendation.weight,unit)}{unit} <span className="text-base">× {recommendation.repsMin}~{recommendation.repsMax} 次 × {recommendation.sets} 组</span></p>
    {recommendation.progress&&<p className="mt-2 text-caption text-brand-strong">{unit==='kg'?recommendation.progress:recommendation.delta?`重量 ${recommendation.delta>0?'+':''}${weightText(recommendation.delta,unit)}lb`:recommendation.progress}</p>}
    <p className="mt-2 break-words text-caption leading-6 text-muted">依据：{recommendation.reason}</p>
    {recommendation.basedOn&&<p className="mt-1 text-caption text-muted">参考 {recommendation.basedOn.date} · {recommendation.basedOn.sets.map((set)=>`${weightText(set.weight,unit)}×${set.reps}`).join(' / ')}</p>}
    <div className="mt-4 flex flex-wrap gap-2"><button className="btn btn-primary flex-1" onClick={onAdopt}>采用建议</button><button className="btn btn-secondary" disabled={!recommendation.basedOn} onClick={onPrevious}>按上次</button><button className="btn btn-secondary" onClick={onManual}>手动改</button></div>
  </div>;
}
