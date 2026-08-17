"use client";

import { useState } from "react";
import Spinner from "@/components/admin/Spinner";

interface AuditLogRow {
  id: string;
  createdAt: string;
  actorUserId: string | null;
  actorEmail: string | null;
  actorIp: string | null;
  accountId: string | null;
  accountName: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before: unknown;
  after: unknown;
  reason: string | null;
}

function formatWaktu(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

/** Langkah 12 Tahap 4 — tabel baca-saja dengan saring (dok 04 §12).
    Filter dikirim ke server (bukan disaring di klien) karena daftar
    penuh dibatasi 500 baris di server (lib/db/queries/auditLogs.ts) —
    menyaring di klien cuma akan menyaring dari 500 baris itu, bisa
    melewatkan baris lama yang sebenarnya cocok filter. */
export default function AuditLogTable({
  initial,
  accountOptions,
  actorOptions,
  actionOptions,
  entityTypeOptions,
}: {
  initial: AuditLogRow[];
  accountOptions: { id: string; displayName: string }[];
  actorOptions: { id: string; email: string }[];
  actionOptions: string[];
  entityTypeOptions: string[];
}) {
  const [rows, setRows] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filters, setFilters] = useState({ actorUserId: "", action: "", entityType: "", accountId: "", from: "", to: "" });

  const buildParams = () => {
    const params = new URLSearchParams();
    if (filters.actorUserId) params.set("actorUserId", filters.actorUserId);
    if (filters.action) params.set("action", filters.action);
    if (filters.entityType) params.set("entityType", filters.entityType);
    if (filters.accountId) params.set("accountId", filters.accountId);
    if (filters.from) params.set("from", new Date(filters.from).toISOString());
    if (filters.to) params.set("to", new Date(filters.to).toISOString());
    return params;
  };

  const applyFilters = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/audit-logs?${buildParams().toString()}`);
      const data = (await res.json()) as { logs: AuditLogRow[] };
      setRows(data.logs);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 8,
          marginBottom: 16,
          padding: 16,
          background: "var(--a-clr-bg)",
          borderRadius: 12,
          border: "1px solid var(--a-clr-border)",
        }}
      >
        <select className="t2-input" value={filters.actorUserId} onChange={(e) => setFilters({ ...filters, actorUserId: e.target.value })}>
          <option value="">Semua pelaku</option>
          {actorOptions.map((a) => (
            <option key={a.id} value={a.id}>{a.email}</option>
          ))}
        </select>
        <select className="t2-input" value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })}>
          <option value="">Semua tindakan</option>
          {actionOptions.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <select className="t2-input" value={filters.entityType} onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}>
          <option value="">Semua jenis entitas</option>
          {entityTypeOptions.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        <select className="t2-input" value={filters.accountId} onChange={(e) => setFilters({ ...filters, accountId: e.target.value })}>
          <option value="">Semua akun</option>
          {accountOptions.map((a) => (
            <option key={a.id} value={a.id}>{a.displayName}</option>
          ))}
        </select>
        <input type="date" className="t2-input" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
        <input type="date" className="t2-input" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
      </div>

      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <button
          type="button"
          onClick={applyFilters}
          disabled={loading}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 16px",
            borderRadius: 100,
            border: "none",
            background: "var(--a-clr-primary-dark)",
            color: "white",
            fontWeight: 800,
            fontSize: 13,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading && <Spinner size={13} />}
          Terapkan saringan
        </button>
        <a
          href={`/api/admin/audit-logs?${buildParams().toString()}&format=csv`}
          style={{ fontSize: 13, fontWeight: 700, color: "var(--a-clr-primary-dark)", textDecoration: "none" }}
        >
          Ekspor CSV
        </a>
      </div>

      <div className="t2-sheet">
        {rows.length === 0 ? (
          <div className="t2-sheet-section" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--a-clr-text)" }}>Tidak ada jejak audit yang cocok saringan ini.</p>
          </div>
        ) : (
          rows.map((r) => (
            <div key={r.id}>
              <button
                type="button"
                onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                className="t2-sheet-section flex items-center justify-between"
                style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer" }}
              >
                <div>
                  <span className="t2-mono" style={{ fontSize: 12, color: "var(--a-clr-text-muted)" }}>{formatWaktu(r.createdAt)}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--a-clr-text)", marginLeft: 12 }}>{r.action}</span>
                  <span style={{ fontSize: 12, color: "var(--a-clr-text-muted)", marginLeft: 8 }}>
                    {r.actorEmail ?? "sistem"} {r.accountName ? `· ${r.accountName}` : ""}
                  </span>
                </div>
                <span className="t2-badge">{r.entityType}</span>
              </button>
              {expanded === r.id && (
                <div className="t2-sheet-section" style={{ paddingTop: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 800, color: "var(--a-clr-text-muted)", marginBottom: 4, textTransform: "uppercase" }}>Sebelum</p>
                    <pre className="t2-mono" style={{ fontSize: 11, background: "var(--a-clr-bg)", padding: 10, borderRadius: 8, overflowX: "auto" }}>
                      {r.before ? JSON.stringify(r.before, null, 2) : "—"}
                    </pre>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 800, color: "var(--a-clr-text-muted)", marginBottom: 4, textTransform: "uppercase" }}>Sesudah</p>
                    <pre className="t2-mono" style={{ fontSize: 11, background: "var(--a-clr-bg)", padding: 10, borderRadius: 8, overflowX: "auto" }}>
                      {r.after ? JSON.stringify(r.after, null, 2) : "—"}
                    </pre>
                  </div>
                  {r.reason && (
                    <p style={{ gridColumn: "1 / -1", fontSize: 12, color: "var(--a-clr-text-muted)" }}>Alasan: {r.reason}</p>
                  )}
                  <p style={{ gridColumn: "1 / -1", fontSize: 11, color: "var(--a-clr-text-muted)" }}>
                    entitas: {r.entityId} {r.actorIp ? `· ip: ${r.actorIp}` : ""}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
