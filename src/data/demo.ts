import type { Database, Exercise, Settings, Word } from '../types';
import { calendarDate, workDate } from '../lib/date';
import { id } from '../lib/id';
import exercises from './exercises.seed.json';
import words from './words.json';
import { defaultHabits } from './habits';
import { defaultTemplates } from './templates';

export function defaultSettings(updatedAt: string): Settings {
  return { dayStartHour: 4, unit: 'kg', theme: 'system', weekStart: 1,
    defaultReportTemplateId: 'builtin-daily', restTimerSec: 90, autoCarryOverTodo: true,
    sleepTargetTime: '01:00', demo: false, updatedAt };
}
export function emptyDatabase(updatedAt: string): Database {
  return { settings: defaultSettings(updatedAt), schedule: [], todos: [], importantItems: [],
    habits: [], habitLogs: [], exercises: [], sessions: [], sets: [], bodyMetrics: [], words: [],
    wordProgress: [], studyLogs: [], studyQueue: [], shadowingLogs: [], mistakes: [],
    expenses: [], receipts: [], reports: [], templates: [] };
}
export function initialDatabase(now: Date, withDemo = true): Database {
  const stamp = now.toISOString();
  const db = emptyDatabase(stamp);
  const base = { demo: false, updatedAt: stamp };
  db.habits = defaultHabits(stamp);
  db.templates = defaultTemplates(stamp);
  db.exercises = exercises.map((entry) => ({ ...entry, ...base })) as Exercise[];
  db.words = words.map((entry) => ({ ...entry, ...base })) as Word[];
  if (withDemo) {
    const sample = { demo: true, updatedAt: stamp };
    db.schedule = [
      { ...sample, id: id(), date: workDate(now), start: '16:00', end: '17:00', title: '直播前准备', category: 'work', done: false },
      { ...sample, id: id(), date: workDate(now), start: '21:00', end: '23:30', title: '晚间团播', category: 'work', done: false },
      { ...sample, id: id(), date: workDate(now), start: '01:00', title: '收工，好好休息', category: 'routine', done: false },
    ];
    db.expenses = [
      { ...sample, id: id(), kind: 'reimburse', date: calendarDate(now), title: '打车去直播基地', category: '交通', amountCents: 3600, status: 'pending', receiptIds: [], payMethod: '微信', createdAt: stamp },
      { ...sample, id: id(), kind: 'personal', date: calendarDate(now), title: '收工后的晚餐', category: '餐饮', amountCents: 2800, receiptIds: [], payMethod: '支付宝', createdAt: stamp },
    ];
  }
  return db;
}
