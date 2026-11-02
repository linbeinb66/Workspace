import type { DateStr, Habit, HabitLog, ImportantItem, ScheduleItem, Todo } from '../types';
import { addDays, sortedSchedule } from './plan';
import { scheduleInstant } from '../lib/date';

export interface PlanData {
  schedule: ScheduleItem[]; todos: Todo[]; importantItems: ImportantItem[]; habits: Habit[]; habitLogs: HabitLog[];
}
export function habitGoal(habit: Habit, log: HabitLog | undefined, date: DateStr, today: DateStr): number {
  return date < today ? log?.target ?? habit.target : habit.target;
}
export function streak(dates: ReadonlySet<DateStr>, today: DateStr): number {
  let cursor = dates.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (dates.has(cursor)) { count++; cursor = addDays(cursor, -1); }
  return count;
}
export function habitStreak(habit: Habit, logs: readonly HabitLog[], today: DateStr): number {
  const dates = new Set(logs.filter((log) => log.habitId === habit.id && log.date <= today
    && log.value >= habitGoal(habit, log, log.date, today)).map((log) => log.date));
  return streak(dates, today);
}
export function dashboardStats(data: PlanData, today: DateStr) {
  const tasks = [...data.schedule, ...data.todos].filter((item) => item.date === today);
  const done = tasks.filter((item) => item.done).length;
  const habitDone = data.habits.filter((habit) => data.habitLogs.some((log) => log.date === today && log.habitId === habit.id && log.value >= habit.target)).length;
  const dates = new Set([...data.schedule, ...data.todos, ...data.importantItems].filter((item) => item.done && item.date <= today).map((item) => item.date));
  for (const log of data.habitLogs) {
    const habit = data.habits.find((entry) => entry.id === log.habitId);
    const goal = habit && log.date === today ? habit.target : log.target ?? habit?.target;
    if (goal && log.value >= goal && log.date <= today) dates.add(log.date);
  }
  return { done, total: tasks.length, progress: tasks.length ? Math.ceil(done / tasks.length * 100) : 0,
    habitDone, habitTotal: data.habits.length, streak: streak(dates, today) };
}
export function isOverdue(item: ScheduleItem, now: Date, dayStartHour: number): boolean {
  if (item.done) return false;
  const start = scheduleInstant(item.date, item.start, dayStartHour);
  let deadline = item.end ? scheduleInstant(item.date, item.end, dayStartHour) : start;
  if (item.end && deadline.getTime() <= start.getTime()) deadline = new Date(deadline.getTime() + 86400000);
  return deadline.getTime() < now.getTime();
}
export function upcomingSchedule(items: ScheduleItem[], date: DateStr, now: Date, dayStartHour: number): ScheduleItem[] {
  return sortedSchedule(items, date, dayStartHour).filter((item) => !item.done && scheduleInstant(item.date, item.start, dayStartHour).getTime() > now.getTime());
}
export const destination = (category: ScheduleItem['category']): string => category === 'fitness' ? '/fitness' : category === 'study' ? '/english' : '/plan';
