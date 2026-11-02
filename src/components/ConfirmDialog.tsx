import { useState, type ReactNode } from 'react';
import { Sheet } from './Sheet';
import { useToast } from './Toast';

export function ConfirmDialog({ open, title, children, confirmLabel = '确认', destructive = false, onConfirm, onClose }: {
  open: boolean; title: string; children: ReactNode; confirmLabel?: string; destructive?: boolean;
  onConfirm: () => void | Promise<void>; onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    try { await onConfirm(); onClose(); }
    catch (error) { toast(error instanceof Error ? error.message : '操作失败，请重试', true); }
    finally { setBusy(false); }
  };
  return <Sheet open={open} title={title} dialog busy={busy} onClose={onClose} footer={<div className="grid grid-cols-2 gap-3">
    <button className="btn btn-secondary" onClick={onClose} disabled={busy}>取消</button>
    <button className={`btn ${destructive ? 'btn-danger' : 'btn-primary'}`} onClick={() => void confirm()} disabled={busy}>{busy ? '处理中…' : confirmLabel}</button>
  </div>}>{children}</Sheet>;
}
