import { createContext, useContext } from 'react';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type { BodyMetric, Exercise, Session, SessionPlan, SetLog } from '../../types';
import type { OwnedStorage } from '../../lib/storage';
import { id } from '../../lib/id';
import { exerciseLibrary } from '../../data/exercises';
type FitnessKey = 'exercises'|'sessions'|'sets'|'bodyMetrics';
type NewSet = Pick<SetLog,'exerciseId'|'weight'|'reps'|'rpe'|'isWarmup'>;
export interface FitnessState {
  exercises: Exercise[]; sessions: Session[]; sets: SetLog[]; bodyMetrics: BodyMetric[];
  restUntil: number | null; startRest: (seconds: number) => void;
  createSession: (date: string,title: string,plan?:SessionPlan) => Session;
  updateSession: (sessionId: string,patch: Partial<Pick<Session,'title'|'date'|'durationMin'|'note'|'endedAt'|'planCompleted'>>) => void;
  removeSession: (sessionId: string) => void;
  addSets: (sessionId: string,sets: NewSet[]) => void;
  updateSet: (setId: string,patch: Pick<SetLog,'weight'|'reps'|'rpe'|'isWarmup'>) => void;
  removeSet: (setId: string) => void;
  saveExercise: (exercise: Exercise) => void;
  saveBody: (metric: Omit<BodyMetric,'updatedAt'|'demo'>) => void;
  reload: () => void;
}
export function createFitnessStore(port: OwnedStorage<FitnessKey>,clock:()=>Date=()=>new Date()) {
  const read = () => {
    const saved=port.get('exercises',[]);const existing=new Set(saved.map((exercise)=>exercise.id));
    const missing=exerciseLibrary(clock().toISOString()).filter((exercise)=>!existing.has(exercise.id));
    const exercises=[...saved,...missing];if(missing.length)port.set('exercises',exercises);
    return {exercises,sessions:port.get('sessions',[]),sets:port.get('sets',[]),bodyMetrics:port.get('bodyMetrics',[])};
  };
  return createStore<FitnessState>((set,get)=>({ ...read(),
    restUntil:null,startRest(seconds){set({restUntil:seconds>0?clock().getTime()+seconds*1000:null});},
    createSession(date,title,plan){if(!title.trim())throw new Error('请填写训练标题');if(plan){const existing=get().sessions.find((session)=>session.date===date&&session.plan?.planId===plan.planId&&!session.endedAt);if(existing)return existing;}const stamp=clock().toISOString();const session:Session={id:id(),date,title:title.trim(),bodyParts:[],startedAt:stamp,updatedAt:stamp,demo:false,...(plan?{plan:structuredClone(plan),planCompleted:false}:{})};const sessions=[...get().sessions,session];port.set('sessions',sessions);set({sessions});return session;},
    updateSession(sessionId,patch){if(patch.title!==undefined&&!patch.title.trim())throw new Error('请填写训练标题');const sessions=get().sessions.map((session)=>session.id===sessionId?{...session,...patch,updatedAt:clock().toISOString()}:session);port.set('sessions',sessions);set({sessions});},
    removeSession(sessionId){const sessions=get().sessions.filter((session)=>session.id!==sessionId);const sets=get().sets.filter((row)=>row.sessionId!==sessionId);port.setMany({sessions,sets});set({sessions,sets});},
    addSets(sessionId,rows){
      const session=get().sessions.find((entry)=>entry.id===sessionId);if(!session)throw new Error('训练已不存在，请重新打开');if(session.endedAt)throw new Error('这场训练已结束，请通过历史详情编辑记录');if(!rows.length)throw new Error('请至少勾选一组已完成的训练');
      if(rows.some((row)=>!get().exercises.some((exercise)=>exercise.id===row.exerciseId)))throw new Error('动作不存在');
      const stamp=clock().toISOString();const previous=get().sets.filter((row)=>row.sessionId===sessionId);
      const sets=[...get().sets,...rows.map((row,index)=>({...row,id:id(),sessionId,index:Math.max(-1,...previous.map((item)=>item.index))+index+1,doneAt:stamp,updatedAt:stamp,demo:false}))];
      const bodyParts=[...new Set(sets.filter((row)=>row.sessionId===sessionId&&!row.isWarmup).map((row)=>get().exercises.find((exercise)=>exercise.id===row.exerciseId)!.category))];
      const sessions=get().sessions.map((entry)=>entry.id===sessionId?{...entry,bodyParts,updatedAt:stamp}:entry);
      port.setMany({sessions,sets});set({sessions,sets});
    },
    updateSet(setId,patch){
      const previous=get().sets.find((row)=>row.id===setId);if(!previous)throw new Error('这组记录已不存在');const stamp=clock().toISOString();
      const sets=get().sets.map((row)=>row.id===setId?{...row,...patch,updatedAt:stamp}:row);
      const bodyParts=[...new Set(sets.filter((row)=>row.sessionId===previous.sessionId&&!row.isWarmup).flatMap((row)=>{const ex=get().exercises.find((entry)=>entry.id===row.exerciseId);return ex?[ex.category]:[];}))];
      const sessions=get().sessions.map((session)=>session.id===previous.sessionId?{...session,bodyParts,updatedAt:stamp}:session);
      port.setMany({sets,sessions});set({sets,sessions});
    },
    removeSet(setId){
      const previous=get().sets.find((row)=>row.id===setId);if(!previous)return;const sets=get().sets.filter((row)=>row.id!==setId);
      const bodyParts=[...new Set(sets.filter((row)=>row.sessionId===previous.sessionId&&!row.isWarmup).flatMap((row)=>{const ex=get().exercises.find((entry)=>entry.id===row.exerciseId);return ex?[ex.category]:[];}))];
      const sessions=get().sessions.map((session)=>session.id===previous.sessionId?{...session,bodyParts,updatedAt:clock().toISOString()}:session);
      port.setMany({sets,sessions});set({sets,sessions});
    },
    saveExercise(exercise){if(!exercise.name.trim())throw new Error('请填写动作名称');const next={...exercise,name:exercise.name.trim(),demo:false,updatedAt:clock().toISOString()};const exercises=[...get().exercises.filter((row)=>row.id!==next.id),next];port.set('exercises',exercises);set({exercises});},
    saveBody(metric){const previous=get().bodyMetrics.find((row)=>row.date===metric.date);const bodyMetrics=[...get().bodyMetrics.filter((row)=>row.date!==metric.date),{...previous,...metric,updatedAt:clock().toISOString(),demo:false}];port.set('bodyMetrics',bodyMetrics);set({bodyMetrics});},
    reload(){set({...read(),restUntil:null});},
  }));
}
export type FitnessStore=ReturnType<typeof createFitnessStore>;
export const FitnessContext=createContext<FitnessStore|null>(null);
export function useFitnessStore<T>(selector:(state:FitnessState)=>T):T{const store=useContext(FitnessContext);if(!store)throw new Error('健身尚未初始化');return useStore(store,selector);}
