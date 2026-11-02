import { createContext, useContext } from 'react';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type { Database, Habit, ImportantItem, ScheduleItem, Todo } from '../../types';
import type { OwnedStorage } from '../../lib/storage';
import { id } from '../../lib/id';
import { carryTodos, copyYesterday } from '../../domain/plan';

type PlanKey = 'schedule' | 'todos' | 'importantItems' | 'habits' | 'habitLogs';
type Editable<T> = Omit<T, 'id' | 'demo' | 'updatedAt'> & { id?: string };
export type ScheduleDraft = Editable<ScheduleItem>;
export type TodoDraft = Editable<Todo>;
export type ImportantDraft = Editable<ImportantItem>;
export type HabitDraft = Editable<Habit>;
export interface PlanState extends Pick<Database, PlanKey> {
  dataRevision: number;
  saveSchedule: (draft: ScheduleDraft) => void; saveTodo: (draft: TodoDraft) => void;
  saveImportant: (draft: ImportantDraft) => void; saveHabit: (draft: HabitDraft) => void;
  remove: (kind: 'schedule' | 'todos' | 'importantItems' | 'habits', id: string) => void;
  toggle: (kind: 'schedule' | 'todos' | 'importantItems', id: string) => void;
  carry: (date: string, selected?: readonly string[], sourceDate?: string) => number;
  copyPrevious: (date: string) => number;
  setHabitValue: (habitId: string, date: string, value: number, target: number) => void;
  reload: () => void;
}
export function createPlanStore(port: OwnedStorage<PlanKey>, clock: () => Date = () => new Date()) {
  const read = (): Pick<Database, PlanKey> => ({ schedule: port.get('schedule', []), todos: port.get('todos', []),
    importantItems: port.get('importantItems', []), habits: port.get('habits', []), habitLogs: port.get('habitLogs', []) });
  return createStore<PlanState>((set, get) => {
    const write = <K extends PlanKey>(key: K, value: Database[K]) => { port.set(key, value); set({ [key]: value } as Pick<PlanState, K>); };
    const save = <K extends 'schedule' | 'todos' | 'importantItems' | 'habits'>(key: K, draft: Editable<Database[K][number]>) => {
      const rows = get()[key];
      const existing = draft.id ? rows.find((item) => item.id === draft.id) : undefined;
      if (draft.id && !existing) throw new Error('记录已经变化，请关闭后重新打开');
      const next = { ...draft, id: draft.id ?? id(), demo: existing?.demo ?? false, updatedAt: clock().toISOString() };
      write(key, (existing ? rows.map((item) => item.id === next.id ? next : item) : [...rows, next]) as Database[K]);
    };
    return { ...read(), dataRevision: 0,
      saveSchedule: (draft) => save('schedule', draft),
      saveTodo(draft) {
        const current = draft.id ? get().todos.find((item) => item.id === draft.id) : undefined;
        // 编辑抽屉跨过日切时，保留协调器已完成的顺延，不让旧草稿搬回昨天。
        save('todos', current ? { ...draft, date: current.date, carriedFrom: current.carriedFrom, carryCount: current.carryCount } : draft);
      },
      saveImportant: (draft) => save('importantItems', draft), saveHabit: (draft) => save('habits', draft),
      remove(kind, identity) { write(kind, get()[kind].filter((item) => item.id !== identity) as Database[typeof kind]); },
      toggle(kind, identity) { write(kind, get()[kind].map((item) => item.id === identity ? { ...item, done: !item.done, updatedAt: clock().toISOString() } : item) as Database[typeof kind]); },
      carry(date, selected, sourceDate) {
        const before = get().todos;
        const next = carryTodos(before, date, clock().toISOString(), selected, sourceDate);
        if (next === before) return 0;
        write('todos', next);
        return next.filter((item, index) => item !== before[index]).length;
      },
      copyPrevious(date) {
        const before = get().schedule;
        const next = copyYesterday(before, date, before.map(() => id()), clock().toISOString());
        if (next !== before) write('schedule', next);
        return next.length - before.length;
      },
      setHabitValue(habitId, date, value, target) {
        if (!get().habits.some((habit) => habit.id === habitId)) throw new Error('这个习惯已经被删除');
        if (!Number.isFinite(value) || value < 0 || value > 99999) throw new Error('请输入 0～99999 之间的数值');
        const existing = get().habitLogs.find((log) => log.date === date && log.habitId === habitId);
        const next = { habitId, date, value, target, updatedAt: clock().toISOString(), demo: existing?.demo ?? false };
        write('habitLogs', existing ? get().habitLogs.map((log) => log === existing ? next : log) : [...get().habitLogs, next]);
      },
      reload() { set({ ...read(), dataRevision: get().dataRevision + 1 }); },
    };
  });
}
export type PlanStore = ReturnType<typeof createPlanStore>;
export const PlanContext = createContext<PlanStore | null>(null);
export function usePlanStore<T>(selector: (state: PlanState) => T): T {
  const store = useContext(PlanContext);
  if (!store) throw new Error('计划尚未初始化');
  return useStore(store, selector);
}
