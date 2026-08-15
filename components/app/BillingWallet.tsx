"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/admin/Spinner";

export interface BillingEvent {
  id: string;
  internalName: string;
  status: string;
  cachedQuota: number;
  cachedConsumed: number;
}
export interface TopupPackage {
  id: string;
  name: string;
  strips: number;
  priceIdr: number;
}

export default function BillingWallet({
  walletBalance,
  events,
  topupPackages,
}: {
  walletBalance: number;
  events: BillingEvent[];
  topupPackages: TopupPackage[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState<Record<string, number>>({});

  const withdraw = async (eventId: string) => {
    const amount = withdrawAmount[eventId];
    if (!amount || amount <= 0) return;
    setBusyId(eventId);
    setError(null);
    try {
      const res = await fetch(`/api/app/events/${eventId}/allocation`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strips: amount }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "Gagal menarik kembali.");
        return;
      }
      router.refresh();
    } catch {
      setError("Tidak bisa menghubungi server.");
    } finally {
      setBusyId(null);
    }
  };

  const topup = async (packageId: string) => {
    setBusyId(packageId);
    setError(null);
    try {
      const res = await fetch("/api/app/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; order?: { id: string } } | null;
      if (!res.ok) {
        setError(data?.error ?? "Gagal membuat pesanan.");
        return;
      }
      if (data?.order) router.push(`/app/orders/${data.order.id}/payment`);
    } catch {
      setError("Tidak bisa menghubungi server.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div style={{ background: "white", border: "1px solid #E4E4E7", borderRadius: 16, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#71717A" }}>Saldo dompet</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: "#18181B" }}>{walletBalance.toLocaleString("id-ID")} strip</div>
      </div>

      {error && <p style={{ fontSize: 13, color: "#EF4444", marginBottom: 12 }}>{error}</p>}

      <h2 style={{ fontSize: 14, fontWeight: 800, color: "#18181B", marginBottom: 10 }}>Alokasi per acara</h2>
      {events.length === 0 ? (
        <p style={{ fontSize: 13, color: "#71717A", marginBottom: 20 }}>Belum ada acara.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
          {events.map((e) => {
            const remaining = e.cachedQuota - e.cachedConsumed;
            const canWithdraw = e.status === "draft";
            return (
              <div key={e.id} style={{ background: "white", border: "1px solid #E4E4E7", borderRadius: 12, padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#18181B" }}>{e.internalName}</div>
                  <div style={{ fontSize: 11.5, color: "#71717A" }}>
                    {remaining} / {e.cachedQuota} strip tersisa · {e.status}
                  </div>
                </div>
                {canWithdraw ? (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="number"
                      min={1}
                      max={e.cachedQuota}
                      placeholder="jumlah"
                      style={{ width: 80, padding: "6px 8px", borderRadius: 8, border: "1px solid #E4E4E7", fontSize: 12 }}
                      value={withdrawAmount[e.id] ?? ""}
                      onChange={(ev) => setWithdrawAmount((p) => ({ ...p, [e.id]: Number(ev.target.value) }))}
                    />
                    <button
                      type="button"
                      onClick={() => withdraw(e.id)}
                      disabled={busyId === e.id}
                      style={{ padding: "7px 12px", borderRadius: 100, border: "1px solid #E4E4E7", background: "white", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                    >
                      {busyId === e.id ? <Spinner size={12} /> : "Tarik kembali"}
                    </button>
                  </div>
                ) : (
                  <span style={{ fontSize: 11, color: "#94A3B8" }}>Terkunci — sudah live</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <h2 style={{ fontSize: 14, fontWeight: 800, color: "#18181B", marginBottom: 10 }}>Isi ulang dompet</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {topupPackages.map((p) => (
          <div key={p.id} style={{ background: "white", border: "1px solid #E4E4E7", borderRadius: 12, padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#18181B" }}>{p.name}</div>
              <div style={{ fontSize: 11.5, color: "#71717A" }}>{p.strips} strip</div>
            </div>
            <button
              type="button"
              onClick={() => topup(p.id)}
              disabled={busyId === p.id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 100,
                border: "none",
                background: "linear-gradient(135deg, var(--a-clr-brand-1), var(--a-clr-brand-2))",
                color: "white",
                fontWeight: 800,
                fontSize: 12,
                cursor: busyId === p.id ? "not-allowed" : "pointer",
              }}
            >
              {busyId === p.id && <Spinner size={12} />}
              Rp{p.priceIdr.toLocaleString("id-ID")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
