import type { ReactNode } from "react";

export function SectionCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="dashboard-section-card">
      <div className="dashboard-section-card-header">
        <div>
          <h3>{title}</h3>
          {subtitle && (
            <p>{subtitle}</p>
          )}
        </div>
        {action && <div className="dashboard-section-card-action">{action}</div>}
      </div>
      <div className="dashboard-section-card-body">{children}</div>
    </div>
  );
}
