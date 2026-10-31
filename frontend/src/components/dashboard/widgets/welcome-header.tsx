import { Package } from "lucide-react";
import type { ReactNode } from "react";

export function WelcomeHeader({
  greeting,
  name,
  subtitle,
  aside,
}: {
  greeting: string;
  name: string;
  subtitle: string;
  aside?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 flex-wrap">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-[var(--dashboard-primary)] flex items-center justify-center">
          <Package className="w-7 h-7 text-white" />
        </div>
        <div>
          <p className="text-sm text-[var(--dashboard-muted)]">{greeting}</p>
          <h1 className="text-3xl font-bold text-[var(--dashboard-text)]">{name}</h1>
          <p className="text-sm text-[var(--dashboard-muted)] mt-1">{subtitle}</p>
        </div>
      </div>
      {aside && <div>{aside}</div>}
    </div>
  );
}
