import Link from "next/link";
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import Icon, { type IconName } from "./Icon";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "gradient";
type Size = "sm" | "md" | "lg";

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "secondary",
  ghost: "ghost",
  danger: "btn--danger",
  gradient: "btn-gradient",
};

const SIZE_CLASS: Record<Size, string> = { sm: "btn--sm", md: "", lg: "btn--lg" };

type CommonProps = {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  fullWidth?: boolean;
  className?: string;
  style?: CSSProperties;
};

type ButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "style"> & {
    href?: undefined;
  };

type LinkProps = CommonProps & {
  href: string;
  target?: string;
  rel?: string;
  "aria-label"?: string;
};

function classes(p: CommonProps): string {
  return [
    "btn",
    VARIANT_CLASS[p.variant ?? "primary"],
    p.size ? SIZE_CLASS[p.size] : "",
    p.fullWidth ? "btn--block" : "",
    p.className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Editorial button primitive. Renders a Next <Link> when `href` is provided,
 * otherwise a native <button>. Default variant is the calm solid pacific
 * (`btn-primary`); use `gradient` sparingly for hero/marquee CTAs.
 */
export default function Button(props: ButtonProps | LinkProps) {
  const iconSize = props.size === "sm" ? 16 : props.size === "lg" ? 20 : 18;
  const inner = (
    <>
      {props.icon && <Icon name={props.icon} size={iconSize} strokeWidth={2.4} />}
      {props.children}
      {props.iconRight && <Icon name={props.iconRight} size={iconSize} strokeWidth={2.4} />}
    </>
  );

  if ("href" in props && props.href !== undefined) {
    const { href, target, rel, style } = props;
    return (
      <Link
        href={href}
        target={target}
        rel={rel}
        aria-label={props["aria-label"]}
        className={classes(props)}
        style={style}
      >
        {inner}
      </Link>
    );
  }

  const {
    children, variant, size, icon, iconRight, fullWidth, className, style, ...rest
  } = props as ButtonProps;
  void children; void variant; void size; void icon; void iconRight; void fullWidth; void className;
  return (
    <button className={classes(props)} style={style} {...rest}>
      {inner}
    </button>
  );
}
