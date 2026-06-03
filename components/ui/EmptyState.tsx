import type { ReactNode } from "react";
import Icon, { type IconName } from "./Icon";

type EmptyStateProps = {
  icon?: IconName;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
};

/** Consistent empty / no-results state. */
export default function EmptyState({ icon = "search", title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon">
        <Icon name={icon} size={24} strokeWidth={2} />
      </span>
      <h3 className="empty-state__title">{title}</h3>
      {description && <p className="empty-state__desc">{description}</p>}
      {action && <div style={{ marginTop: "0.4rem" }}>{action}</div>}
    </div>
  );
}
