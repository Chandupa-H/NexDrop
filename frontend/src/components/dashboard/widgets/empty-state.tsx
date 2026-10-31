import { iconMap } from "../shell/icon-map";
import type { NavIconName } from "@/lib/dashboard/types";
import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: NavIconName;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  const Icon = iconMap[icon];
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-[var(--dashboard-neutral-bg)] flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-[var(--dashboard-neutral-text)]" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--dashboard-text)] mb-2">{title}</h3>
      <p className="text-sm text-[var(--dashboard-muted)] mb-4 max-w-md">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
