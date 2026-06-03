import type { CSSProperties, ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  variant?: "default" | "elevated";
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
};

/** Surface primitive built on the `.card` token; opt into elevation/hover. */
export default function Card({
  children,
  variant = "default",
  interactive = false,
  className,
  style,
}: CardProps) {
  const cls = [
    "card",
    variant === "elevated" ? "card--elevated" : "",
    interactive ? "card--interactive" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls} style={style}>
      {children}
    </div>
  );
}
