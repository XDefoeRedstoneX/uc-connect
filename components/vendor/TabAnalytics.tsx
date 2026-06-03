import { useEffect, useState } from "react";
import Icon, { type IconName } from "@/components/ui/Icon";
import Stat from "@/components/ui/Stat";

type Props = { token: string };

type Analytics = {
  whatsapp_clicks: number;
  sample_rating: number;
  review_count: number;
  response_rate: number;
  avg_reply_time: string;
  items_total: number;
  items_active: number;
  favorites: number;
  featured_wins: number;
  featured_active: { rank: number; ends_at: string } | null;
  bid_spend_idr: number;
  wallet_balance_idr: number;
};

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

export default function TabAnalytics({ token }: Props) {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/vendor/analytics", { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error("Gagal memuat analitik");
        setData(await res.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal memuat analitik");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [token]);

  if (loading) return <div className="dash-card"><p className="muted">Memuat analitik…</p></div>;
  if (error || !data) return <div className="dash-card"><p className="err">{error ?? "Tidak ada data"}</p></div>;

  const stats: { icon: IconName; label: string; value: string; highlight?: boolean }[] = [
    { icon: "phone", label: "Klik WhatsApp", value: String(data.whatsapp_clicks) },
    { icon: "star", label: "Rating", value: data.review_count > 0 ? `${Number(data.sample_rating).toFixed(1)} (${data.review_count})` : "Belum ada" },
    { icon: "heart", label: "Difavoritkan", value: String(data.favorites) },
    { icon: "package", label: "Produk Aktif", value: `${data.items_active}/${data.items_total}` },
    { icon: "trophy", label: "Menang Featured", value: String(data.featured_wins), highlight: data.featured_active != null },
    { icon: "receipt", label: "Total Belanja Bid", value: rupiah(data.bid_spend_idr) },
    { icon: "wallet", label: "Saldo Dompet", value: rupiah(data.wallet_balance_idr) },
  ];

  return (
    <div className="stack" style={{ gap: "1rem" }}>
      {data.featured_active && (
        <div className="dash-card" style={{ background: "linear-gradient(135deg, rgba(232,97,0,0.08), rgba(28,169,201,0.08))", border: "1.5px solid var(--orange-light)" }}>
          <p style={{ margin: 0, fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Icon name="trophy" size={16} strokeWidth={2.4} /> Sedang tampil sebagai Vendor Sponsor (peringkat #{data.featured_active.rank})
          </p>
          <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.82rem" }}>
            Berakhir {new Date(data.featured_active.ends_at).toLocaleString("id-ID")}
          </p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.75rem" }}>
        {stats.map((s) => (
          <Stat key={s.label} icon={s.icon} value={s.value} label={s.label} tone={s.highlight ? "warm" : "default"} />
        ))}
      </div>

      <p className="muted" style={{ fontSize: "0.8rem", textAlign: "center", margin: 0 }}>
        Tip: tingkatkan klik WhatsApp dengan menang lelang Featured & menjaga rating tinggi.
      </p>
    </div>
  );
}
