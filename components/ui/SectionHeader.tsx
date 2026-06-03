import type { ReactNode } from "react";
import Icon, { type IconName } from "./Icon";

type SectionHeaderProps = {
  title: ReactNode;
  /** Small uppercase eyebrow above the title. */
  kicker?: string;
  kickerIcon?: IconName;
  lead?: ReactNode;
  action?: ReactNode;
  className?: string;
};

/** Editorial section header: kicker + display title + optional trailing action. */
export default function SectionHeader({
  title,
  kicker,
  kickerIcon,
  lead,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div className={`section-head${className ? ` ${className}` : ""}`}>
      <div>
        {kicker && (
          <span className="kicker">
            {kickerIcon && <Icon name={kickerIcon} size={14} strokeWidth={2.6} />}
            {kicker}
          </span>
        )}
        <h2 className="section-head__title">{title}</h2>
        {lead && <p className="section-head__lead">{lead}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
