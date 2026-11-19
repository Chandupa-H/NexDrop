import type { ReactNode } from "react";

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={`dashboard-section-card ${className ?? ""}`.trim()}>
      <div className="dashboard-section-card-header">
        <div>
          <h3>{title}</h3>
          {subtitle && (
            <p>{subtitle}</p>
          )}
        </div>
        {action && <div className="dashboard-section-card-action">{action}</div>}
      </div>
      <div className={`dashboard-section-card-body ${bodyClassName ?? ""}`.trim()}>{children}</div>
    </div>
  );
}
