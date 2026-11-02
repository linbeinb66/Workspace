export type ID = string;
export type DateStr = string;
export type TimeStr = string;
export interface EntityMeta { demo?: boolean; updatedAt: string }
export interface Appearance {
  palette: 'forest'|'ocean'|'lavender'|'sunset'; backdrop: 'plain'|'gradient'; dim: number; blur: number; motion: boolean;
  glassOpacity?: number; glassBlur?: number; renderMode?: 'smooth'|'balanced'|'detail';
  wallpaper?: { key:string;name:string;kind:'image'|'video';size:number;type:string };
}
export interface Settings extends EntityMeta {
  dayStartHour: number; unit: 'kg' | 'lb'; theme: 'system' | 'light' | 'dark';
  weekStart: 0 | 1; bodyWeightKg?: number; targetWeightKg?: number;
  defaultReportTemplateId: ID; restTimerSec: number; autoCarryOverTodo: boolean;
  sleepTargetTime: TimeStr; lastBackupAt?: string; backupDismissedAt?: string;
  dayStartChangedAt?: string; greeting?: string; appearance?: Appearance;
  activeTrainingPlanId?: string;
  trainingPlans?: SavedTrainingPlan[];
  expenseTab?: 'reimburse'|'personal';
}
export interface PlanItem { exerciseId: ID; targetSets: number; repMin: number; repMax: number; restSec: number }
export interface TrainingDay { id: ID; name: string; items: PlanItem[] }
export interface TrainingPlan { id: ID; name: string; description: string; days: TrainingDay[] }
export interface SavedTrainingPlan extends TrainingPlan, EntityMeta {}
export interface SessionPlan { planId: ID; planName: string; dayId: ID; dayName: string; items: PlanItem[] }
export interface ScheduleItem extends EntityMeta {
  id: ID; date: DateStr; start: TimeStr; end?: TimeStr; title: string; note?: string;
  category: 'routine' | 'work' | 'study' | 'fitness' | 'rest'; done: boolean;
}
export interface Todo extends EntityMeta {
  id: ID; date: DateStr; title: string; priority: 'high' | 'medium' | 'low';
  done: boolean; dueDate?: DateStr; carriedFrom?: DateStr; carryCount: number;
}
export interface ImportantItem extends EntityMeta {
  id: ID; date: DateStr; title: string; priority: 'high' | 'medium' | 'low';
  window?: { start: TimeStr; end: TimeStr }; done: boolean;
}
export interface Habit extends EntityMeta { id: ID; name: string; icon: string; target: number; unit: string }
export interface HabitLog extends EntityMeta { habitId: ID; date: DateStr; value: number; target?: number }
export interface Exercise extends EntityMeta {
  id: ID; name: string; nameEn?: string;
  category: '胸' | '背' | '腿' | '肩' | '手臂' | '核心' | '有氧';
  equipment: '杠铃' | '哑铃' | '器械' | '绳索' | '自重'; isCompound: boolean;
  increment: number; repMin: number; repMax: number; targetSets: number;
  startWeight?: number; source: 'seed' | 'custom';
}
export interface Session extends EntityMeta {
  id: ID; date: DateStr; title: string; bodyParts: string[];
  durationMin?: number; startedAt?: string; endedAt?: string; note?: string;
  plan?: SessionPlan; planCompleted?: boolean;
}
export interface SetLog extends EntityMeta {
  id: ID; sessionId: ID; exerciseId: ID; index: number; weight: number;
  reps: number; rpe?: number; isWarmup: boolean; doneAt: string;
}
export interface BodyMetric extends EntityMeta { date: DateStr; weightKg?: number; bodyFat?: number; waistCm?: number; chestCm?: number; shoulderCm?: number; upperArmCm?: number }
export interface Recommendation {
  exerciseId: ID; weight: number; repsMin: number; repsMax: number; sets: number;
  delta: number; reason: string; confidence: 'low' | 'mid' | 'high'; progress?: string;
  basedOn?: { date: DateStr; sets: { weight: number; reps: number; rpe?: number }[] };
}
export interface Word extends EntityMeta {
  id: ID; word: string; phonetic: string; pos: string; cn: string;
  example: string; exampleCn: string; synonyms: string[]; level: 'CET4' | '职场' | '日常';
}
export interface WordProgress extends EntityMeta {
  wordId: ID; stage: 0 | 1 | 2 | 3 | 4 | 5; nextReview: DateStr;
  lastResult: 'know' | 'fuzzy' | 'unknown'; wrongCount: number; lastAdvancedDate?: DateStr;
  inNotebook?: boolean;
}
export interface Sentence extends EntityMeta { id: ID; en: string; cn: string; tag: string }
export interface Passage extends EntityMeta { id: ID; title: string; en: string; cn: string }
export interface GrammarQuestion extends EntityMeta {
  id: ID; stem: string; options: { key: string; text: string }[]; answer: string; explain: string;
}
export interface StudyLog extends EntityMeta {
  date: DateStr; newWords: number; reviews: number; sentences: number; minutes: number; grammarDone: boolean;
}
export interface StudyQueue extends EntityMeta {
  date: DateStr; newWordIds: ID[]; reviewWordIds: ID[]; completedWordIds: ID[];
  retryWordIds: ID[]; sentenceIds: ID[]; passageId?: ID; grammarIds: ID[];
  retryCompletedWordIds?: ID[]; notebookCompletedWordIds?: ID[];
  grammarAnswers?: {questionId:ID;selected:string}[];
}
export interface ShadowingLog extends EntityMeta { id: ID; date: DateStr; sentenceId: ID; done: boolean }
export interface Mistake extends EntityMeta { id: ID; date: DateStr; questionId: ID; selected: string; resolved: boolean }
export interface Expense extends EntityMeta {
  id: ID; kind: 'reimburse' | 'personal'; date: DateStr; title: string;
  category: string; amountCents: number; payMethod?: string;
  status?: 'pending' | 'submitted' | 'reviewing' | 'paid' | 'rejected';
  ticketNo?: string; expectDate?: DateStr; receiptIds: ID[]; note?: string; createdAt: string; paidAt?: string;
}
export interface ReceiptImage extends EntityMeta {
  id: ID; key: string; thumbKey: string; width: number; height: number; size: number;
}
export interface Report extends EntityMeta {
  id: ID; date: DateStr; type: 'daily' | 'weekly'; done: string[];
  undone: { text: string; reason: string }[];
  metrics: { label: string; value: string; agg?: 'sum' | 'max' | 'last' | 'list' }[];
  problems: string; tomorrow: string[]; support: string; templateId: ID;
  copiedAt?: string; sourceItemIds?: ID[]; periodEnd?: DateStr;
}
export interface ReportTemplate extends EntityMeta { id: ID; name: string; body: string; builtin: boolean; mode: 'block' | 'inline' | 'kv'; baseTemplateId?: ID }
export interface Database {
  settings: Settings; schedule: ScheduleItem[]; todos: Todo[]; importantItems: ImportantItem[];
  habits: Habit[]; habitLogs: HabitLog[]; exercises: Exercise[]; sessions: Session[]; sets: SetLog[];
  bodyMetrics: BodyMetric[]; words: Word[]; wordProgress: WordProgress[]; studyLogs: StudyLog[];
  studyQueue: StudyQueue[]; shadowingLogs: ShadowingLog[]; mistakes: Mistake[];
  expenses: Expense[]; receipts: ReceiptImage[]; reports: Report[]; templates: ReportTemplate[];
}
export const DATA_KEYS = [
  'settings', 'schedule', 'todos', 'importantItems', 'habits', 'habitLogs',
  'exercises', 'sessions', 'sets', 'bodyMetrics', 'words', 'wordProgress',
  'studyLogs', 'studyQueue', 'shadowingLogs', 'mistakes', 'expenses', 'receipts', 'reports', 'templates',
] as const satisfies readonly (keyof Database)[];
export type DataKey = typeof DATA_KEYS[number];
export interface Meta { schemaVersion: number; initialized: boolean; initializedAt: string; lastModifiedAt: string }
