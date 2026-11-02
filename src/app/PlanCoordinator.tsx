import { useEffect } from 'react';
import { useToast } from '../components/Toast';
import { canAutoCarry } from '../domain/plan';
import { useWorkDate } from '../lib/useWorkDate';
import { usePlanStore } from '../modules/plan/store';
import { useSettingsStore } from '../modules/settings/store';

export function PlanCoordinator() {
  const hour = useSettingsStore((state) => state.settings.dayStartHour);
  const enabled = useSettingsStore((state) => state.settings.autoCarryOverTodo);
  const changedAt = useSettingsStore((state) => state.settings.dayStartChangedAt);
  const today = useWorkDate(hour);
  const carry = usePlanStore((state) => state.carry);
  const revision = usePlanStore((state) => state.dataRevision);
  const toast = useToast();
  useEffect(() => {
    if (!enabled || !canAutoCarry(today, hour, changedAt)) return;
    try { carry(today); } catch (error) { toast(error instanceof Error ? error.message : '待办顺延失败，原记录已保留', true); }
  }, [today, hour, enabled, changedAt, carry, revision, toast]);
  return null;
}
