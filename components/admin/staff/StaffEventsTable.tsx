"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import DataTable, { type Column } from "../DataTable";

export interface StaffEventRow {
  id: string;
  slug: string;
  internalName: string;
  names: string;
  dateDisplay: string;
  /** ISO — dipakai mengurutkan; dateDisplay ditulis bebas oleh klien
      sehingga tidak bisa diurutkan secara kronologis. */
  date: string;
  status: "draft" | "live" | "ended";
  ownerLabel: string;
  ownerEmail: string;
  stripQuota: number;
  stripUsed: number;
  frameCount: number;
  createdAt: string;
}

const STATUS: Record<StaffEventRow["status"], { label: string; bg: string; fg: string; br: string }> = {
  draft: { label: "Draf", bg: "#F1F5F9", fg: "#475569", br: "#E2E8F0" },
  live: { label: "Tayang", bg: "#ECFDF5", fg: "#047857", br: "#A7F3D0" },
  ended: { label: "Selesai", bg: "#FEF3C7", fg: "#92400E", br: "#FDE68A" },
};

export default function StaffEventsTable({ rows }: { rows: StaffEventRow[] }) {
  const columns: Column<StaffEventRow>[] = [
    {
      key: "event",
      header: "Acara",
      sortValue: (r) => r.internalName,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate" style={{ fontWeight: 800 }}>
            {r.internalName}
          </p>
          <p className="truncate" style={{ fontSize: 11.5, color: "var(--a-clr-text-muted)" }}>
            {r.names} · /e/{r.slug}
          </p>
        </div>
      ),
    },
    {
      key: "owner",
      header: "Pemilik",
      sortValue: (r) => r.ownerLabel,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate" style={{ fontSize: 12.5, fontWeight: 700 }}>
            {r.ownerLabel}
          </p>
          <p className="truncate" style={{ fontSize: 11, color: "var(--a-clr-text-muted)" }}>
            {r.ownerEmail}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (r) => r.status,
      cell: (r) => {
        const s = STATUS[r.status];
        return (
          <span
            style={{
              display: "inline-block",
              padding: "2px 8px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 800,
              background: s.bg,
              color: s.fg,
              border: `1px solid ${s.br}`,
              whiteSpace: "nowrap",
            }}
          >
            {s.label}
          </span>
        );
      },
    },
    {
      key: "date",
      header: "Tanggal acara",
      sortValue: (r) => r.date,
      cell: (r) => <span style={{ fontSize: 12.5, whiteSpace: "nowrap" }}>{r.dateDisplay}</span>,
    },
    {
      key: "frames",
      header: "Bingkai",
      align: "right",
      sortValue: (r) => r.frameCount,
      cell: (r) =>
        r.frameCount === 0 ? (
          // Nol bingkai = tamu sampai di layar Pilih Bingkai lalu buntu.
          // Ditandai supaya staff bisa menegur sebelum acara berjalan.
          <span style={{ fontWeight: 800, color: "var(--a-clr-warning)" }}>0 ⚠</span>
        ) : (
          <span style={{ fontWeight: 700 }}>{r.frameCount}</span>
        ),
    },
    {
      key: "strip",
      header: "Strip",
      align: "right",
      sortValue: (r) => (r.stripQuota ? r.stripUsed / r.stripQuota : 0),
      cell: (r) => {
        if (!r.stripQuota) return <span style={{ color: "var(--a-clr-text-muted)" }}>—</span>;
        const low = r.stripQuota - r.stripUsed <= r.stripQuota * 0.2;
        return (
          <span style={{ whiteSpace: "nowrap", fontWeight: 700, color: low ? "#B45309" : "#0F172A" }}>
            {r.stripUsed}/{r.stripQuota}
          </span>
        );
      },
    },
    {
      key: "open",
      header: "",
      cell: (r) => (
        <Link
          href={`/e/${encodeURIComponent(r.slug)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center"
          style={{ gap: 4, fontSize: 12, fontWeight: 700, color: "var(--a-clr-primary)", whiteSpace: "nowrap" }}
        >
          Lihat <ExternalLink size={11} aria-hidden />
        </Link>
      ),
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowKey={(r) => r.id}
      searchPlaceholder="Cari acara, pemilik, atau kode…"
      emptyTitle="Belum ada acara"
      emptyHint="Acara dibuat dari akun klien — staff tidak membuat acara sendiri."
    />
  );
}
