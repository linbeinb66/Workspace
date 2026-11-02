import type { Habit } from '../types';

export function defaultHabits(updatedAt: string): Habit[] {
  return [
    { id: 'habit-move', name: '运动', icon: '🏃', target: 30, unit: '分钟' },
    { id: 'habit-english', name: '英语', icon: '🎧', target: 20, unit: '分钟' },
    { id: 'habit-read', name: '阅读', icon: '📖', target: 30, unit: '分钟' },
    { id: 'habit-water', name: '喝水', icon: '💧', target: 8, unit: '杯' },
    { id: 'habit-sleep', name: '按目标时间入睡', icon: '🌙', target: 1, unit: '次' },
  ].map((habit) => ({ ...habit, updatedAt, demo: false }));
}
