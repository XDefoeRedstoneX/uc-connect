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
};

export default function VendorCard({
  title,
  meta,
  href,
  imageSrc,
  imageAlt,
  description,
  badges,
  ctaLabel = "Lihat Detail / View Detail",
}: VendorCardProps) {
  return (
    <li className="vendor-card">
      {imageSrc && <img className="vendor-cover" src={imageSrc} alt={imageAlt ?? `Image for ${title}`} />}
      <div className="vendor-body">
        {badges && badges.length > 0 && (
          <div className="row-wrap">
            {badges.map((badge) => (
              <span key={`${badge.tone}-${badge.text}`} className={`badge ${badge.tone}`}>
                {badge.text}
              </span>
            ))}
          </div>
        )}
        <h3>{title}</h3>
        <p className="vendor-meta">{meta}</p>
        {description && <p>{description}</p>}
        <div className="vendor-actions">
          <Link className="btn" href={href}>
            {ctaLabel}
          </Link>
        </div>
      </div>
    </li>
  );
}
