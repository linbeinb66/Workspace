import type { Exercise, Recommendation } from '../types';
export interface HistorySet { weight: number; reps: number; rpe?: number; isWarmup?: boolean }
export interface ExerciseHistory { sessionId: string; date: string; order?: string; sets: HistorySet[] }
export const roundToStep = (value: number, step: number): number => {
  if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) throw new Error('重量和步长必须是有效数值');
  return Math.round(Math.round(value / step) * step * 1e6) / 1e6;
};
export const e1RM = (weight: number, reps: number) => weight * (1 + reps / 30);
export const workSets = (record: ExerciseHistory) => record.sets.filter((set) => !set.isWarmup);
export function mainWeight(sets: HistorySet[]): number {
  const counts = new Map<number, number>();
  for (const set of sets) counts.set(set.weight, (counts.get(set.weight) ?? 0) + 1);
  return [...counts].sort((a,b) => b[1]-a[1] || b[0]-a[0])[0]?.[0] ?? 0;
}
export function countFailStreak(records: ExerciseHistory[], repMin: number): number {
  let count = 0;
  for (const record of records) {
    const sets = workSets(record);
    if (!sets.length || Math.min(...sets.map((set) => set.reps)) >= repMin) break;
    count++;
  }
  return count;
}
export function recommend(ex: Exercise, history: ExerciseHistory[]): Recommendation {
  const records = [...history].sort((a,b) => b.date.localeCompare(a.date) || (b.order ?? '').localeCompare(a.order ?? ''));
  const relevant = records.filter((record) => workSets(record).length > 0);
  const valid = relevant.filter((record) => workSets(record).length >= ex.targetSets).slice(0,3);
  const latest = valid[0]; const incomplete = relevant[0] && workSets(relevant[0]).length < ex.targetSets;
  const base = { exerciseId: ex.id, repsMin: ex.repMin, repsMax: ex.repMax, sets: ex.targetSets };
  if (!latest) return { ...base, weight: ex.startWeight ?? 0, delta: 0, confidence: 'low', reason: `${incomplete ? '本次组数不足，尚无有效历史；' : ''}首次记录，先填一个能做 ${Math.max(ex.repMin,Math.min(10,ex.repMax))} 次的重量当基准` };
  const sets = workSets(latest); const weight = mainWeight(sets); const minReps = Math.min(...sets.map((set) => set.reps));
  const rpe = Math.max(0,...sets.map((set) => set.rpe ?? 0));
  const result = (next: number, reason: string, progress = '先保持动作和节奏'): Recommendation => ({ ...base, weight: next, delta: Math.round((next-weight)*1e6)/1e6,
    confidence: valid.length >= 3 ? 'high' : 'mid', reason: `${incomplete ? '本次组数不足，沿用上次建议；' : ''}${reason}`, progress, basedOn: { date: latest.date, sets: sets.map(({weight,reps,rpe}) => ({weight,reps,...(rpe === undefined ? {} : {rpe})})) } });
  if (weight === 0) {
    if (rpe > 8.5 && minReps >= ex.repMin) return result(0,'自重动作 RPE 偏高，先稳一档','保持次数，先恢复节奏');
    return result(0, minReps >= ex.repMax ? '自重动作已达到上限，考虑加负重' : '自重动作先加次数，保持动作质量', minReps >= ex.repMax ? '保持次数，再考虑加负重' : `目标每组 +1 次（上次最少 ${minReps} 次）`);
  }
  if (minReps < ex.repMin && countFailStreak(valid,ex.repMin) >= 2) {
    const next = roundToStep(weight*0.9,ex.increment); const actual = (weight-next)/weight*100;
    const percent = Math.abs(actual-10) > 5 ? Math.round(actual) : 10;
    return result(next,`连续两场未达下限，降载约 ${percent}%（${weight}→${next}kg）`, next < weight ? `重量 ${Math.round((next-weight)*1e6)/1e6}kg` : '受步长限制，先减少次数压力');
  }
  if (minReps < ex.repMin) return result(weight,`上次有组只做了 ${minReps} 次，先稳住`);
  if (rpe > 8.5) return result(weight,'RPE 偏高，先稳一档，暂不继续加重量或次数');
  if (minReps >= ex.repMax) {
    const cap = Math.min(ex.increment,weight*0.1); const next = roundToStep(weight+cap,ex.increment);
    if (next > weight && next-weight <= cap+1e-8) return result(next,'全部工作组达到上限，可以小幅加重',`重量 +${Math.round((next-weight)*1e6)/1e6}kg`);
    return result(weight,'达到上限，但取整后超过单次 10% 加重限制，先只加次数','保持重量，先稳住次数');
  }
  return result(weight,'达到下限，先加次数，再考虑加重',`目标每组 +1 次（上次最少 ${minReps} 次）`);
}
