import { createContext, useContext } from 'react';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type { Settings, TrainingPlan } from '../../types';
import { trainingPlanCatalog, trainingPlanError } from '../../domain/trainingPlan';
import type { OwnedStorage } from '../../lib/storage';
import { defaultSettings } from '../../data/demo';

export interface SettingsState {
  settings: Settings;
  update: (patch: Partial<Omit<Settings, 'updatedAt' | 'demo'>>) => void;
  saveTrainingPlan:(plan:TrainingPlan)=>void;
  removeTrainingPlan:(planId:string)=>void;
  reload: () => void;
}
// 传入的端口在类型和运行时都只能访问 settings，store 无法写其他分区。
export function createSettingsStore(port: OwnedStorage<'settings'>, clock: () => Date = () => new Date()) {
  const read = () => port.get('settings', defaultSettings(clock().toISOString()));
  return createStore<SettingsState>((set, get) => ({
    settings: read(),
    update(patch) {
      const previous = get().settings;
      const stamp = clock().toISOString();
      const next: Settings = { ...previous, ...patch, updatedAt: stamp };
      if (patch.dayStartHour !== undefined && patch.dayStartHour !== previous.dayStartHour) next.dayStartChangedAt = stamp;
      port.set('settings', next);
      set({ settings: next });
    },
    saveTrainingPlan(plan){
      const error=trainingPlanError(plan);if(error)throw new Error(error);
      const previous=get().settings;const stamp=clock().toISOString();
      const catalog=trainingPlanCatalog(previous.trainingPlans,previous.updatedAt);
      const next={...structuredClone(plan),name:plan.name.trim(),description:plan.description.trim(),days:plan.days.map((day)=>({...day,name:day.name.trim(),items:day.items.map((item)=>({...item}))})),updatedAt:stamp,demo:false};
      get().update({trainingPlans:catalog.some((entry)=>entry.id===plan.id)?catalog.map((entry)=>entry.id===plan.id?next:entry):[...catalog,next],activeTrainingPlanId:plan.id});
    },
    removeTrainingPlan(planId){
      const previous=get().settings;const catalog=trainingPlanCatalog(previous.trainingPlans,previous.updatedAt).filter((plan)=>plan.id!==planId);
      const active=catalog.find((plan)=>plan.id===previous.activeTrainingPlanId)??catalog[0];
      get().update({trainingPlans:catalog,activeTrainingPlanId:active?.id});
    },
    reload() { set({ settings: read() }); },
  }));
}
export type SettingsStore = ReturnType<typeof createSettingsStore>;
export const selectTheme = (state: SettingsState) => state.settings.theme;
export const SettingsContext = createContext<SettingsStore | null>(null);
export function useSettingsStore<T>(selector: (state: SettingsState) => T): T {
  const store = useContext(SettingsContext);
  if (!store) throw new Error('设置尚未初始化');
  return useStore(store, selector);
}
