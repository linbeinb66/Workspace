import dayjs from 'dayjs';
import type { BodyMetric, Exercise, Session, SetLog } from '../types';
import { weekRange } from './report';
import { addDays } from './plan';
import type { ExerciseHistory } from './recommend';
export const toDisplayWeight = (kg: number, unit: 'kg'|'lb') => unit === 'lb' ? kg * 2.2046226218 : kg;
export const toKg = (value: number, unit: 'kg'|'lb') => unit === 'lb' ? value / 2.2046226218 : value;
export const weightText = (kg: number, unit: 'kg'|'lb' = 'kg') => String(Math.round(toDisplayWeight(kg,unit)*100)/100);
export const volume = (sets: SetLog[]) => sets.filter((set)=>!set.isWarmup).reduce((sum,set)=>sum+set.weight*set.reps,0);
export function exerciseHistory(exerciseId: string, sessions: Session[], sets: SetLog[], throughDate?: string): ExerciseHistory[] {
  return sessions.filter((session)=>!throughDate||session.date<=throughDate).map((session)=>({sessionId:session.id,date:session.date,order:session.startedAt??session.updatedAt,
    sets:sets.filter((set)=>set.sessionId===session.id&&set.exerciseId===exerciseId)})).filter((record)=>record.sets.length>0);
}
export function fitnessWeek(sessions: Session[], sets: SetLog[], exercises: Exercise[], date: string, weekStart: 0|1=1) {
  const range=weekRange(date,weekStart);const ids=new Set(sessions.filter((session)=>session.date>=range.start&&session.date<=range.end).map((session)=>session.id));
  const working=sets.filter((set)=>ids.has(set.sessionId)&&!set.isWarmup);
  const active=new Set(working.map((set)=>set.sessionId));
  const distribution: Record<string,number>={胸:0,背:0,腿:0,肩:0,手臂:0,核心:0,有氧:0};
  for(const set of working){const category=exercises.find((exercise)=>exercise.id===set.exerciseId)?.category;if(category)distribution[category]=(distribution[category]??0)+1;}
  return {...range,days:new Set(sessions.filter((session)=>active.has(session.id)).map((session)=>session.date)).size,volume:volume(working),sets:working.length,distribution};
}
export function weightTrend(metrics: BodyMetric[], end: string) {
  const start=addDays(end,-29);
  const sorted=metrics.filter((metric):metric is BodyMetric & {weightKg:number}=>metric.weightKg!==undefined&&metric.date<=end&&metric.date>=addDays(start,-6)).sort((a,b)=>a.date.localeCompare(b.date));
  return sorted.filter((metric)=>metric.date>=start).map((metric)=>{
    const recent=sorted.filter((row)=>row.date<=metric.date&&row.date>=addDays(metric.date,-6));
    return {...metric,average:recent.reduce((sum,row)=>sum+row.weightKg,0)/recent.length};
  });
}
export function daysSince(date: string, today: string) { return Math.max(0,dayjs(today).diff(dayjs(date),'day')); }
