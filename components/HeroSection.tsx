import Link from "next/link";
import type { ReactNode } from "react";

type HeroAction = {
  href: string;
  label: string;
  variant?: "primary" | "secondary";
};

type HeroSectionProps = {
  title: string;
  titleId: string;
  description?: string;
  badge?: string;
  chips?: string[];
  chipsAriaLabel?: string;
  actions?: HeroAction[];
  children?: ReactNode;
};

export default function HeroSection({
  title,
  titleId,
  description,
  badge,
  chips,
  chipsAriaLabel,
  actions,
  children,
}: HeroSectionProps) {
  return (
    <section className="hero" aria-labelledby={titleId}>
      {badge && <span className="badge gold">{badge}</span>}
      <h1 id={titleId}>{title}</h1>
      {description && <p>{description}</p>}
      {chips && chips.length > 0 && (
        <div className="row-wrap" aria-label={chipsAriaLabel}>
          {chips.map((chip) => (
            <span key={chip} className="chip">
              {chip}
            </span>
          ))}
        </div>
      )}
      {children}
      {actions && actions.length > 0 && (
        <div className="row-wrap">
          {actions.map((action) => (
            <Link key={`${action.href}-${action.label}`} className={`btn ${action.variant === "secondary" ? "secondary" : ""}`} href={action.href}>
              {action.label}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
