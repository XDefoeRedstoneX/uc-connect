import type { ReactNode } from "react";
import Icon, { type IconName } from "./Icon";

type Tone = "success" | "gold" | "pacific" | "neutral";

type BadgeProps = {
  children: ReactNode;
  tone?: Tone;
  icon?: IconName;
  className?: string;
};

/** Pill label. Tones map to the design-token badge classes in globals.css. */
export default function Badge({ children, tone = "pacific", icon, className }: BadgeProps) {
  return (
    <span className={`badge ${tone}${className ? ` ${className}` : ""}`}>
      {icon && <Icon name={icon} size={13} strokeWidth={2.6} style={{ marginRight: "0.3rem" }} />}
      {children}
    </span>
  );
}
