type Tone = "success" | "info" | "teal" | "warning" | "danger" | "neutral";

const toneClasses: Record<Tone, { bg: string; text: string }> = {
  success: { bg: "bg-[var(--dashboard-success-bg)]", text: "text-[var(--dashboard-success-text)]" },
  info: { bg: "bg-[var(--dashboard-info-bg)]", text: "text-[var(--dashboard-info-text)]" },
  teal: { bg: "bg-[var(--dashboard-teal-bg)]", text: "text-[var(--dashboard-teal-text)]" },
  warning: { bg: "bg-[var(--dashboard-warning-bg)]", text: "text-[var(--dashboard-warning-text)]" },
  danger: { bg: "bg-[var(--dashboard-danger-bg)]", text: "text-[var(--dashboard-danger-text)]" },
  neutral: { bg: "bg-[var(--dashboard-neutral-bg)]", text: "text-[var(--dashboard-neutral-text)]" },
};

export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  const classes = toneClasses[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${classes.bg} ${classes.text}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}
