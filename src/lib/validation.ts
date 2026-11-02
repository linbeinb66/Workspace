import { DATA_KEYS, type Database, type DataKey, type Meta } from '../types';
import { trainingPlanError } from '../domain/trainingPlan';
import type { TrainingPlan } from '../types';

type Guard = (value: unknown) => boolean;
const text: Guard = (v) => typeof v === 'string';
const nonempty: Guard = (v) => text(v) && (v as string).trim().length > 0;
const bool: Guard = (v) => typeof v === 'boolean';
const number: Guard = (v) => typeof v === 'number' && Number.isFinite(v);
const nonnegative: Guard = (v) => number(v) && (v as number) >= 0;
const integer: Guard = (v) => Number.isSafeInteger(v) && (v as number) >= 0;
const positive: Guard = (v) => number(v) && (v as number) > 0;
const positiveInt: Guard = (v) => integer(v) && (v as number) > 0;
export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const choices = (...values: readonly unknown[]): Guard => (v) => values.includes(v);
const list = (guard: Guard): Guard => (v) => Array.isArray(v) && v.every(guard);
const optional = (guard: Guard): Guard => (v) => v === undefined || guard(v);
const object = (shape: Record<string, Guard>): Guard => (v) => isRecord(v)
  && Object.keys(v).every((key) => Object.hasOwn(shape, key))
  && Object.entries(shape).every(([key, guard]) => guard(v[key]));
const stamp: Guard = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v));
const date: Guard = (v) => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const parsed = new Date(`${v}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === v;
};
const time: Guard = (v) => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const meta = { demo: optional(bool), updatedAt: stamp };
const entity = { ...meta, id: nonempty };
const priority = choices('high', 'medium', 'low');
const strings = list(nonempty);
const optionalText = optional(text);
const planItem=object({exerciseId:nonempty,targetSets:positiveInt,repMin:positiveInt,repMax:positiveInt,restSec:integer});
const sessionPlan=object({planId:nonempty,planName:nonempty,dayId:nonempty,dayName:nonempty,items:(v)=>Array.isArray(v)&&v.length>0&&v.every((item)=>planItem(item)&&isRecord(item)&&(item.repMax as number)>=(item.repMin as number))&&new Set(v.map((item:Record<string,unknown>)=>item.exerciseId)).size===v.length});
const savedPlan:Guard=(v)=>object({...entity,name:nonempty,description:text,days:list(object({id:nonempty,name:nonempty,items:list(planItem)}))})(v)&&trainingPlanError(v as TrainingPlan)===null;
const guards: Record<DataKey, Guard> = {
  settings: object({ ...meta, dayStartHour: choices(0, 1, 2, 3, 4, 5, 6), unit: choices('kg', 'lb'),
    theme: choices('system', 'light', 'dark'), weekStart: choices(0, 1), bodyWeightKg: optional(positive),
    targetWeightKg: optional(positive), defaultReportTemplateId: nonempty, restTimerSec: choices(0, 60, 90, 120, 180),
    autoCarryOverTodo: bool, sleepTargetTime: time, lastBackupAt: optional(stamp), backupDismissedAt: optional(stamp),
    dayStartChangedAt: optional(stamp), greeting: optional((v) => text(v) && (v as string).length <= 60), activeTrainingPlanId:optional(nonempty),
    trainingPlans:optional((v)=>Array.isArray(v)&&v.every(savedPlan)&&new Set(v.map((plan:Record<string,unknown>)=>plan.id)).size===v.length),
    expenseTab:optional(choices('reimburse','personal')),
    appearance: optional(object({ palette:choices('forest','ocean','lavender','sunset'),backdrop:choices('plain','gradient'),dim:(v)=>number(v)&&(v as number)>=0.25&&(v as number)<=0.9,blur:(v)=>number(v)&&(v as number)>=0&&(v as number)<=20,motion:bool,
      glassOpacity:optional((v)=>number(v)&&(v as number)>=0.25&&(v as number)<=0.9),glassBlur:optional((v)=>number(v)&&(v as number)>=0&&(v as number)<=20),renderMode:optional(choices('smooth','balanced','detail')),
      wallpaper:optional(object({key:nonempty,name:nonempty,kind:choices('image','video'),size:positiveInt,type:nonempty})) })) }),
  schedule: list(object({ ...entity, date, start: time, end: optional(time), title: nonempty, note: optionalText,
    category: choices('routine', 'work', 'study', 'fitness', 'rest'), done: bool })),
  todos: list(object({ ...entity, date, title: nonempty, priority, done: bool, dueDate: optional(date), carriedFrom: optional(date), carryCount: integer })),
  importantItems: list(object({ ...entity, date, title: nonempty, priority,
    window: optional(object({ start: time, end: time })), done: bool })),
  habits: list(object({ ...entity, name: nonempty, icon: text, target: positive, unit: nonempty })),
  habitLogs: list(object({ ...meta, habitId: nonempty, date, value: nonnegative, target: optional(positive) })),
  exercises: list((v) => object({ ...entity, name: nonempty, nameEn: optionalText,
    category: choices('胸', '背', '腿', '肩', '手臂', '核心', '有氧'), equipment: choices('杠铃', '哑铃', '器械', '绳索', '自重'),
    isCompound: bool, increment: positive, repMin: positiveInt, repMax: positiveInt, targetSets: positiveInt,
    startWeight: optional(nonnegative), source: choices('seed', 'custom') })(v)
    && isRecord(v) && (v.repMax as number) >= (v.repMin as number)),
  sessions: list(object({ ...entity, date, title: nonempty, bodyParts: strings, durationMin: optional(nonnegative),
    startedAt: optional(stamp), endedAt: optional(stamp), note: optionalText,plan:optional(sessionPlan),planCompleted:optional(bool) })),
  sets: list(object({ ...entity, sessionId: nonempty, exerciseId: nonempty, index: integer, weight: nonnegative,
    reps: integer, rpe: optional((v) => number(v) && (v as number) >= 1 && (v as number) <= 10), isWarmup: bool, doneAt: stamp })),
  bodyMetrics: list((v)=>object({ ...meta, date, weightKg: optional(positive), bodyFat: optional(nonnegative), waistCm: optional(positive),chestCm:optional(positive),shoulderCm:optional(positive),upperArmCm:optional(positive) })(v)&&isRecord(v)&&['weightKg','bodyFat','waistCm','chestCm','shoulderCm','upperArmCm'].some((key)=>v[key]!==undefined)),
  words: list(object({ ...entity, word: nonempty, phonetic: text, pos: text, cn: nonempty,
    example: text, exampleCn: text, synonyms: strings, level: choices('CET4', '职场', '日常') })),
  wordProgress: list(object({ ...meta, wordId: nonempty, stage: choices(0, 1, 2, 3, 4, 5), nextReview: date,
    lastResult: choices('know', 'fuzzy', 'unknown'), wrongCount: integer, lastAdvancedDate: optional(date),inNotebook:optional(bool) })),
  studyLogs: list(object({ ...meta, date, newWords: integer, reviews: integer, sentences: integer, minutes: nonnegative, grammarDone: bool })),
  studyQueue: list((v)=>{
    if(!object({ ...meta, date, newWordIds: strings, reviewWordIds: strings, completedWordIds: strings,
      retryWordIds: strings, sentenceIds: strings, passageId: optional(nonempty), grammarIds: strings,retryCompletedWordIds:optional(strings),notebookCompletedWordIds:optional(strings),grammarAnswers:optional(list(object({questionId:nonempty,selected:nonempty}))) })(v)||!isRecord(v))return false;
    const queue=v as unknown as Database['studyQueue'][number];
    const lists=[queue.newWordIds,queue.reviewWordIds,queue.completedWordIds,queue.retryWordIds,queue.sentenceIds,queue.grammarIds,queue.retryCompletedWordIds??[],queue.notebookCompletedWordIds??[]];
    const scheduled=new Set([...queue.newWordIds,...queue.reviewWordIds]);const answers=queue.grammarAnswers??[];
    return lists.every((items)=>new Set(items).size===items.length)&&scheduled.size===queue.newWordIds.length+queue.reviewWordIds.length
      &&queue.completedWordIds.every((id)=>scheduled.has(id))&&queue.retryWordIds.every((id)=>queue.completedWordIds.includes(id))
      &&(queue.retryCompletedWordIds??[]).every((id)=>queue.retryWordIds.includes(id))
      &&new Set(answers.map((entry)=>entry.questionId)).size===answers.length&&answers.every((entry)=>queue.grammarIds.includes(entry.questionId));
  }),
  shadowingLogs: list(object({ ...entity, date, sentenceId: nonempty, done: bool })),
  mistakes: list(object({ ...entity, date, questionId: nonempty, selected: text, resolved: bool })),
  expenses: list((v) => object({ ...entity, kind: choices('reimburse', 'personal'), date, title: nonempty,
    category: nonempty, amountCents: integer, payMethod: optionalText, status: optional(choices('pending', 'submitted', 'reviewing', 'paid', 'rejected')),
    ticketNo: optionalText, expectDate: optional(date), receiptIds: strings, note: optionalText, createdAt: stamp, paidAt: optional(stamp) })(v)
    && isRecord(v) && (v.receiptIds as string[]).length <= 3
    && (v.kind !== 'reimburse' || v.status !== undefined)
    && (v.kind !== 'personal' || v.status === undefined)
    && (v.status !== 'paid' || v.paidAt !== undefined)),
  receipts: list(object({ ...entity, key: nonempty, thumbKey: nonempty, width: positiveInt, height: positiveInt, size: positiveInt })),
  reports: list(object({ ...entity, date, type: choices('daily', 'weekly'), done: list(text),
    undone: list(object({ text, reason: text })), metrics: list(object({ label: text, value: text, agg: optional(choices('sum', 'max', 'last', 'list')) })),
    problems: text, tomorrow: list(text), support: text, templateId: nonempty, copiedAt: optional(stamp), sourceItemIds: optional(strings), periodEnd: optional(date) })),
  templates: list(object({ ...entity, name: nonempty, body: text, builtin: bool, mode: choices('block', 'inline', 'kv'), baseTemplateId: optional(nonempty) })),
};

export function assertValue<K extends DataKey>(key: K, value: unknown): asserts value is Database[K] {
  if (!guards[key](value)) throw new Error(`「${key}」数据格式有误，原有数据未被覆盖`);
}
export function assertMeta(value: unknown): asserts value is Meta {
  if (!object({ schemaVersion: positiveInt, initialized: bool, initializedAt: stamp, lastModifiedAt: stamp })(value)) {
    throw new Error('数据版本信息损坏，原有数据已保留');
  }
}
export function assertDatabase(value: unknown): asserts value is Database {
  if (!isRecord(value) || Object.keys(value).length !== DATA_KEYS.length || DATA_KEYS.some((key) => !Object.hasOwn(value, key))) {
    throw new Error('备份的数据分区不完整或含未知分区，原有数据未被覆盖');
  }
  for (const key of DATA_KEYS) {
    assertValue(key, value[key]);
    if (key === 'settings') continue;
    const seen = new Set<string>();
    const items: unknown = value[key];
    if (!Array.isArray(items)) throw new Error(`「${key}」必须是记录列表`);
    for (const item of items) {
      if (!isRecord(item)) throw new Error(`「${key}」包含无效记录`);
      const identity = item.id ?? (item.habitId ? `${item.habitId}/${item.date}` : item.wordId ?? item.date);
      if (typeof identity !== 'string' || seen.has(identity)) throw new Error(`「${key}」包含重复或无效记录`);
      seen.add(identity);
    }
  }
  const database=value as unknown as Database;
  const words=new Set(database.words.map((word)=>word.id));
  if(database.wordProgress.some((entry)=>!words.has(entry.wordId))||database.studyQueue.some((queue)=>[...queue.newWordIds,...queue.reviewWordIds,...(queue.notebookCompletedWordIds??[])].some((id)=>!words.has(id))))throw new Error('英语词条引用缺失，原有数据未被覆盖');
  const receiptIds=new Set(database.receipts.map((entry)=>entry.id));const used=new Set<string>();
  for(const entry of database.expenses){for(const receipt of entry.receiptIds){if(entry.kind!=='reimburse'||!receiptIds.has(receipt)||used.has(receipt))throw new Error('凭证图片引用缺失或重复，原有数据未被覆盖');used.add(receipt);}}
  if(database.receipts.some((entry)=>!used.has(entry.id)||entry.width>1280||entry.height>1280||entry.size>300*1024||entry.key===entry.thumbKey))throw new Error('凭证图片元数据无效，原有数据未被覆盖');
  const exercises=new Set(database.exercises.map((entry)=>entry.id));
  if(database.settings.trainingPlans?.some((plan)=>trainingPlanError(plan,exercises)!==null))throw new Error('自定义训练计划包含不可用的动作，原有数据未被覆盖');
  if(database.sessions.some((session)=>session.plan?.items.some((item)=>!exercises.has(item.exerciseId))))throw new Error('训练计划包含不存在的动作，原有数据未被覆盖');
}
