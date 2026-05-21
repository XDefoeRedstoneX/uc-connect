import Link from "next/link";

type VendorBadge = {
  tone: "success" | "gold";
  text: string;
};

type VendorCardProps = {
  title: string;
  meta: string;
  href: string;
  imageSrc?: string;
  imageAlt?: string;
  description?: string;
  badges?: VendorBadge[];
  ctaLabel?: string;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
  highlight?: boolean;
};


export default function VendorCard({
  title,
  meta,
  href,
  imageSrc,
  imageAlt,
  description,
  badges,
  ctaLabel,
  isFavorited,
  onToggleFavorite,
  highlight,
}: VendorCardProps) {
  return (
    <div
      style={{
        position: "relative",
        ...(highlight
          ? {
              borderRadius: "var(--radius-md)",
              boxShadow: "0 0 0 2px var(--orange), 0 10px 26px rgba(232,97,0,0.18)",
            }
          : {}),
      }}
    >
      {highlight && (
        <span
          aria-hidden
          style={{
            position: "absolute", top: 10, left: -6, zIndex: 11,
            background: "var(--gradient-main)", color: "#fff",
            fontSize: "0.66rem", fontWeight: 800, letterSpacing: "0.04em",
            padding: "0.2rem 0.55rem", borderRadius: "4px",
            boxShadow: "0 3px 8px rgba(0,0,0,0.18)",
          }}
        >
          ⭐ SPONSOR
        </span>
      )}
      {/* Heart toggle */}
      {onToggleFavorite && (
        <button
          type="button"
          aria-label={isFavorited ? "Hapus dari favorit" : "Tambah ke favorit"}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(); }}
          className="fav-heart"
          style={{
            position: "absolute", top: "0.65rem", right: "0.65rem", zIndex: 10,
            background: "rgba(255,255,255,0.92)", border: "none", borderRadius: "50%",
            width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontSize: "1.1rem", boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
            transition: "transform 0.2s ease, background 0.2s ease",
          }}
        >
          {isFavorited ? "❤️" : "🤍"}
        </button>
      )}

      <Link href={href} className="vendor-card transition-transform duration-200 hover:-translate-y-1">
        {imageSrc && (
          <img 
            className="vendor-cover w-full" 
            src={imageSrc} 
            alt={imageAlt ?? `Image for ${title}`} 
          />
        )}
        <div className="vendor-body p-5">
          {badges && badges.length > 0 && (
            <div className="row-wrap gap-2 mb-2">
              {badges.map((badge) => (
                <span 
                  key={`${badge.tone}-${badge.text}`} 
                  className={`badge ${badge.tone}`}
                >
                  {badge.text}
                </span>
              ))}
            </div>
          )}
          
          <h3 className="font-bold text-[var(--accent)]">{title}</h3>
          <p className="vendor-meta">{meta}</p>
          
          {description && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{description}</p>}
          
          {ctaLabel && (
            <div className="vendor-actions w-full mt-3">
              <span className="btn w-full text-center font-bold text-xs">
                {ctaLabel}
              </span>
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}