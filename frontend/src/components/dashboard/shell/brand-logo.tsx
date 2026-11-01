export function BrandLogo({ className }: { className?: string }) {
  return (
    <div className={`dashboard-brand ${className ?? ""}`}>
      <svg className="dashboard-brand-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="url(#logoGradient)" />
        <path d="M16 8L22 12V20L16 24L10 20V12L16 8Z" fill="var(--dashboard-sidebar-text)" opacity="0.9" />
        <defs>
          <linearGradient id="logoGradient" x1="0" y1="0" x2="32" y2="32">
            <stop stopColor="var(--dashboard-lime-from)" />
            <stop offset="1" stopColor="var(--dashboard-primary)" />
          </linearGradient>
        </defs>
      </svg>
      <span className="dashboard-brand-name">NexDrop</span>
    </div>
  );
}
