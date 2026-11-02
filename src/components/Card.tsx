import type { ReactNode } from 'react';

export function Card({ title, subtitle, action, children, className = '', id }: {
  title?: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string; id?: string;
}) {
  return <section id={id} className={`workbench-card rounded-card border border-line/70 bg-surface p-5 shadow-card sm:p-6 ${className}`}>
    {(title || action) && <div className="mb-5 flex items-start justify-between gap-3">
      <div>{title && <h2 className="text-title">{title}</h2>}{subtitle && <p className="mt-1 text-caption text-muted">{subtitle}</p>}</div>{action}
    </div>}{children}
  </section>;
}
