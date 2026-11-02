import { dashboardStats, upcomingSchedule, isOverdue } from '../../domain/stats';
import { workDate } from '../../lib/date';
import { useNow } from '../../lib/useWorkDate';
import { usePlanStore } from '../plan/store';
import { useSettingsStore } from '../settings/store';

export function useDashboard() {
  const now = useNow();
  const plan = usePlanStore((state) => state);
  const hour = useSettingsStore((state) => state.settings.dayStartHour);
  const greeting = useSettingsStore((state) => state.settings.greeting);
  const today = workDate(now, hour);
  const upcoming = upcomingSchedule(plan.schedule, today, now, hour);
  const overdue = plan.schedule.filter((item) => item.date === today && isOverdue(item, now, hour)).length;
  return { now, today, hour, stats: dashboardStats(plan, today), upcoming: upcoming.slice(0, 3), next: upcoming[0], overdue,
    greeting: greeting?.trim() || '一件一件来，也很好。' };
}
