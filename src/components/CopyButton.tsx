import { useState } from 'react';
import { copyText } from '../lib/copy';
import { Icon } from './Icon';
import { useToast } from './Toast';

export function CopyButton({ text, label = '复制', onCopied }: { text: string; label?: string; onCopied?: () => void }) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const copy = async () => {
    if (busy) return;
    setBusy(true);
    try { await copyText(text); onCopied?.(); toast('已复制，去群里粘贴吧'); }
    catch (error) { toast(error instanceof Error ? error.message : '复制失败，请重试', true); }
    finally { setBusy(false); }
  };
  return <button className="btn btn-primary" onClick={() => void copy()} disabled={busy || !text.trim()} title={!text.trim() ? '先填点内容' : undefined}>
    <Icon name="copy" />{busy ? '正在复制…' : label}
  </button>;
}
