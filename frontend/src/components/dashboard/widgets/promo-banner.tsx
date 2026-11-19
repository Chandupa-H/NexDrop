import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function PromoBanner({
  title,
  subtitle,
  href,
  onClick,
}: {
  title: string;
  subtitle: string;
  href?: string;
  onClick?: () => void;
}) {
  const buttonContent = <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />;

  return (
    <div className="dashboard-promo-banner group">
      <svg className="dashboard-promo-art" viewBox="0 0 200 120" fill="none" aria-hidden="true">
        <path d="M140 40 L180 60 L140 80 L100 60 Z" fill="url(#box1)" />
        <path d="M140 40 L180 20 L180 60 L140 80 Z" fill="url(#box2)" />
        <path d="M100 60 L140 40 L140 80 Z" fill="url(#box3)" />
        <path d="M60 80 Q120 60 180 90" stroke="var(--dashboard-lime-to)" strokeWidth="3" fill="none" strokeDasharray="8 4" />
        <defs>
          <linearGradient id="box1" x1="100" y1="40" x2="180" y2="80">
            <stop stopColor="var(--dashboard-lime-from)" />
            <stop offset="1" stopColor="var(--dashboard-lime-to)" />
          </linearGradient>
          <linearGradient id="box2" x1="140" y1="20" x2="180" y2="80">
            <stop stopColor="var(--dashboard-chart-green-light)" />
            <stop offset="1" stopColor="var(--dashboard-chart-green-dark)" />
          </linearGradient>
          <linearGradient id="box3" x1="100" y1="40" x2="140" y2="80">
            <stop stopColor="var(--dashboard-lime-to)" />
            <stop offset="1" stopColor="var(--dashboard-chart-green-dark)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="dashboard-promo-content">
        <div className="dashboard-promo-copy">
          <p>{title}</p>
          <p className="dashboard-promo-subtitle">
            {subtitle}
          </p>
        </div>
        {href ? (
          <Link
            href={href}
            className="dashboard-promo-button transition-transform hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dashboard-lime-to)]"
            aria-label={`${title} - ${subtitle}`}
          >
            {buttonContent}
          </Link>
        ) : (
          <button
            type="button"
            onClick={onClick}
            className="dashboard-promo-button"
            aria-label="Learn more"
          >
            {buttonContent}
          </button>
        )}
      </div>
    </div>
  );
}
