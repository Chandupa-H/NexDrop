import type { ReactNode } from "react";

export function PageContainer({ children }: { children: ReactNode }) {
  return (
    <div className="dashboard-page-container">
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="dashboard-page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && (
          <p>{subtitle}</p>
        )}
      </div>
      {action && <div className="dashboard-page-header-action">{action}</div>}
    </div>
  );
}
