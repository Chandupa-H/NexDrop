import Link from "next/link";
import { NexDropLogo } from "@/components/shared/nexdrop-logo";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`dashboard-brand focus:outline-none ${className ?? ""}`}
      aria-label="NexDrop Home"
    >
      <span className="sr-only">NexDrop</span>
      <div aria-hidden="true">
        <NexDropLogo variant="dark" size="sm" />
      </div>
    </Link>
  );
}
