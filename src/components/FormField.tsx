import type { ReactNode } from 'react';
export function FormField({ label, htmlFor, children, hint }: { label: string; htmlFor: string; children: ReactNode; hint?: string }) {
  return <div><label className="field-label" htmlFor={htmlFor}>{label}</label>{children}{hint && <p className="mt-1 text-caption text-muted">{hint}</p>}</div>;
}
