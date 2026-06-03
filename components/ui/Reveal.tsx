import type { CSSProperties, ElementType, ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  /** Stagger index — multiplied by `step` to compute the animation delay. */
  index?: number;
  /** Per-index delay in ms (default 70). */
  step?: number;
  /** Explicit delay in ms; overrides index * step when set. */
  delay?: number;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
};

/**
 * Pure-CSS staggered page-load reveal (fade + rise). Honors
 * prefers-reduced-motion via the `.reveal` rule in globals.css.
 */
export default function Reveal({
  children,
  index = 0,
  step = 70,
  delay,
  as: Tag = "div",
  className,
  style,
}: RevealProps) {
  const ms = delay ?? index * step;
  return (
    <Tag
      className={`reveal${className ? ` ${className}` : ""}`}
      style={{ animationDelay: `${ms}ms`, ...style }}
    >
      {children}
    </Tag>
  );
}
