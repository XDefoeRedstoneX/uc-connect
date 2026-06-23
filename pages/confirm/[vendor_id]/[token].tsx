import type { GetServerSideProps } from "next";
import Link from "next/link";
import SiteLayout from "@/components/SiteLayout";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { hashConfirmationToken, CONFIRM_INTERVAL_DAYS } from "@/lib/vendor-confirmation";
import { log } from "@/lib/logger";

type Status = "ok" | "expired" | "invalid" | "already_confirmed" | "archived" | "unavailable";

type Props = {
  status: Status;
  vendorName: string | null;
};

// SSR-handles the confirmation click so it works in any browser with no JS,
// straight from an email link. The token is single-use: validating it clears
// the hash and resets last_confirmed_at, so reloading the page shows
// "already confirmed" instead of a 500.
export default function ConfirmPage({ status, vendorName }: Props) {
  const { title, body, tone } = render(status, vendorName);
  return (
    <SiteLayout title={`${title} | UC Connect`}>
      <section className="card" style={{ maxWidth: 520, margin: "3rem auto", textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>
          {tone === "good" ? "✅" : tone === "warn" ? "⏳" : "⚠️"}
        </div>
        <h1 style={{ margin: "0 0 0.5rem" }}>{title}</h1>
        <p style={{ color: "var(--muted)", lineHeight: 1.6, margin: "0 0 1.25rem" }}>{body}</p>
        <Link href="/" className="btn">Kembali ke Beranda</Link>
      </section>
    </SiteLayout>
  );
}

function render(status: Status, vendorName: string | null): { title: string; body: string; tone: "good" | "warn" | "bad" } {
  switch (status) {
    case "ok":
      return {
        title: "Konfirmasi berhasil",
        body: `Tokomu${vendorName ? ` "${vendorName}"` : ""} aktif untuk ${CONFIRM_INTERVAL_DAYS} hari ke depan. Terima kasih.`,
        tone: "good",
      };
    case "already_confirmed":
      return {
        title: "Sudah dikonfirmasi",
        body: "Link konfirmasi ini sudah digunakan. Tokomu sudah aktif — tidak perlu klik lagi.",
        tone: "good",
      };
    case "expired":
      return {
        title: "Link kedaluwarsa",
        body: "Link konfirmasi ini sudah tidak berlaku. Login ke dashboard untuk mengaktifkan toko kamu.",
        tone: "warn",
      };
    case "archived":
      return {
        title: "Toko sudah diarsipkan",
        body: "Toko ini sudah diarsipkan. Login ke dashboard vendor untuk mengaktifkannya kembali.",
        tone: "warn",
      };
    case "invalid":
      return {
        title: "Link tidak valid",
        body: "Link konfirmasi ini tidak cocok. Pastikan kamu membuka link terbaru dari email UC Connect.",
        tone: "bad",
      };
    case "unavailable":
    default:
      return {
        title: "Layanan tidak tersedia",
        body: "Layanan konfirmasi sedang tidak tersedia. Coba lagi nanti.",
        tone: "bad",
      };
  }
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ params }) => {
  const vendorId = String(params?.vendor_id ?? "");
  const token = String(params?.token ?? "");
  if (!vendorId || !token) return { props: { status: "invalid", vendorName: null } };

  const supabase = getSupabaseServiceClient();
  if (!supabase) return { props: { status: "unavailable", vendorName: null } };

  // Fetch the vendor + current hash so we can return a precise status
  // (already-confirmed vs invalid vs archived) instead of a generic error.
  const { data: vendor } = await supabase
    .from("vendors")
    .select("id,name,confirmation_token_hash,archived_at")
    .eq("id", vendorId)
    .maybeSingle();

  if (!vendor) return { props: { status: "invalid", vendorName: null } };
  if (vendor.archived_at) return { props: { status: "archived", vendorName: vendor.name } };
  if (!vendor.confirmation_token_hash) {
    // Token already consumed — show a friendly "already done" page.
    return { props: { status: "already_confirmed", vendorName: vendor.name } };
  }

  const supplied = hashConfirmationToken(token);
  if (supplied !== vendor.confirmation_token_hash) {
    return { props: { status: "invalid", vendorName: vendor.name } };
  }

  // Valid + single-use: clear the hash, reset the 90-day window, drop the
  // sent-at so the cron's resend window restarts.
  const { error: updateErr } = await supabase
    .from("vendors")
    .update({
      last_confirmed_at: new Date().toISOString(),
      confirmation_token_hash: null,
      confirmation_sent_at: null,
    })
    .eq("id", vendor.id)
    .eq("confirmation_token_hash", vendor.confirmation_token_hash); // CAS guard against double-click
  if (updateErr) {
    log.error("vendor_confirm_update_failed", { vendorId: vendor.id, message: updateErr.message });
    return { props: { status: "unavailable", vendorName: vendor.name } };
  }

  log.info("vendor_confirm_ok", { vendorId: vendor.id });
  return { props: { status: "ok", vendorName: vendor.name } };
};
