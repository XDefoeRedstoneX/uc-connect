type SkeletonProps = {
  width?: string;
  height?: string;
  borderRadius?: string;
  count?: number;
  gap?: string;
};

export default function LoadingSkeleton({
  width = "100%",
  height = "1rem",
  borderRadius = "6px",
  count = 1,
  gap = "0.65rem",
}: SkeletonProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="skeleton-shimmer"
          style={{ width, height, borderRadius }}
        />
      ))}
    </div>
  );
}

/** Card-shaped skeleton for vendor grids */
export function SkeletonCard() {
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div className="skeleton-shimmer" style={{ width: "100%", height: "140px" }} />
      <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <div className="skeleton-shimmer" style={{ width: "60%", height: "1.1rem", borderRadius: "6px" }} />
        <div className="skeleton-shimmer" style={{ width: "80%", height: "0.85rem", borderRadius: "4px" }} />
        <div className="skeleton-shimmer" style={{ width: "40%", height: "0.85rem", borderRadius: "4px" }} />
      </div>
    </div>
  );
}
