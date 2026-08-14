"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

interface TemplateRow {
  id: string;
  code: string;
  name: string;
  status: "draft" | "published" | "archived";
  version: number;
  usageCount: number;
}

export default function TemplatesListManager({ initial }: { initial: TemplateRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [folder, setFolder] = useState("");
  const [brandLabel, setBrandLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function create() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name, folder, brandLabel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal membuat template.");
      router.push(`/admin/templates/${data.template.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan.");
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <span className="t2-mono" style={{ fontSize: 12, color: "var(--a-clr-text-muted)" }}>
          {rows.length} template
        </span>
        {!creating && (
          <button className="t2-btn t2-btn-primary" onClick={() => setCreating(true)} type="button">
            <Plus size={16} /> Template baru
          </button>
        )}
      </div>

      {creating && (
        <div className="t2-sheet" style={{ marginBottom: 20 }}>
          <div className="t2-sheet-section">
            <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--a-clr-text)" }}>Template baru</h2>
              <button type="button" onClick={() => setCreating(false)} aria-label="Tutup" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--a-clr-text-muted)" }}>
                <X size={18} />
              </button>
            </div>
            {error && <p style={{ fontSize: 13, color: "var(--a-clr-danger)", marginBottom: 12 }}>{error}</p>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label className="t2-label" htmlFor="t-code">Kode</label>
                <input id="t-code" className="t2-input t2-mono" value={code} onChange={(e) => setCode(e.target.value)} placeholder="wedding-klasik-01" />
              </div>
              <div>
                <label className="t2-label" htmlFor="t-name">Nama</label>
                <input id="t-name" className="t2-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Klasik Emas" />
              </div>
              <div>
                <label className="t2-label" htmlFor="t-folder">Folder aset</label>
                <input id="t-folder" className="t2-input t2-mono" value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="klasik-emas" />
              </div>
              <div>
                <label className="t2-label" htmlFor="t-brand">Sapaan besar</label>
                <input id="t-brand" className="t2-input" value={brandLabel} onChange={(e) => setBrandLabel(e.target.value)} placeholder="Happy Wedding" />
              </div>
            </div>
            <button className="t2-btn t2-btn-primary" onClick={create} disabled={saving} type="button" style={{ marginTop: 16 }}>
              {saving ? "Membuat…" : "Buat & lanjut isi detail"}
            </button>
          </div>
        </div>
      )}

      <div className="t2-sheet">
        {rows.length === 0 ? (
          <div className="t2-sheet-section" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--a-clr-text)" }}>Belum ada template.</p>
          </div>
        ) : (
          rows.map((row) => (
            <a
              key={row.id}
              href={`/admin/templates/${row.id}`}
              className="t2-sheet-section flex items-center justify-between"
              style={{ gap: 12, textDecoration: "none" }}
            >
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--a-clr-text)" }}>{row.name}</p>
                <p className="t2-mono" style={{ fontSize: 12, color: "var(--a-clr-text-muted)" }}>
                  {row.code} · v{row.version} · dipakai {row.usageCount}× acara
                </p>
              </div>
              <span className={`t2-badge ${row.status === "published" ? "t2-badge-active" : "t2-badge-archived"}`}>
                {row.status}
              </span>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
