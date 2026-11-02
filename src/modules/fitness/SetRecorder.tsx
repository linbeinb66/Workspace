import { useRef, useState } from 'react';
import type { Exercise, Session } from '../../types';
import { bodyParts } from '../../data/exercises';
import { daysSince, exerciseHistory, toDisplayWeight, toKg } from '../../domain/fitness';
import { mainWeight, recommend } from '../../domain/recommend';
import { Sheet } from '../../components/Sheet';
import { Stepper } from '../../components/Stepper';
import { useToast } from '../../components/Toast';
import { useSettingsStore } from '../settings/store';
import { useFitnessStore } from './store';
import { RecommendCard } from './RecommendCard';
import { prescribedExercise } from '../../domain/trainingPlan';
interface DraftSet { weight:number;reps:number;rpe:string;warmup:boolean;done:boolean }
export function SetRecorder({session,initialExerciseId,initialMode='recommend',onClose,onSaved}:{session:Session;initialExerciseId?:string;initialMode?:'recommend'|'previous'|'manual';onClose:()=>void;onSaved:(exerciseId:string)=>void}) {
  const exercises=useFitnessStore((state)=>state.exercises);const sessions=useFitnessStore((state)=>state.sessions);const sets=useFitnessStore((state)=>state.sets);const addSets=useFitnessStore((state)=>state.addSets);
  const unit=useSettingsStore((state)=>state.settings.unit);const [query,setQuery]=useState('');const [part,setPart]=useState('全部');
  const [exerciseId,setExerciseId]=useState(initialExerciseId??exercises[0]!.id);const exercise=prescribedExercise(exercises.find((entry)=>entry.id===exerciseId)!,session.plan?.items.find((item)=>item.exerciseId===exerciseId));
  const history=exerciseHistory(exerciseId,sessions,sets,session.date);const recommendation=recommend(exercise,history);
  const makeRows=(ex:Exercise,weight:number):DraftSet[]=>Array.from({length:ex.targetSets},()=>({weight,reps:Math.max(ex.repMin,Math.min(10,ex.repMax)),rpe:'',warmup:false,done:false}));
  const [rows,setRows]=useState(()=>makeRows(exercise,recommendation.weight).map((row,index)=>{
    const previous=recommendation.basedOn;
    if(initialMode==='previous'&&previous)return {...row,weight:previous.sets[index]?.weight??mainWeight(previous.sets),reps:previous.sets[index]?.reps??10};
    return {...row,reps:recommendation.delta!==0?exercise.repMin:previous?Math.min(exercise.repMax,Math.min(...previous.sets.map((set)=>set.reps))+(recommendation.progress?.includes('+1')?1:0)):Math.max(exercise.repMin,Math.min(10,exercise.repMax))};
  }));const firstRow=useRef<HTMLDivElement>(null);const toast=useToast();
  const patch=(index:number,change:Partial<DraftSet>)=>setRows((items)=>items.map((row,i)=>i===index?{...row,...change}:row));
  const filtered=exercises.filter((entry)=>(part==='全部'||entry.category===part)&&`${entry.name} ${entry.nameEn??''}`.toLowerCase().includes(query.toLowerCase()));
  const chooseExercise=(original:Exercise)=>{const next=prescribedExercise(original,session.plan?.items.find((item)=>item.exerciseId===original.id));setExerciseId(next.id);setRows(makeRows(next,recommend(next,exerciseHistory(next.id,sessions,sets,session.date)).weight));};
  const save=()=>{
    try{const completed=rows.filter((row)=>row.done);if(completed.some((row)=>row.reps<1||!Number.isInteger(row.reps)))throw new Error('次数请填写大于0的整数');
      addSets(session.id,completed.map((row)=>({exerciseId,weight:Math.round(row.weight*1e6)/1e6,reps:row.reps,...(row.rpe?{rpe:Number(row.rpe)}:{}),isWarmup:row.warmup})));onSaved(exerciseId);
    }catch(err){toast(err instanceof Error?err.message:'保存失败',true);}
  };
  return <Sheet open title="记录训练组" onClose={onClose} footer={<button className="btn btn-primary w-full" onClick={save}>保存已勾选的 {rows.filter((row)=>row.done).length} 组</button>}>
    <div className="space-y-5"><p className="rounded-btn bg-canvas p-3 text-caption text-muted">{session.date} · {session.title}。只保存已勾选的完成组；未勾的行是本次草稿。</p>{session.plan&&<div className="flex flex-wrap gap-2">{session.plan.items.map((item)=><button key={item.exerciseId} className={`btn ${item.exerciseId===exerciseId?'btn-primary':'btn-secondary'}`} onClick={()=>{if(rows.some((row)=>row.done)){toast('请先保存已勾选的组，或取消勾选后切换',true);return;}const ex=exercises.find((ex)=>ex.id===item.exerciseId);if(ex)chooseExercise(ex);}}>{exercises.find((ex)=>ex.id===item.exerciseId)?.name}</button>)}</div>}
      <label className="field-label" htmlFor="exercise-search">搜索动作</label><input id="exercise-search" className="field w-full" placeholder="中文或英文名称" value={query} onChange={(e)=>setQuery(e.target.value)}/>
      <label className="field-label" htmlFor="exercise-part">按部位筛选</label><select id="exercise-part" className="field w-full" value={part} onChange={(e)=>setPart(e.target.value)}><option>全部</option>{bodyParts.map((value)=><option key={value}>{value}</option>)}</select>
      <label className="field-label" htmlFor="record-exercise">选择动作（{filtered.length} 个）</label><select id="record-exercise" className="field w-full" value={exerciseId} onChange={(e)=>{const next=exercises.find((entry)=>entry.id===e.target.value);if(next)chooseExercise(next);}}>{!filtered.some((entry)=>entry.id===exerciseId)&&<option value={exerciseId}>{exercise.name}（当前选择）</option>}{filtered.map((entry)=><option key={entry.id} value={entry.id}>{entry.name} · {entry.equipment}</option>)}</select>
      {recommendation.basedOn&&<p className="text-caption text-muted">距上次有效记录 {daysSince(recommendation.basedOn.date,session.date)} 天</p>}
      <RecommendCard exercise={exercise} recommendation={recommendation} unit={unit} onAdopt={()=>setRows((items)=>items.map((row)=>({...row,weight:recommendation.weight,reps:recommendation.delta!==0?exercise.repMin:Math.min(exercise.repMax,(recommendation.basedOn?Math.min(...recommendation.basedOn.sets.map((set)=>set.reps))+(recommendation.progress?.includes('+1')?1:0):Math.max(exercise.repMin,Math.min(10,exercise.repMax)))),rpe:''})))} onPrevious={()=>{const previous=recommendation.basedOn;if(previous)setRows((items)=>items.map((row,index)=>({...row,weight:previous.sets[index]?.weight??mainWeight(previous.sets),reps:previous.sets[index]?.reps??10,rpe:''})));}} onManual={()=>{firstRow.current?.scrollIntoView({behavior:'smooth',block:'center'});firstRow.current?.querySelector('input')?.focus();}}/>
      <div className="space-y-4">{rows.map((row,index)=><div ref={index===0?firstRow:undefined} key={index} className="rounded-card border border-line bg-canvas p-3"><div className="mb-3 flex items-center justify-between gap-2"><strong>第 {index+1} 组</strong><button className={`btn min-w-11 ${row.done?'bg-brand-soft text-brand-strong':'btn-secondary'}`} role="checkbox" aria-checked={row.done} aria-label={`第${index+1}组已完成`} onClick={()=>patch(index,{done:!row.done})}>{row.done?'✓ 已完成':'勾选完成'}</button></div>
        <Stepper label={`第${index+1}组重量`} unit={unit} value={Math.round(toDisplayWeight(row.weight,unit)*1000)/1000} step={toDisplayWeight(exercise.increment,unit)} max={toDisplayWeight(9999,unit)} onChange={(value)=>patch(index,{weight:toKg(value,unit)})}/>
        <div className="mt-3 grid grid-cols-2 gap-3"><div><label htmlFor={`set-reps-${index}`} className="field-label">次数</label><input id={`set-reps-${index}`} className="field w-full" type="number" min="1" step="1" inputMode="numeric" value={row.reps} onChange={(e)=>patch(index,{reps:Number(e.target.value)})}/></div><div><label htmlFor={`set-rpe-${index}`} className="field-label">RPE（可选）</label><input id={`set-rpe-${index}`} className="field w-full" type="number" min="1" max="10" step="0.5" inputMode="decimal" placeholder="1~10" value={row.rpe} onChange={(e)=>patch(index,{rpe:e.target.value})}/></div></div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><label className="inline-flex min-h-11 items-center gap-2"><input type="checkbox" className="h-5 w-5 accent-brand" checked={row.warmup} onChange={(e)=>patch(index,{warmup:e.target.checked})}/>热身组（不计推荐）</label>{index>0&&<button className="btn px-2 text-caption text-brand-strong" onClick={()=>{const previous=rows[index-1]!;patch(index,{...previous,done:false});}}>复制上一组</button>}<button className="btn min-w-11 px-2 text-danger" aria-label={`移除草稿第${index+1}组`} onClick={()=>setRows((items)=>items.filter((_,i)=>i!==index))}>移除</button></div>
      </div>)}</div><button className="btn btn-secondary w-full" onClick={()=>setRows((items)=>[...items,{...(items.at(-1)??makeRows(exercise,recommendation.weight)[0]!),done:false}])}>＋ 添加一组</button>
    </div>
  </Sheet>;
}
