import type { Exercise, PlanItem, SavedTrainingPlan, Session, SessionPlan, SetLog, TrainingDay, TrainingPlan } from '../types';
import { trainingPlans } from '../data/trainingPlans';

// undefined 是旧版本的内置目录，[] 是用户主动删空；不能把两者混为一谈。
export function trainingPlanCatalog(saved:SavedTrainingPlan[]|undefined,stamp:string):SavedTrainingPlan[] {
  return saved??trainingPlans.map((plan)=>({...plan,days:plan.days.map((day)=>({...day,items:day.items.map((item)=>({...item}))})),demo:false,updatedAt:stamp}));
}
export function trainingPlanError(plan:TrainingPlan,exerciseIds?:Set<string>):string|null {
  if(!plan.id.trim()||!plan.name.trim())return '请填写计划名称';
  if(!plan.days.length)return '请至少添加一个训练日';
  if(new Set(plan.days.map((day)=>day.id)).size!==plan.days.length)return '训练日标识重复，请重新添加';
  for(const [index,day] of plan.days.entries()){
    const label=`第 ${index+1} 个训练日`;
    if(!day.id.trim()||!day.name.trim())return `${label}需要名称`;
    if(!day.items.length)return `${label}请至少添加一个动作`;
    if(new Set(day.items.map((item)=>item.exerciseId)).size!==day.items.length)return `${label}有重复动作，请合并组数`;
    for(const item of day.items){
      if(!item.exerciseId.trim()||(exerciseIds&&!exerciseIds.has(item.exerciseId)))return `${label}有不可用的动作，请重新选择`;
      if(!Number.isSafeInteger(item.targetSets)||item.targetSets<1||item.targetSets>20)return '工作组数请填 1～20 的整数';
      if(!Number.isSafeInteger(item.repMin)||!Number.isSafeInteger(item.repMax)||item.repMin<1||item.repMax>100||item.repMax<item.repMin)return '次数请填 1～100 的整数，上限不能小于下限';
      if(!Number.isSafeInteger(item.restSec)||item.restSec<0||item.restSec>3600)return '休息秒数请填 0～3600 的整数，0 表示关闭计时';
    }
  }
  return null;
}

export function planSnapshot(plan:TrainingPlan,day:TrainingDay):SessionPlan {
  return {planId:plan.id,planName:plan.name,dayId:day.id,dayName:day.name,items:day.items.map((entry)=>({...entry}))};
}
export function nextTrainingDay(plan:TrainingPlan,sessions:Session[],sets:SetLog[],throughDate:string):TrainingDay {
  const completed=sessions.filter((session)=>session.date<=throughDate&&session.plan?.planId===plan.id&&session.endedAt&&session.planCompleted
    &&sets.some((row)=>row.sessionId===session.id&&!row.isWarmup))
    .sort((a,b)=>b.date.localeCompare(a.date)||(b.endedAt??'').localeCompare(a.endedAt??''))[0];
  const index=plan.days.findIndex((day)=>day.id===completed?.plan?.dayId);
  return plan.days[(index+1)%plan.days.length]!;
}
export function prescribedExercise(exercise:Exercise,item?:PlanItem):Exercise {
  return item?{...exercise,targetSets:item.targetSets,repMin:item.repMin,repMax:item.repMax}:exercise;
}
export function planProgress(session:Session,sets:SetLog[]) {
  return (session.plan?.items??[]).map((item)=>({...item,completed:sets.filter((row)=>row.sessionId===session.id&&row.exerciseId===item.exerciseId&&!row.isWarmup).length}));
}
export function muscleRecency(exercises:Exercise[],sessions:Session[],sets:SetLog[],throughDate:string) {
  return ['胸','背','腿','肩','手臂','核心'].map((part)=>{
    const date=sessions.filter((session)=>session.date<=throughDate&&sets.some((row)=>row.sessionId===session.id&&!row.isWarmup&&exercises.find((ex)=>ex.id===row.exerciseId)?.category===part)).map((session)=>session.date).sort().at(-1);
    return {part,date};
  });
}
