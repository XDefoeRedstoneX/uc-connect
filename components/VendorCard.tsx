import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Icon from "@/components/ui/Icon";

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
    <div className={`vendor-card-wrap${highlight ? " vendor-card-wrap--sponsor" : ""}`}>
      {highlight && (
        <span className="vendor-sponsor-ribbon">
          <Icon name="sparkles" size={12} strokeWidth={2.6} />
          SPONSOR
        </span>
      )}

      {onToggleFavorite && (
        <button
          type="button"
          aria-label={isFavorited ? "Hapus dari favorit" : "Tambah ke favorit"}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleFavorite();
          }}
          className="fav-heart"
          aria-pressed={isFavorited}
        >
          <Icon
            name="heart"
            size={18}
            filled={isFavorited}
            strokeWidth={2.2}
            style={{ color: isFavorited ? "var(--orange)" : "var(--muted)" }}
          />
        </button>
      )}

      <Link href={href} className="vendor-card card--interactive">
        <div className="vendor-cover-frame">
          {imageSrc ? (
            <img className="vendor-cover" src={imageSrc} alt={imageAlt ?? `Sampul ${title}`} />
          ) : (
            <div className="vendor-cover vendor-cover--placeholder">
              <Icon name="store" size={30} strokeWidth={1.6} />
            </div>
          )}
        </div>

        <div className="vendor-body">
          {badges && badges.length > 0 && (
            <div className="row-wrap" style={{ gap: "0.4rem" }}>
              {badges.map((badge) => (
                <Badge key={`${badge.tone}-${badge.text}`} tone={badge.tone}>
                  {badge.text}
                </Badge>
              ))}
            </div>
          )}

          <h3 className="vendor-card-title">{title}</h3>
          <p className="vendor-meta clamp-1">{meta}</p>

          {description && <p className="vendor-desc clamp-2">{description}</p>}

          {ctaLabel && (
            <div className="vendor-actions">
              <span className="vendor-cta">
                {ctaLabel}
                <Icon name="arrow-right" size={15} strokeWidth={2.4} />
              </span>
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
