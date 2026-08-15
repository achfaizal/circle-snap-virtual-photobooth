"use client";

import { useState } from "react";

interface OrderDetail {
  id: string;
  number: string;
  status: string;
  strips: number;
  subtotalIdr: number;
  totalIdr: number;
  paymentMethod: string;
  createdAt: string;
  expiresAt: string;
  notesInternal: string | null;
}
interface Account {
  id: string;
  displayName: string;
  type: string;
}
interface HistoryOrder {
  id: string;
  number: string;
  status: string;
  totalIdr: number;
}

function formatIdr(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

export default function PurchaseOrderDetail({
  order,
  account,
  proofUrl,
  history,
}: {
  order: OrderDetail;
  account: Account | null;
  proofUrl: string | null;
  history: HistoryOrder[];
}) {
  const [status, setStatus] = useState(order.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  async function approve() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal menyetujui.");
      setStatus(data.order.status);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan.");
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal menolak.");
      setStatus("cancelled");
      setShowReject(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan.");
    } finally {
      setBusy(false);
    }
  }

  const canAct = status === "awaiting_payment";

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--a-clr-text)" }}>{order.number}</h1>
          <span className={`t2-badge ${status === "fulfilled" ? "t2-badge-active" : "t2-badge-archived"}`}>{status}</span>
        </div>
        {canAct && (
          <div className="flex" style={{ gap: 8 }}>
            <button className="t2-btn t2-btn-danger" onClick={() => setShowReject(true)} disabled={busy} type="button">
              Tolak
            </button>
            <button className="t2-btn t2-btn-primary" onClick={approve} disabled={busy} type="button">
              {busy ? "Memproses…" : "Setujui & masukkan strip"}
            </button>
          </div>
        )}
      </div>

      {error && <p style={{ fontSize: 13, color: "var(--a-clr-danger)", marginBottom: 12 }}>{error}</p>}

      {showReject && (
        <div className="t2-sheet" style={{ marginBottom: 20 }}>
          <div className="t2-sheet-section">
            <label className="t2-label" htmlFor="reject-reason">Alasan penolakan (wajib)</label>
            <input id="reject-reason" className="t2-input" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
            <div className="flex" style={{ gap: 8, marginTop: 12 }}>
              <button className="t2-btn t2-btn-danger" onClick={reject} disabled={busy || !rejectReason.trim()} type="button">
                Konfirmasi tolak
              </button>
              <button className="t2-btn t2-btn-secondary" onClick={() => setShowReject(false)} type="button">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {/* Kiri — bukti transfer */}
        <div className="t2-sheet">
          <div className="t2-sheet-section">
            <p className="t2-label" style={{ marginBottom: 8 }}>Bukti transfer</p>
            {proofUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={proofUrl} alt="Bukti transfer" style={{ maxWidth: "100%", borderRadius: 2 }} />
            ) : (
              <p style={{ fontSize: 13, color: "var(--a-clr-text-muted)" }}>Belum ada bukti diunggah.</p>
            )}
          </div>
        </div>

        {/* Tengah — rincian pesanan */}
        <div className="t2-sheet">
          <div className="t2-sheet-section">
            <p className="t2-label" style={{ marginBottom: 8 }}>Rincian</p>
            <p style={{ fontSize: 13 }}>Strip: <span className="t2-mono">{order.strips}</span></p>
            <p style={{ fontSize: 13 }}>Subtotal: <span className="t2-mono">{formatIdr(order.subtotalIdr)}</span></p>
            <p style={{ fontSize: 13, fontWeight: 700 }}>
              Nominal unik: <span className="t2-mono">{formatIdr(order.totalIdr)}</span>
            </p>
            <p style={{ fontSize: 13 }}>Metode: {order.paymentMethod}</p>
            <p style={{ fontSize: 12, color: "var(--a-clr-text-muted)", marginTop: 8 }}>
              Dibuat: {new Date(order.createdAt).toLocaleString("id-ID")}
            </p>
            <p style={{ fontSize: 12, color: "var(--a-clr-text-muted)" }}>
              Batas bayar: {new Date(order.expiresAt).toLocaleString("id-ID")}
            </p>
            {order.notesInternal && (
              <p style={{ fontSize: 12, color: "var(--a-clr-danger)", marginTop: 8 }}>Catatan: {order.notesInternal}</p>
            )}
          </div>
        </div>

        {/* Kanan — profil akun & riwayat */}
        <div className="t2-sheet">
          <div className="t2-sheet-section">
            <p className="t2-label" style={{ marginBottom: 8 }}>Akun</p>
            {account ? (
              <>
                <p style={{ fontSize: 13, fontWeight: 600 }}>{account.displayName}</p>
                <p className="t2-mono" style={{ fontSize: 12, color: "var(--a-clr-text-muted)" }}>{account.type}</p>
              </>
            ) : (
              <p style={{ fontSize: 13, color: "var(--a-clr-text-muted)" }}>Akun tidak ditemukan.</p>
            )}
          </div>
          <div className="t2-sheet-section">
            <p className="t2-label" style={{ marginBottom: 8 }}>Riwayat pesanan ({history.length})</p>
            {history.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--a-clr-text-muted)" }}>Belum ada pesanan lain.</p>
            ) : (
              history.map((h) => (
                <p key={h.id} className="t2-mono" style={{ fontSize: 12 }}>
                  {h.number} · {h.status} · {formatIdr(h.totalIdr)}
                </p>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
