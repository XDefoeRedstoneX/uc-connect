// Placeholder rows for list pages while data loads — keeps page structure
// stable (no full-page spinner swap) so content doesn't jump on arrival.
export default function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div style={{ display: "grid", gap: "0.75rem" }} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="dash-card"
          style={{ display: "flex", gap: "0.85rem", alignItems: "center" }}
        >
          <span className="skeleton" style={{ width: 52, height: 52, borderRadius: 10, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span className="skeleton skeleton-line" style={{ width: "55%" }} />
            <span className="skeleton skeleton-line" style={{ width: "85%" }} />
            <span className="skeleton skeleton-line" style={{ width: "35%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}
