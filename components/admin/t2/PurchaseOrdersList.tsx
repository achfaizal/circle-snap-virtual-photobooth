"use client";

import { useState } from "react";

interface OrderRow {
  id: string;
  number: string;
  status: string;
  strips: number;
  totalIdr: number;
  paymentMethod: string;
  createdAt: string;
}

function formatIdr(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

const TABS = ["menunggu", "semua"] as const;

export default function PurchaseOrdersList({ initial }: { initial: OrderRow[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("menunggu");
  const rows = tab === "menunggu" ? initial.filter((o) => o.status === "awaiting_payment") : initial;

  return (
    <div>
      <div className="flex" style={{ gap: 4, marginBottom: 20, borderBottom: "1px solid var(--a-clr-border)" }}>
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className="t2-mono"
            style={{
              padding: "10px 16px",
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              background: "none",
              border: "none",
              borderBottom: tab === t ? "2px solid var(--a-clr-primary-dark)" : "2px solid transparent",
              color: tab === t ? "var(--a-clr-text)" : "var(--a-clr-text-muted)",
              cursor: "pointer",
            }}
          >
            {t === "menunggu" ? `Menunggu Verifikasi (${initial.filter((o) => o.status === "awaiting_payment").length})` : "Semua"}
          </button>
        ))}
      </div>

      <div className="t2-sheet">
        {rows.length === 0 ? (
          <div className="t2-sheet-section" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--a-clr-text)" }}>
              {tab === "menunggu" ? "Tidak ada pesanan menunggu verifikasi." : "Belum ada pesanan."}
            </p>
          </div>
        ) : (
          rows.map((o) => (
            <a
              key={o.id}
              href={`/admin/orders/${o.id}`}
              className="t2-sheet-section flex items-center justify-between"
              style={{ textDecoration: "none" }}
            >
              <div>
                <span className="t2-mono" style={{ fontSize: 13, fontWeight: 600, color: "var(--a-clr-text)" }}>{o.number}</span>
                <span style={{ fontSize: 13, color: "var(--a-clr-text-muted)", marginLeft: 12 }}>
                  {o.strips} strip · {formatIdr(o.totalIdr)} · {o.paymentMethod}
                </span>
              </div>
              <span className={`t2-badge ${o.status === "fulfilled" ? "t2-badge-active" : "t2-badge-archived"}`}>{o.status}</span>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
