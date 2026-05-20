import { useCallback, useEffect, useState } from "react";
import type { FeaturedBid, WalletTransaction } from "@/types/domain";

type Props = {
  vendorId: string;
  token: string;
};

const SNAP_SRC_SANDBOX = "https://app.sandbox.midtrans.com/snap/snap.js";
const SNAP_SRC_PRODUCTION = "https://app.midtrans.com/snap/snap.js";

declare global {
  interface Window {
    snap?: {
      pay: (token: string, opts: Record<string, (result?: unknown) => void>) => void;
    };
  }
}

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

export default function TabFeatured({ vendorId, token }: Props) {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [activeBid, setActiveBid] = useState<FeaturedBid | null>(null);
  const [loading, setLoading] = useState(true);
  const [topupAmount, setTopupAmount] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
  const isProduction = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true";

  const refresh = useCallback(async () => {
    const [w, b] = await Promise.all([
      fetch("/api/wallet", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/featured/bids", { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    if (w.ok) {
      const wj = await w.json();
      setBalance(wj.balance_idr ?? 0);
      setTransactions(wj.transactions ?? []);
    }
    if (b.ok) {
      const bj = await b.json();
      setActiveBid(bj.activeBid ?? null);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { void refresh(); }, [refresh]);

  // Load the Snap script once.
  useEffect(() => {
    if (!clientKey || window.snap) return;
    const script = document.createElement("script");
    script.src = isProduction ? SNAP_SRC_PRODUCTION : SNAP_SRC_SANDBOX;
    script.setAttribute("data-client-key", clientKey);
    document.body.appendChild(script);
    return () => { script.remove(); };
  }, [clientKey, isProduction]);

  async function startTopup() {
    setMsg(null);
    const amount = Math.floor(Number(topupAmount));
    if (!Number.isFinite(amount) || amount < 10_000) {
      setMsg("Nominal top-up minimal Rp10.000");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount_idr: amount }),
      });
      const j = await res.json();
      if (!res.ok) { setMsg(j.error ?? "Gagal membuat top-up"); setBusy(false); return; }

      if (!window.snap) {
        setMsg("Snap belum siap. Pastikan NEXT_PUBLIC_MIDTRANS_CLIENT_KEY terisi.");
        setBusy(false);
        return;
      }

      window.snap.pay(j.token, {
        onSuccess: () => { setMsg("Pembayaran berhasil! Saldo diperbarui sesaat lagi."); setTimeout(() => void refresh(), 2500); },
        onPending: () => { setMsg("Pembayaran tertunda. Saldo masuk setelah dikonfirmasi."); },
        onError: () => { setMsg("Pembayaran gagal."); },
        onClose: () => { setMsg("Jendela pembayaran ditutup. Top-up bisa dilanjutkan dari riwayat."); },
      });
      setTopupAmount("");
    } finally {
      setBusy(false);
    }
  }

  async function placeBid() {
    setMsg(null);
    const amount = Math.floor(Number(bidAmount));
    if (!Number.isFinite(amount) || amount < 1_000) {
      setMsg("Bid minimal Rp1.000");
      return;
    }
    if (amount > balance) {
      setMsg("Saldo tidak cukup untuk bid ini. Top up dulu.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/featured/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount_idr: amount }),
      });
      const j = await res.json();
      if (!res.ok) { setMsg(j.error ?? "Gagal menempatkan bid"); }
      else { setMsg("Bid tersimpan untuk lelang berikutnya."); setBidAmount(""); await refresh(); }
    } finally {
      setBusy(false);
    }
  }

  async function withdrawBid() {
    if (!confirm("Tarik bid aktif kamu?")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/featured/bids", { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { setMsg("Bid ditarik."); await refresh(); }
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="dash-card"><p className="muted">Memuat dompet…</p></div>;

  return (
    <div className="stack" style={{ gap: "1rem" }}>
      {!clientKey && (
        <div className="dash-card" style={{ background: "var(--orange-soft)", border: "1px solid var(--orange-light)" }}>
          <p style={{ margin: 0, fontSize: "0.85rem" }}>
            ⚠️ <strong>NEXT_PUBLIC_MIDTRANS_CLIENT_KEY</strong> belum diset. Top-up tidak akan berjalan sampai key Midtrans dikonfigurasi.
          </p>
        </div>
      )}

      {msg && (
        <div className="dash-card" style={{ background: "var(--pacific-soft)" }}>
          <p style={{ margin: 0, fontSize: "0.88rem" }}>{msg}</p>
        </div>
      )}

      {/* Wallet */}
      <div className="dash-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <p className="stat-label" style={{ margin: 0 }}>💳 Saldo Dompet</p>
            <p className="stat-value" style={{ margin: 0 }}>{rupiah(balance)}</p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div>
              <label style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Top-up (Rp)</label>
              <input type="number" min={10000} step={1000} value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)} placeholder="50000"
                style={{ display: "block", marginTop: "0.2rem", width: "140px" }} />
            </div>
            <button type="button" disabled={busy} onClick={() => void startTopup()}>Top Up</button>
          </div>
        </div>
      </div>

      {/* Bid */}
      <div className="dash-card">
        <h3 style={{ marginTop: 0 }}>🏆 Bid Featured</h3>
        <p className="muted" style={{ fontSize: "0.85rem", marginTop: 0 }}>
          Lelang harian tertutup. 5 bid tertinggi (yang saldonya cukup) tampil di Beranda & atas halaman Jelajahi selama 24 jam.
          Saldo dipotong hanya jika kamu menang.
        </p>

        {activeBid ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", background: "var(--gradient-subtle)", borderRadius: "var(--radius-md)", marginBottom: "0.75rem" }}>
            <div>
              <p style={{ margin: 0, fontWeight: 700 }}>Bid aktif: {rupiah(activeBid.amount_idr)}</p>
              <p className="muted" style={{ margin: 0, fontSize: "0.78rem" }}>Untuk lelang {activeBid.round_date}</p>
            </div>
            <button type="button" className="ghost" disabled={busy} onClick={() => void withdrawBid()}>Tarik Bid</button>
          </div>
        ) : (
          <p className="muted" style={{ fontSize: "0.85rem" }}>Belum ada bid aktif.</p>
        )}

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <label style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{activeBid ? "Naikkan bid (Rp)" : "Jumlah bid (Rp)"}</label>
            <input type="number" min={1000} step={1000} value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)} placeholder="25000"
              style={{ display: "block", marginTop: "0.2rem", width: "140px" }} />
          </div>
          <button type="button" disabled={busy} onClick={() => void placeBid()}>
            {activeBid ? "Perbarui Bid" : "Tempatkan Bid"}
          </button>
        </div>
      </div>

      {/* Transaction history */}
      <div className="dash-card">
        <h3 style={{ marginTop: 0 }}>📜 Riwayat Transaksi</h3>
        {transactions.length === 0 ? (
          <p className="muted" style={{ fontSize: "0.85rem" }}>Belum ada transaksi.</p>
        ) : (
          <div style={{ display: "grid", gap: "0.4rem" }}>
            {transactions.map((tx) => (
              <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}>
                <span>{txLabel(tx.type)}</span>
                <span style={{ fontWeight: 700, color: tx.amount_idr < 0 ? "var(--error)" : "var(--pacific-dark)" }}>
                  {tx.amount_idr < 0 ? "-" : "+"}{rupiah(Math.abs(tx.amount_idr))}
                </span>
                <span className="muted">{new Date(tx.created_at).toLocaleDateString("id-ID")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function txLabel(t: WalletTransaction["type"]): string {
  switch (t) {
    case "topup": return "💰 Top-up";
    case "bid_charge": return "🏆 Biaya bid menang";
    case "refund": return "↩️ Refund";
    case "adjustment": return "⚙️ Penyesuaian";
  }
}
