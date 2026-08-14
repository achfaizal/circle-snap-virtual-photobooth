"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, CreditCard, Plus, Ticket } from "lucide-react";
import type { Event } from "@/lib/models/event";
import type { Subscription } from "@/lib/models/plan";
import { effectiveStatus, msUntilExpiry } from "@/lib/services/eventLifecycle";
import AddonPurchaseModal from "./AddonPurchaseModal";
import OrdersPanel from "./OrdersPanel";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "admin-badge-neutral" },
  live: { label: "Live", className: "admin-badge-success" },
  ended: { label: "Selesai", className: "admin-badge-neutral" },
  expired: { label: "Masa aktif habis", className: "admin-badge-danger" },
};

function formatDuration(ms: number): string {
  const abs = Math.abs(ms);
  const days = Math.floor(abs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((abs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days > 0) return `${days} hari`;
  return `${hours} jam`;
}

function Row({
  event,
  subscription,
  onBuy,
}: {
  event: Event;
  subscription: Subscription | null;
  onBuy: () => void;
}) {
  const status = effectiveStatus(event, subscription);
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.draft;
  const used = subscription?.stripUsed ?? 0;
  const quota = subscription?.stripQuota ?? 0;
  const left = Math.max(0, quota - used);
  const pct = quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;
  const ms = msUntilExpiry(subscription);

  return (
    <div
      className="admin-card"
      style={{ padding: 20, borderRadius: 18, marginBottom: 14, display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 20, alignItems: "center" }}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
          <span className={`admin-badge ${badge.className}`}>{badge.label}</span>
          <p className="truncate" style={{ fontSize: 15, fontWeight: 800, color: "#0F172A" }}>
            {event.identity.internalName}
          </p>
        </div>
        <p style={{ fontSize: 12, color: "var(--a-clr-text-muted)" }}>
          Paket: <span style={{ fontWeight: 700 }}>{subscription?.planId ?? "—"}</span>
        </p>
        <Link
          href={`/admin/events/${event.id}`}
          style={{ fontSize: 12, fontWeight: 700, color: "var(--a-clr-primary)", marginTop: 6, display: "inline-block" }}
        >
          Buka event →
        </Link>
      </div>

      <div style={{ minWidth: 150 }}>
        <div className="flex items-center gap-1.5" style={{ fontSize: 11, fontWeight: 800, color: "#94A3B8", marginBottom: 4 }}>
          <Ticket size={12} /> KUOTA STRIP
        </div>
        <p style={{ fontSize: 20, fontWeight: 900, color: "#0F172A" }}>
          {left} <span style={{ fontSize: 12, fontWeight: 600, color: "#64748B" }}>/ {quota || "?"}</span>
        </p>
        <div style={{ width: 130, height: 5, background: "#F1F5F9", borderRadius: 8, marginTop: 4, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: "var(--a-clr-primary)" }} />
        </div>
      </div>

      <div style={{ minWidth: 150, textAlign: "right" }}>
        <div className="flex items-center justify-end gap-1.5" style={{ fontSize: 11, fontWeight: 800, color: "#94A3B8", marginBottom: 4 }}>
          <Clock size={12} /> MASA AKTIF
        </div>
        {!subscription?.expiresAt ? (
          <p style={{ fontSize: 12, color: "var(--a-clr-text-muted)" }}>—</p>
        ) : ms !== null && ms < 0 ? (
          <p style={{ fontSize: 13, fontWeight: 800, color: "var(--a-clr-danger)" }}>
            Habis {formatDuration(ms)} lalu
          </p>
        ) : ms !== null ? (
          <p style={{ fontSize: 13, fontWeight: 800, color: "#0F172A" }}>Tersisa {formatDuration(ms)}</p>
        ) : null}
      </div>

      <button onClick={onBuy} className="admin-btn admin-btn-outline admin-btn-sm shrink-0">
        <Plus size={13} /> Beli Add-on
      </button>
    </div>
  );
}

export default function BillingOverview({
  rows,
  isStaff,
  clientType,
  eventSlotsTotal,
  eventCount,
}: {
  rows: { event: Event; subscription: Subscription | null }[];
  isStaff: boolean;
  clientType: "personal" | "vendor";
  eventSlotsTotal?: number;
  eventCount: number;
}) {
  const [modalFor, setModalFor] = useState<{ eventId?: string; eventLabel?: string; kinds: ("topup_strip" | "extend_days" | "add_event_slot")[] } | null>(
    null
  );
  const [refreshKey, setRefreshKey] = useState(0);

  const eventNames = Object.fromEntries(rows.map((r) => [r.event.id, r.event.identity.internalName]));

  return (
    <div>
      {rows.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center text-center"
          style={{ minHeight: 260, gap: 10, borderRadius: 24, border: "1px dashed var(--a-clr-border)", padding: 40 }}
        >
          <CreditCard size={28} color="var(--a-clr-text-muted)" />
          <p style={{ fontSize: 14, color: "var(--a-clr-text-muted)" }}>Belum ada event untuk ditagih.</p>
        </div>
      ) : (
        rows.map(({ event, subscription }) => (
          <Row
            key={event.id}
            event={event}
            subscription={subscription}
            onBuy={() =>
              setModalFor({
                eventId: event.id,
                eventLabel: event.identity.internalName,
                kinds: ["topup_strip", "extend_days"],
              })
            }
          />
        ))
      )}

      {clientType === "vendor" && (
        <div
          className="admin-card flex flex-wrap items-center justify-between gap-3"
          style={{ padding: 18, borderRadius: 16, marginTop: 4 }}
        >
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: "#0F172A" }}>Jatah event Vendor/EO</p>
            <p style={{ fontSize: 12, color: "var(--a-clr-text-muted)" }}>
              {eventCount} event dibuat
              {eventSlotsTotal ? ` dari ${eventSlotsTotal} jatah` : " — jatah belum dibatasi"}.
            </p>
          </div>
          <button
            onClick={() => setModalFor({ kinds: ["add_event_slot"] })}
            className="admin-btn admin-btn-outline admin-btn-sm"
          >
            <Plus size={13} /> Tambah Jatah Event
          </button>
        </div>
      )}

      <OrdersPanel isStaff={isStaff} eventNames={eventNames} refreshKey={refreshKey} />

      {modalFor && (
        <AddonPurchaseModal
          kinds={modalFor.kinds}
          eventId={modalFor.eventId}
          eventLabel={modalFor.eventLabel}
          onClose={() => setModalFor(null)}
          onCreated={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
