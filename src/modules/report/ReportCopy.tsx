import { useState } from 'react';
import type { Report } from '../../types';
import { missingReasons } from '../../domain/report';
import { copyText } from '../../lib/copy';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Icon } from '../../components/Icon';
import { useToast } from '../../components/Toast';
import { useReportStore } from './store';

export function ReportCopy({ report, text }: { report: Report; text: string }) {
  const markCopied = useReportStore((state) => state.markCopied);
  const [confirm, setConfirm] = useState(false); const [busy, setBusy] = useState(false);
  const toast = useToast(); const missing = missingReasons(report);
  const copy = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await copyText(text);
      try { markCopied(report.id); toast('已复制，去群里粘贴吧'); }
      catch { toast('复制已成功，但复制状态未保存，请检查本机存储空间', true); }
    } finally { setBusy(false); }
  };
  const start = async () => {
    if (missing) { setConfirm(true); return; }
    try { await copy(); } catch (error) { toast(error instanceof Error ? error.message : '复制失败，请重试', true); }
  };
  return <><button className="btn btn-primary" disabled={busy || !text.trim()} title={!text.trim() ? '先填点内容' : undefined} onClick={() => void start()}><Icon name="copy" width="19" height="19" />{busy ? '正在复制…' : report.type === 'daily' ? '复制日报' : '复制周报'}</button>
    <ConfirmDialog open={confirm} title={`还有 ${missing} 条没写原因，仍要复制吗`} confirmLabel="仍要复制" onClose={() => setConfirm(false)} onConfirm={copy}><p className="text-muted">可以先发，之后再回来补充原因。未填写的原因会标为“原因待补”。</p></ConfirmDialog>
  </>;
}
