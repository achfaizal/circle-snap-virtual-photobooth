"use client";

import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";

interface FrameRow {
  id: string;
  name: string;
  status: "active" | "archived";
  slotCount: number;
  width: number;
  height: number;
}

interface CheckResult {
  passed: boolean;
  message: string;
}
interface UploadReport {
  passed: boolean;
  checks: Record<string, CheckResult>;
  warnings: Record<string, { triggered: boolean; message: string }>;
}

export default function SystemFramesManager({ initial }: { initial: FrameRow[] }) {
  const [rows, setRows] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastReport, setLastReport] = useState<UploadReport | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Pilih berkas PNG dulu.");
      return;
    }
    setUploading(true);
    setError(null);
    setLastReport(null);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("name", name);
      const res = await fetch("/api/admin/frames", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setLastReport(data.report ?? null);
        throw new Error(
          data.failedChecks ? `Ditolak: ${data.failedChecks.join("; ")}` : data.error ?? "Gagal mengunggah."
        );
      }
      setLastReport(data.report);
      setRows((prev) => [
        {
          id: data.frame.id,
          name: data.frame.name,
          status: data.frame.status,
          slotCount: data.frame.slotCount,
          width: data.frame.width,
          height: data.frame.height,
        },
        ...prev,
      ]);
      setName("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan.");
    } finally {
      setUploading(false);
    }
  }

  async function toggleArchive(row: FrameRow) {
    const nextStatus = row.status === "active" ? "archived" : "active";
    const res = await fetch(`/api/admin/frames/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const data = await res.json();
    if (res.ok) {
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: data.frame.status } : r)));
    } else {
      alert(data.error ?? "Gagal mengubah status.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <span className="t2-mono" style={{ fontSize: 12, color: "var(--a-clr-text-muted)" }}>
          {rows.length} bingkai
        </span>
        {!showForm && (
          <button className="t2-btn t2-btn-primary" onClick={() => setShowForm(true)} type="button">
            <Plus size={16} /> Unggah bingkai
          </button>
        )}
      </div>

      {showForm && (
        <div className="t2-sheet" style={{ marginBottom: 20 }}>
          <div className="t2-sheet-section">
            <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--a-clr-text)" }}>Unggah bingkai baru</h2>
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(null); setLastReport(null); }}
                aria-label="Tutup"
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--a-clr-text-muted)" }}
              >
                <X size={18} />
              </button>
            </div>

            {error && <p style={{ fontSize: 13, color: "var(--a-clr-danger)", marginBottom: 12 }}>{error}</p>}

            <div style={{ marginBottom: 12 }}>
              <label className="t2-label" htmlFor="sf-name">Nama bingkai</label>
              <input id="sf-name" className="t2-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Satu Foto Botanical" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="t2-label" htmlFor="sf-file">Berkas PNG (RGBA, ≤8MB)</label>
              <input id="sf-file" type="file" accept="image/png" ref={fileRef} className="t2-input" />
            </div>

            <button className="t2-btn t2-btn-primary" onClick={upload} disabled={uploading} type="button">
              {uploading ? "Memvalidasi & mengunggah…" : "Unggah & validasi"}
            </button>

            {lastReport && (
              <div style={{ marginTop: 16, borderTop: "1px solid var(--a-clr-border)", paddingTop: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: lastReport.passed ? "#065f46" : "var(--a-clr-danger)" }}>
                  {lastReport.passed ? "Lolos semua pemeriksaan V1–V8" : "Gagal validasi"}
                </p>
                <div className="t2-mono" style={{ fontSize: 12, display: "grid", gap: 3 }}>
                  {Object.entries(lastReport.checks).map(([key, c]) => (
                    <span key={key} style={{ color: c.passed ? "var(--a-clr-text-muted)" : "var(--a-clr-danger)" }}>
                      {c.passed ? "✔" : "✘"} {key}: {c.message}
                    </span>
                  ))}
                </div>
                {Object.values(lastReport.warnings).some((w) => w.triggered) && (
                  <div className="t2-mono" style={{ fontSize: 12, marginTop: 8, display: "grid", gap: 3 }}>
                    {Object.entries(lastReport.warnings)
                      .filter(([, w]) => w.triggered)
                      .map(([key, w]) => (
                        <span key={key} style={{ color: "#b45309" }}>
                          ⚠ {key}: {w.message}
                        </span>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="t2-sheet">
        {rows.length === 0 ? (
          <div className="t2-sheet-section" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--a-clr-text)" }}>Belum ada bingkai sistem.</p>
            <p style={{ fontSize: 13, color: "var(--a-clr-text-muted)", marginTop: 4 }}>
              Unggah PNG pertama — divalidasi otomatis sebelum tersimpan.
            </p>
          </div>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="t2-sheet-section flex items-center justify-between" style={{ gap: 12 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--a-clr-text)" }}>{row.name}</p>
                <p className="t2-mono" style={{ fontSize: 12, color: "var(--a-clr-text-muted)" }}>
                  {row.width}×{row.height}px · {row.slotCount} slot
                </p>
              </div>
              <div className="flex items-center" style={{ gap: 12 }}>
                <span className={`t2-badge ${row.status === "active" ? "t2-badge-active" : "t2-badge-archived"}`}>
                  {row.status === "active" ? "aktif" : "arsip"}
                </span>
                <button className="t2-btn t2-btn-secondary t2-btn-sm" onClick={() => toggleArchive(row)} type="button">
                  {row.status === "active" ? "Arsipkan" : "Aktifkan"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
