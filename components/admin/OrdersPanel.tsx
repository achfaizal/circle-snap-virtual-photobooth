"use client";

import { useEffect, useState } from "react";
import { Check, Clock, ReceiptText, X } from "lucide-react";
import type { Order, OrderKind } from "@/lib/models/order";
import { formatIdr } from "@/lib/services/addons";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import Spinner from "./Spinner";

const KIND_LABEL: Record<OrderKind, string> = {
  topup_strip: "Top-up strip",
  extend_days: "Perpanjang masa aktif",
  add_event_slot: "Tambah jatah event",
  new_plan: "Paket acara baru",
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

function OrderRow({
  order,
  isStaff,
  clientName,
  eventName,
  onChanged,
}: {
  order: Order;
  isStaff: boolean;
  clientName?: string;
  eventName?: string;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<"confirm" | "cancel" | null>(null);

  const act = async (action: "confirm" | "cancel") => {
    setBusy(action);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/${action}`, { method: "POST" });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        showErrorToast(data?.error ?? "Gagal memproses.");
        return;
      }
      showSuccessToast(action === "confirm" ? "Pesanan ditandai lunas." : "Pesanan dibatalkan.");
      onChanged();
    } catch {
      showErrorToast("Tidak bisa menghubungi server.");
    } finally {
      setBusy(null);
    }
  };

  const detail =
    order.kind === "topup_strip"
      ? `+${order.amount} strip`
      : order.kind === "extend_days"
        ? `+${order.amount} hari`
        : order.kind === "add_event_slot"
          ? `+${order.amount} jatah event`
          : `${order.amount} jatah event`;

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3"
      style={{ padding: "12px 14px", borderRadius: 12, border: "1px solid var(--a-clr-border)" }}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2" style={{ marginBottom: 2 }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: "#0F172A" }}>{KIND_LABEL[order.kind]}</p>
          <span
            className="admin-badge"
            style={{
              background: order.status === "paid" ? "#d1fae5" : order.status === "cancelled" ? "#f1f5f9" : "#FEF3C7",
              color: order.status === "paid" ? "#065f46" : order.status === "cancelled" ? "#64748b" : "#D97706",
            }}
          >
            {order.status === "paid" ? "Lunas" : order.status === "cancelled" ? "Dibatalkan" : "Menunggu"}
          </span>
        </div>
        <p style={{ fontSize: 12, color: "var(--a-clr-text-muted)" }}>
          {detail} · {formatIdr(order.priceIdr)}
          {eventName ? ` · ${eventName}` : ""}
          {isStaff && clientName ? ` · dari ${clientName}` : ""}
        </p>
        <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{formatWhen(order.createdAt)}</p>
      </div>

      {order.status === "pending" && (
        <div className="flex shrink-0 gap-2">
          {isStaff && (
            <button
              onClick={() => act("confirm")}
              disabled={busy !== null}
              className="admin-btn admin-btn-primary admin-btn-sm disabled:opacity-50"
            >
              {busy === "confirm" ? <Spinner size={12} /> : <Check size={12} />}
              Tandai Lunas
            </button>
          )}
          <button
            onClick={() => act("cancel")}
            disabled={busy !== null}
            className="admin-btn admin-btn-outline admin-btn-sm disabled:opacity-50"
          >
            {busy === "cancel" ? <Spinner size={12} /> : <X size={12} />}
            Batalkan
          </button>
        </div>
      )}
    </div>
  );
}

export default function OrdersPanel({
  isStaff,
  eventNames,
  refreshKey,
}: {
  isStaff: boolean;
  /** eventId -> nama tampilan, dari halaman Billing yang sudah punya
      daftar event — supaya pesanan tidak cuma menampilkan id mentah. */
  eventNames: Record<string, string>;
  /** Ganti angka ini dari luar (mis. setelah AddonPurchaseModal berhasil)
      untuk memaksa muat ulang daftar pesanan. */
  refreshKey: number;
}) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let dead = false;
    fetch("/api/admin/orders")
      .then((r) => r.json())
      .then((data: { orders?: Order[]; clientNames?: Record<string, string> }) => {
        if (dead) return;
        setOrders(data.orders ?? []);
        setClientNames(data.clientNames ?? {});
      })
      .catch(() => !dead && setError("Pesanan belum bisa dimuat."));
    return () => {
      dead = true;
    };
  }, [refreshKey, tick]);

  const pending = orders?.filter((o) => o.status === "pending") ?? [];
  const history = orders?.filter((o) => o.status !== "pending") ?? [];

  return (
    <div className="admin-card" style={{ padding: 24, borderRadius: 20, marginTop: 24 }}>
      <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
        <ReceiptText size={16} color="var(--a-clr-primary)" />
        <h2 style={{ fontSize: 15, fontWeight: 800, color: "#0F172A" }}>Pesanan</h2>
      </div>

      {error && <p style={{ fontSize: 12, color: "var(--a-clr-danger)" }}>{error}</p>}
      {!error && orders === null && (
        <div className="flex justify-center" style={{ padding: 20 }}>
          <Spinner size={18} />
        </div>
      )}

      {orders && orders.length === 0 && (
        <p style={{ fontSize: 13, color: "var(--a-clr-text-muted)" }}>Belum ada pesanan.</p>
      )}

      {pending.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div className="flex items-center gap-1.5" style={{ fontSize: 11, fontWeight: 800, color: "#D97706", marginBottom: 8 }}>
            <Clock size={12} /> MENUNGGU KONFIRMASI ({pending.length})
          </div>
          <div className="flex flex-col" style={{ gap: 8 }}>
            {pending.map((o) => (
              <OrderRow
                key={o.id}
                order={o}
                isStaff={isStaff}
                clientName={clientNames[o.clientId]}
                eventName={o.eventId ? eventNames[o.eventId] : undefined}
                onChanged={() => setTick((t) => t + 1)}
              />
            ))}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <p className="uppercase" style={{ fontSize: 11, fontWeight: 800, color: "#94A3B8", marginBottom: 8 }}>
            Riwayat
          </p>
          <div className="flex flex-col" style={{ gap: 8 }}>
            {history.map((o) => (
              <OrderRow
                key={o.id}
                order={o}
                isStaff={isStaff}
                clientName={clientNames[o.clientId]}
                eventName={o.eventId ? eventNames[o.eventId] : undefined}
                onChanged={() => setTick((t) => t + 1)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
