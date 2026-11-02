import { describe, expect, it } from 'vitest';
import type { Exercise } from '../types';
import { countFailStreak, e1RM, recommend, roundToStep, type ExerciseHistory } from './recommend';
const ex: Exercise = { id: 'bench', name: '卧推', category: '胸', equipment: '杠铃', isCompound: true, increment: 2.5, repMin: 8, repMax: 12, targetSets: 3, startWeight: 40, source: 'custom', updatedAt: '2026-10-31T00:00:00Z' };
const history = (reps: number[], weight = 60, rpe = 8, date = '2026-10-30'): ExerciseHistory => ({ sessionId: date, date, sets: reps.map((rep) => ({ weight, reps: rep, rpe, isWarmup: false })) });
describe('PRD §8.1 十条定稿用例', () => {
  const cases: { name: string; exercise?: Exercise; records: ExerciseHistory[]; weight: number; keyword: string }[] = [
    { name: '1 无历史', records: [], weight: 40, keyword: '首次' },
    { name: '2 全组达到上限', records: [history([12,12,12])], weight: 62.5, keyword: '达到上限' },
    { name: '3 中间次数先加次数', records: [history([10,10,9])], weight: 60, keyword: '先加次数' },
    { name: '4 达标但RPE高', records: [history([12,12,12],60,10)], weight: 60, keyword: 'RPE 偏高' },
    { name: '5 一次低于下限，高RPE不能掩盖未达标', records: [history([7,7,6],60,9)], weight: 60, keyword: '稳住' },
    { name: '6 连续两场未达下限', records: [history([7,7,6],60,9),history([7,7,6],60,9,'2026-10-28')], weight: 55, keyword: '降载约 10%' },
    { name: '7 达下限未到上限', records: [history([8,9,8])], weight: 60, keyword: '先加次数' },
    { name: '8 自重动作', exercise: {...ex,equipment:'自重',startWeight:0}, records: [history([10,9,8],0)], weight: 0, keyword: '自重' },
    { name: '9 本场仅两组，沿用上次', records: [history([12,12]),history([8,8,8],60,8,'2026-10-28')], weight: 60, keyword: '组数不足' },
    { name: '10 混合重量众数60', records: [{...history([12,12,12]),sets:[{weight:60,reps:12,rpe:8},{weight:62.5,reps:12,rpe:8},{weight:60,reps:12,rpe:8}]}], weight: 62.5, keyword: '达到上限' },
  ];
  it.each(cases)('$name', ({exercise,records,weight,keyword}) => {
    const result=recommend(exercise??ex,records);expect(result.weight).toBe(weight);expect(result.reason).toContain(keyword);expect([result.repsMin,result.repsMax,result.sets]).toEqual([8,12,3]);
  });
});
describe('边界与历史污染', () => {
  it('无startWeight默认为0',()=>expect(recommend({...ex,startWeight:undefined},[]).weight).toBe(0));
  it('热身全程排除，不能凑够工作组数',()=>{
    const recent={...history([12,12]),sets:[...history([12,12]).sets,{weight:100,reps:1,isWarmup:true}]};
    expect(recommend(ex,[recent,history([8,8,8],60,8,'2026-10-28')])).toMatchObject({weight:60,reason:expect.stringContaining('组数不足')});
  });
  it('仅热身场次不覆盖上次建议，也不打断连续失败',()=>{
    const warm={...history([2,2,2]),sets:history([2,2,2]).sets.map(s=>({...s,isWarmup:true}))};
    expect(recommend(ex,[warm,history([6,6,6],60,9,'2026-10-29'),history([6,6,6],60,9,'2026-10-27')]).weight).toBe(55);
  });
  it('众数并列取较大者',()=>expect(recommend({...ex,targetSets:2},[{...history([12,12]),sets:[{weight:60,reps:12},{weight:62.5,reps:12}]}]).weight).toBe(65));
  it('不足场次不打断失败连续值',()=>expect(recommend(ex,[history([5,5,5]),history([12],60,8,'2026-10-29'),history([6,6,6],60,9,'2026-10-27')]).weight).toBe(55));
  it('最近有效场达标会结束失败连续值',()=>expect(countFailStreak([history([8,8,8]),history([6,6,6],60,8,'2026-10-28')],8)).toBe(0));
  it('中段RPE偏高不推次数',()=>{const r=recommend(ex,[history([10,10,9],60,9)]);expect(r.weight).toBe(60);expect(r.reason).toContain('RPE 偏高');expect(r.progress).not.toContain('+1');});
  it('单次加重取整后超10%上限则只加次数',()=>{const r=recommend({...ex,increment:2.5},[history([12,12,12],10)]);expect(r.weight).toBe(10);expect(r.reason).toContain('只加次数');});
  it('10%上限恰好相等允许加重',()=>expect(recommend({...ex,increment:2},[history([12,12,12],20)]).weight).toBe(22));
  it('大步长降载注明实际约17%',()=>{const r=recommend({...ex,increment:10},[history([6,6,6]),history([6,6,6],60,8,'2026-10-28')]);expect(r.weight).toBe(50);expect(r.reason).toContain('17%');});
  it('自重达到上限提示考虑加负重',()=>expect(recommend({...ex,equipment:'自重'},[history([12,12,12],0)]).reason).toContain('考虑加负重'));
  it('自重达标但RPE高也不继续推次数',()=>{const result=recommend({...ex,equipment:'自重'},[history([12,12,12],0,10)]);expect(result.reason).toContain('RPE 偏高');expect(result.progress).not.toContain('+1');});
  it('不足组保留上次已经形成的加重结论',()=>expect(recommend(ex,[history([6]),history([12,12,12],60,8,'2026-10-28')]).weight).toBe(62.5));
  it('同日按场次时间排序，输入不变',()=>{const earlier={...history([8,8,8]),order:'2026-10-30T10:00:00Z'};const later={...history([12,12,12]),order:'2026-10-30T12:00:00Z'};const records=[earlier,later];const before=structuredClone(records);expect(recommend(ex,records).weight).toBe(62.5);expect(records).toEqual(before)});
  it('多组RPE取最大值，非平均数',()=>{const h=history([12,12,12]);h.sets[0]!.rpe=10;expect(recommend(ex,[h]).reason).toContain('RPE 偏高')});
  it('就近取整和Epley只做独立数学运算',()=>{expect(roundToStep(54,2.5)).toBe(55);expect(roundToStep(54,5)).toBe(55);expect(roundToStep(54,10)).toBe(50);expect(e1RM(60,10)).toBe(80)});
});
