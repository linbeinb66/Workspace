export async function copyText(text: string): Promise<void> {
  if (!text.trim()) throw new Error('先填点内容');
  try {
    if (!navigator.clipboard?.writeText) throw new Error('剪贴板接口不可用');
    await navigator.clipboard.writeText(text);
    return;
  } catch { /* 使用老浏览器的本地复制方式。 */ }
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const input = document.createElement('textarea');
  input.value = text; input.readOnly = true;
  input.style.cssText = 'position:fixed;left:0;top:0;opacity:0;pointer-events:none;font-size:16px';
  document.body.appendChild(input);
  try {
    input.focus(); input.select(); input.setSelectionRange(0, text.length);
    if (!document.execCommand('copy')) throw new Error('复制失败，请允许浏览器访问剪贴板后重试');
  } finally { input.remove(); previous?.focus(); }
}
