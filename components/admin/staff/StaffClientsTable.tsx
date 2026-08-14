"use client";

import { MessageCircle } from "lucide-react";
import DataTable, { type Column } from "../DataTable";

export interface StaffClientRow {
  id: string;
  name: string;
  businessName?: string;
  email: string;
  whatsapp?: string;
  type: "personal" | "vendor";
  createdAt: string;
  eventCount: number;
  /** Jatah event terbeli. undefined = belum pernah dibatasi. */
  eventSlotsTotal?: number;
  planName?: string;
  stripQuota: number;
  stripUsed: number;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** 0812-3456-7890 dari 6281234567890 — lebih mudah dibaca & dicocokkan
    staff dengan nomor yang masuk di WhatsApp. */
function fmtWa(n: string): string {
  const local = "0" + n.replace(/^62/, "");
  return local.replace(/(\d{4})(\d{4})(\d+)/, "$1-$2-$3");
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "vendor" | "personal" }) {
  const c =
    tone === "vendor"
      ? { bg: "#EEF2FF", fg: "#4338CA", br: "#C7D2FE" }
      : { bg: "#F0FDF4", fg: "#15803D", br: "#BBF7D0" };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 800,
        background: c.bg,
        color: c.fg,
        border: `1px solid ${c.br}`,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export default function StaffClientsTable({ rows }: { rows: StaffClientRow[] }) {
  const columns: Column<StaffClientRow>[] = [
    {
      key: "name",
      header: "Klien",
      sortValue: (r) => `${r.businessName ?? ""} ${r.name}`.trim(),
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate" style={{ fontWeight: 800 }}>
            {r.businessName ?? r.name}
          </p>
          <p className="truncate" style={{ fontSize: 11.5, color: "var(--a-clr-text-muted)" }}>
            {r.businessName ? `PIC: ${r.name} · ` : ""}
            {r.email}
          </p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Tipe",
      sortValue: (r) => r.type,
      cell: (r) => (
        <Badge tone={r.type}>{r.type === "vendor" ? "Vendor / EO" : "Acara Sendiri"}</Badge>
      ),
    },
    {
      key: "whatsapp",
      header: "WhatsApp",
      sortValue: (r) => r.whatsapp ?? "",
      cell: (r) =>
        r.whatsapp ? (
          <a
            href={`https://wa.me/${r.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center"
            style={{ gap: 5, color: "var(--a-clr-primary)", fontWeight: 700, whiteSpace: "nowrap" }}
          >
            <MessageCircle size={12} aria-hidden />
            {fmtWa(r.whatsapp)}
          </a>
        ) : (
          // Klien lama terdaftar sebelum nomor diwajibkan — ditandai
          // jelas, bukan dibiarkan kosong seolah wajar.
          <span style={{ fontSize: 11.5, color: "var(--a-clr-warning)", fontWeight: 700 }}>
            belum ada
          </span>
        ),
    },
    {
      key: "plan",
      header: "Paket",
      sortValue: (r) => r.planName ?? "",
      cell: (r) =>
        r.planName ? (
          <span style={{ fontSize: 12.5 }}>{r.planName}</span>
        ) : (
          <span style={{ fontSize: 12, color: "var(--a-clr-text-muted)" }}>belum beli</span>
        ),
    },
    {
      key: "events",
      header: "Acara",
      align: "right",
      sortValue: (r) => r.eventCount,
      cell: (r) => (
        <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
          {r.eventCount}
          {r.eventSlotsTotal !== undefined && (
            <span style={{ color: "var(--a-clr-text-muted)", fontWeight: 500 }}>
              {" / "}
              {r.eventSlotsTotal}
            </span>
          )}
        </span>
      ),
    },
    {
      key: "strip",
      header: "Strip terpakai",
      align: "right",
      sortValue: (r) => (r.stripQuota ? r.stripUsed / r.stripQuota : 0),
      cell: (r) => {
        if (!r.stripQuota) return <span style={{ color: "var(--a-clr-text-muted)" }}>—</span>;
        const pct = Math.round((r.stripUsed / r.stripQuota) * 100);
        const low = r.stripQuota - r.stripUsed <= r.stripQuota * 0.2;
        return (
          <span style={{ whiteSpace: "nowrap", fontWeight: 700, color: low ? "#B45309" : "#0F172A" }}>
            {r.stripUsed}/{r.stripQuota}
            <span style={{ fontWeight: 500, color: "var(--a-clr-text-muted)" }}> ({pct}%)</span>
          </span>
        );
      },
    },
    {
      key: "createdAt",
      header: "Daftar",
      sortValue: (r) => r.createdAt,
      cell: (r) => (
        <span style={{ fontSize: 12.5, color: "var(--a-clr-text-muted)", whiteSpace: "nowrap" }}>
          {fmtDate(r.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowKey={(r) => r.id}
      searchPlaceholder="Cari nama, usaha, email, atau nomor…"
      emptyTitle="Belum ada klien terdaftar"
      emptyHint="Klien muncul di sini begitu mereka mendaftar sendiri lewat halaman Daftar."
    />
  );
}
