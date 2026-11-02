import { describe, expect, it } from 'vitest';
import type { BodyMetric, Session, SetLog } from '../types';
import { exerciseLibrary } from '../data/exercises';
import { exerciseHistory, fitnessWeek, toDisplayWeight, toKg, volume, weightTrend } from './fitness';
const stamp='2026-10-31T00:00:00Z';
const session=(id:string,date:string):Session=>({id,date,title:'力量训练',bodyParts:[],updatedAt:stamp,startedAt:stamp});
const set=(id:string,sessionId:string,warmup=false):SetLog=>({id,sessionId,exerciseId:'seed-bench',weight:60,reps:10,index:0,isWarmup:warmup,doneAt:stamp,updatedAt:stamp});
describe('健身统计与换算',()=>{
  it('热身不计容量，未完成场次工作组仍计实际统计',()=>expect(volume([set('1','a'),set('2','a',true)])).toBe(600));
  it('同一天多场训练只计一天，跨周和热身排除',()=>{
    const sessions=[session('a','2026-10-31'),session('b','2026-10-31'),session('old','2026-10-25'),session('warm','2026-11-01')];
    const result=fitnessWeek(sessions,[set('1','a'),set('2','b'),set('3','old'),set('4','warm',true)],exerciseLibrary(stamp),'2026-10-31');
    expect(result).toMatchObject({days:1,volume:1200,sets:2,distribution:{胸:2,腿:0}});
  });
  it('编辑历史会改变下次派生结果，无缓存污染',()=>{
    const sessions=[session('a','2026-10-31')];const rows=[set('1','a')];expect(fitnessWeek(sessions,rows,exerciseLibrary(stamp),'2026-10-31').volume).toBe(600);
    rows[0]!.weight=65;expect(fitnessWeek(sessions,rows,exerciseLibrary(stamp),'2026-10-31').volume).toBe(650);
  });
  it('历史只传对应动作，排除未来日期，保留热身标记给推荐层过滤',()=>{
    const result=exerciseHistory('seed-bench',[session('a','2026-10-31'),session('future','2026-11-02')],[set('1','a'),set('2','future'),{...set('3','a'),exerciseId:'seed-row'}],'2026-10-31');expect(result).toHaveLength(1);expect(result[0]!.sets).toHaveLength(1);
  });
  it('lb显示可来回换算，存储保持kg',()=>{expect(toDisplayWeight(60,'lb')).toBeCloseTo(132.277357308);expect(toKg(toDisplayWeight(60,'lb'),'lb')).toBeCloseTo(60);expect(toKg(60,'kg')).toBe(60)});
  it('7日均线不填缺失天，不纳入未来或8天前数据，30天窗口',()=>{
    const metrics:BodyMetric[]=[['2026-09-20',100],['2026-10-01',100],['2026-10-24',100],['2026-10-25',80],['2026-10-31',70],['2026-11-01',20]].map(([date,weightKg])=>({date:String(date),weightKg:Number(weightKg),updatedAt:stamp}));
    const result=weightTrend(metrics,'2026-10-31');expect(result.map((point)=>point.date)).not.toContain('2026-10-01');expect(result.at(-1)!.average).toBe(75);expect(result.at(-1)!.weightKg).toBe(70);
  });
});
