import type { ReactNode } from "react";
import Icon, { type IconName } from "./Icon";

type StatProps = {
  value: ReactNode;
  label: ReactNode;
  icon?: IconName;
  tone?: "default" | "accent" | "warm";
  hint?: ReactNode;
};

/** Editorial KPI tile with an oversized display numeral. */
export default function Stat({ value, label, icon, tone = "default", hint }: StatProps) {
  const toneClass = tone === "accent" ? " stat-block--accent" : tone === "warm" ? " stat-block--warm" : "";
  return (
    <div className={`stat-block${toneClass}`}>
      {icon && (
        <span style={{ color: "var(--muted)" }}>
          <Icon name={icon} size={18} strokeWidth={2.2} />
        </span>
      )}
      <span className="stat-block__value">{value}</span>
      <span className="stat-block__label">{label}</span>
      {hint && <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{hint}</span>}
    </div>
  );
}
