import dayjs from 'dayjs';
import { useState } from 'react';
import type { TrainingPlan } from '../../types';
import { id } from '../../lib/id';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { TrainingPlanEditor } from './TrainingPlanEditor';
import { Card } from '../../components/Card';
import { useToast } from '../../components/Toast';
import { trainingReferences } from '../../data/trainingPlans';
import { muscleRecency, nextTrainingDay, planSnapshot, trainingPlanCatalog } from '../../domain/trainingPlan';
import { useSettingsStore } from '../settings/store';
import { useFitnessStore } from './store';
export function TrainingPlans({date,onStarted}:{date:string;onStarted:(id:string)=>void}){
  const state=useFitnessStore((s)=>s);const settings=useSettingsStore((s)=>s.settings);const savePlan=useSettingsStore((s)=>s.saveTrainingPlan);const removePlan=useSettingsStore((s)=>s.removeTrainingPlan);const update=useSettingsStore((s)=>s.update);const toast=useToast();
  const [editing,setEditing]=useState<TrainingPlan|null>(null);const [deleting,setDeleting]=useState<string|null>(null);
  const catalog=trainingPlanCatalog(settings.trainingPlans,settings.updatedAt);const plan=catalog.find((p)=>p.id===settings.activeTrainingPlanId)??catalog[0];const next=plan?nextTrainingDay(plan,state.sessions,state.sets,date):null;
  const open=state.sessions.find((session)=>session.date===date&&session.plan?.planId===plan?.id&&!session.endedAt);
  const recency=muscleRecency(state.exercises,state.sessions,state.sets,date);
  return <><Card title="我的分化计划" subtitle="练一次推进一次 · 休息日由你安排" className="order-first lg:col-span-3">
    <div className="mb-5 flex flex-wrap gap-2"><button className="btn btn-primary" onClick={()=>setEditing({id:id(),name:'',description:'',days:[{id:id(),name:'第 1 天',items:[]}]})}>＋ 新增训练计划</button>{plan&&<><button className="btn btn-secondary" onClick={()=>setEditing(structuredClone(plan))}>编辑当前计划</button><button className="btn btn-outline-danger" onClick={()=>setDeleting(plan.id)}>删除当前计划</button></>}</div>
    {plan&&next?<div className="grid gap-5 lg:grid-cols-3"><div><label htmlFor="training-plan" className="field-label">选择计划</label><select id="training-plan" className="field w-full" value={plan.id} onChange={(e)=>{try{update({activeTrainingPlanId:e.target.value});}catch(err){toast(err instanceof Error?err.message:'切换失败',true);}}}>{catalog.map((p)=><option key={p.id} value={p.id}>{p.name}</option>)}</select><p className="mt-3 text-caption text-muted">{plan.description}</p><button className="btn btn-primary mt-4 w-full" onClick={()=>{try{const session=state.createSession(date,`${plan.name} · ${next.name}`,planSnapshot(plan,next));onStarted(session.id);toast(open?'已回到进行中的模板训练':'动作和组次已带入，完成后再勾选保存');}catch(err){toast(err instanceof Error?err.message:'创建失败',true);}}}>{open?'继续模板训练':`一键开始 · ${next.name}`}</button></div>
    <details className="lg:col-span-2"><summary className="mb-2 min-h-11 cursor-pointer rounded-btn bg-brand-soft px-4 py-3 text-brand-strong">查看全部训练日 · 动作与组次</summary><div className="space-y-2">{plan.days.map((day,index)=><details key={day.id} open={day.id===next.id} className="rounded-btn border border-line bg-canvas p-3"><summary className="min-h-11 cursor-pointer py-2 font-medium">{index+1}. {day.name}{day.id===next.id?' · 下一训练日':''}<span className="ml-2 text-caption text-muted">{day.items.reduce((sum,item)=>sum+item.targetSets,0)} 工作组</span></summary><div className="space-y-2 pb-2">{day.items.map((item)=><p key={item.exerciseId} className="flex flex-wrap justify-between gap-2 text-caption"><span>{state.exercises.find((ex)=>ex.id===item.exerciseId)?.name??'动作已不可用'}</span><span className="text-muted">{item.targetSets} 组 × {item.repMin}~{item.repMax} 次 · 休息 {item.restSec} 秒</span></p>)}</div></details>)}</div></details></div>:<div className="compact-empty"><p>还没有训练计划</p><p className="text-caption">点击“新增训练计划”，自己安排训练日和动作。自由训练与历史记录仍可继续使用。</p></div>}
    <div className="mt-5 flex flex-wrap gap-2">{recency.map(({part,date:last})=><span key={part} className="rounded-pill bg-brand-soft px-3 py-2 text-caption text-brand-strong">{part} · {last?`${dayjs(date).diff(dayjs(last),'day')} 天前`:'未记录'}</span>)}</div><p className="mt-2 text-caption text-muted">按已保存工作组的主要部位统计；推拉也会带动手臂等辅助肌群。间隔只供参考，不自动判断是否恢复。</p>
    <details className="mt-4 text-caption text-muted"><summary className="min-h-11 cursor-pointer py-3">计划使用说明 / 内置模板来源</summary><div className="space-y-2"><p>本页允许自由新增和修改计划。以下来源仅说明最初的内置入门模板：根据分化框架自编。已核实凯圣王与谭成义的三分化系列页面，但未取得完整动作和组次，四分化也未核实为博主原版。</p><p>先热身，再做工作组；重量首次手填，不把口述重量当成已完成记录。保留约 1–3 次余力，动作稳定再进步。杠铃含杆总重；哑铃按单只，器械按标示重量，保持同一口径。高位下拉可作为引体起步替代。</p><p>四分化每周 4–5 次时，部分肌群一周约训练一次。ACSM 建议主要肌群每周至少两次；这里保留你的四分化偏好，也可切换三分化提高循环频率。不要为了追赶循环跳过休息。</p><p>约 1 小时是估计；超时可减少末尾辅助组，仍保存实际完成的部分。训练后自行决定是否完成该日，未推进时下次仍是同一天。</p><div className="flex flex-wrap gap-4"><a className="min-h-11 py-3 text-brand-strong underline" href={trainingReferences.creator} target="_blank" rel="noreferrer">凯圣王原作者系列</a><a className="min-h-11 py-3 text-brand-strong underline" href={trainingReferences.guidelines} target="_blank" rel="noreferrer">ACSM 2026 指南</a></div></div></details>
  </Card>
    {editing&&<TrainingPlanEditor key={editing.id} initial={editing} exercises={state.exercises} onClose={()=>setEditing(null)} onSave={(draft)=>{savePlan(draft);setEditing(null);toast('训练计划已保存');}}/>}
    <ConfirmDialog open={deleting!==null} title="删除这份训练计划？" destructive confirmLabel="确认删除计划" onClose={()=>setDeleting(null)} onConfirm={()=>{if(deleting)removePlan(deleting);toast('计划已删除，已有训练记录保留');}}><p className="font-medium">{catalog.find((entry)=>entry.id===deleting)?.name}</p><p className="mt-3 text-muted">只删除计划模板，已创建的训练及其动作、组记录和当时安排都会保留。内置计划删除后也不会自动补回。</p></ConfirmDialog>
  </>;
}
