import { Icon, type IconName } from './Icon';

export function EmptyState({ icon = 'leaf', title, description, action, href }: {
  icon?: IconName; title: string; description: string; action: string; href: string;
}) {
  return <div className="flex flex-col items-center px-2 py-9 text-center sm:py-14">
    <div className="empty-illustration"><span className="empty-dot" /><Icon name={icon} width="42" height="42" /></div>
    <h2 className="mt-6 text-title">{title}</h2><p className="mt-2 max-w-sm text-muted">{description}</p>
    <a className="btn btn-primary mt-7 min-w-36" href={href}>{action}<Icon name="arrow" width="18" height="18" /></a>
  </div>;
}
