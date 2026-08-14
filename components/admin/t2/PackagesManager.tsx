"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { packages } from "@/lib/db/schema";

type PackageRow = typeof packages.$inferSelect;

type FormState = {
  code: string;
  name: string;
  tagline: string;
  audience: "personal" | "vendor" | "both";
  allocationMode: "single_event" | "flexible";
  strips: string;
  minStrips: string;
  priceIdr: string;
  activeDays: string;
  maxEvents: string;
  maxVoiceSeconds: string;
  allowCustomFrame: boolean;
  allowGallery: boolean;
  allowVideoCard: boolean;
  isTopup: boolean;
  sortOrder: string;
};

const EMPTY_FORM: FormState = {
  code: "",
  name: "",
  tagline: "",
  audience: "personal",
  allocationMode: "single_event",
  strips: "100",
  minStrips: "",
  priceIdr: "0",
  activeDays: "7",
  maxEvents: "1",
  maxVoiceSeconds: "15",
  allowCustomFrame: true,
  allowGallery: true,
  allowVideoCard: true,
  isTopup: false,
  sortOrder: "0",
};

function rowToForm(row: PackageRow): FormState {
  return {
    code: row.code,
    name: row.name,
    tagline: row.tagline ?? "",
    audience: row.audience,
    allocationMode: row.allocationMode,
    strips: String(row.strips),
    minStrips: row.minStrips != null ? String(row.minStrips) : "",
    priceIdr: String(row.priceIdr),
    activeDays: String(row.activeDays),
    maxEvents: row.maxEvents != null ? String(row.maxEvents) : "",
    maxVoiceSeconds: String(row.maxVoiceSeconds),
    allowCustomFrame: row.allowCustomFrame,
    allowGallery: row.allowGallery,
    allowVideoCard: row.allowVideoCard,
    isTopup: row.isTopup,
    sortOrder: String(row.sortOrder),
  };
}

function formatIdr(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

export default function PackagesManager({ initial }: { initial: PackageRow[] }) {
  const [rows, setRows] = useState(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const showForm = creating || editingId !== null;

  function startCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setCreating(true);
    setError(null);
  }
  function startEdit(row: PackageRow) {
    setForm(rowToForm(row));
    setEditingId(row.id);
    setCreating(false);
    setError(null);
  }
  function closeForm() {
    setCreating(false);
    setEditingId(null);
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const body = {
        code: form.code,
        name: form.name,
        tagline: form.tagline || null,
        audience: form.audience,
        allocationMode: form.allocationMode,
        strips: Number(form.strips) || 0,
        minStrips: form.minStrips ? Number(form.minStrips) : null,
        priceIdr: Number(form.priceIdr) || 0,
        activeDays: Number(form.activeDays) || 7,
        maxEvents: form.maxEvents ? Number(form.maxEvents) : null,
        maxVoiceSeconds: Number(form.maxVoiceSeconds) || 15,
        allowCustomFrame: form.allowCustomFrame,
        allowGallery: form.allowGallery,
        allowVideoCard: form.allowVideoCard,
        templateScope: "all" as const,
        walletValidMonths: 12,
        isTopup: form.isTopup,
        sortOrder: Number(form.sortOrder) || 0,
      };

      const res = await fetch(editingId ? `/api/admin/packages/${editingId}` : "/api/admin/packages", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal menyimpan.");

      if (editingId) {
        setRows((prev) => prev.map((r) => (r.id === editingId ? data.package : r)));
      } else {
        setRows((prev) => [...prev, data.package].sort((a, b) => a.sortOrder - b.sortOrder));
      }
      closeForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(row: PackageRow, status: "draft" | "published" | "archived") {
    const res = await fetch(`/api/admin/packages/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (res.ok) setRows((prev) => prev.map((r) => (r.id === row.id ? data.package : r)));
  }

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <span className="t2-mono" style={{ fontSize: 12, color: "var(--a-clr-text-muted)" }}>
          {rows.length} paket
        </span>
        {!showForm && (
          <button className="t2-btn t2-btn-primary" onClick={startCreate} type="button">
            <Plus size={16} /> Paket baru
          </button>
        )}
      </div>

      {showForm && (
        <div className="t2-sheet" style={{ marginBottom: 20 }}>
          <div className="t2-sheet-section">
            <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--a-clr-text)" }}>
                {editingId ? "Ubah paket" : "Paket baru"}
              </h2>
              <button type="button" onClick={closeForm} aria-label="Tutup" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--a-clr-text-muted)" }}>
                <X size={18} />
              </button>
            </div>

            {error && <p style={{ fontSize: 13, color: "var(--a-clr-danger)", marginBottom: 12 }}>{error}</p>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label className="t2-label" htmlFor="p-code">Kode {editingId && "(terkunci)"}</label>
                <input id="p-code" className="t2-input t2-mono" value={form.code} disabled={!!editingId}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="PERSONAL-200" />
              </div>
              <div>
                <label className="t2-label" htmlFor="p-name">Nama</label>
                <input id="p-name" className="t2-input" value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Acara Standar" />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="t2-label" htmlFor="p-tagline">Tagline</label>
                <input id="p-tagline" className="t2-input" value={form.tagline}
                  onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))} maxLength={140} />
              </div>

              <div>
                <label className="t2-label" htmlFor="p-audience">Audience</label>
                <select id="p-audience" className="t2-input" value={form.audience}
                  onChange={(e) => {
                    const audience = e.target.value as FormState["audience"];
                    setForm((f) => ({
                      ...f,
                      audience,
                      allocationMode: audience === "personal" ? "single_event" : f.allocationMode,
                      maxEvents: audience === "personal" ? "1" : f.maxEvents,
                    }));
                  }}>
                  <option value="personal">personal</option>
                  <option value="vendor">vendor</option>
                  <option value="both">both</option>
                </select>
              </div>
              <div>
                <label className="t2-label" htmlFor="p-mode">Mode alokasi</label>
                <select id="p-mode" className="t2-input" value={form.allocationMode} disabled={form.audience === "personal"}
                  onChange={(e) => setForm((f) => ({ ...f, allocationMode: e.target.value as FormState["allocationMode"] }))}>
                  <option value="single_event">single_event</option>
                  <option value="flexible">flexible</option>
                </select>
                {form.audience === "personal" && (
                  <p className="t2-mono" style={{ fontSize: 11, color: "var(--a-clr-text-muted)", marginTop: 4 }}>
                    Terkunci single_event (P-04)
                  </p>
                )}
              </div>

              <div>
                <label className="t2-label" htmlFor="p-strips">Strip</label>
                <input id="p-strips" type="number" className="t2-input t2-mono" value={form.strips}
                  onChange={(e) => setForm((f) => ({ ...f, strips: e.target.value }))} />
              </div>
              <div>
                <label className="t2-label" htmlFor="p-min-strips">Min. strip (paket kustom)</label>
                <input id="p-min-strips" type="number" className="t2-input t2-mono" value={form.minStrips}
                  onChange={(e) => setForm((f) => ({ ...f, minStrips: e.target.value }))} placeholder="600 (vendor)" />
              </div>

              <div>
                <label className="t2-label" htmlFor="p-price">Harga (IDR)</label>
                <input id="p-price" type="number" className="t2-input t2-mono" value={form.priceIdr}
                  onChange={(e) => setForm((f) => ({ ...f, priceIdr: e.target.value }))} />
              </div>
              <div>
                <label className="t2-label" htmlFor="p-active-days">Masa aktif (hari)</label>
                <input id="p-active-days" type="number" className="t2-input t2-mono" min={1} max={90} value={form.activeDays}
                  onChange={(e) => setForm((f) => ({ ...f, activeDays: e.target.value }))} />
              </div>

              <div>
                <label className="t2-label" htmlFor="p-max-events">Jatah acara</label>
                <input id="p-max-events" type="number" className="t2-input t2-mono" value={form.maxEvents}
                  disabled={form.audience === "personal" || form.isTopup}
                  onChange={(e) => setForm((f) => ({ ...f, maxEvents: e.target.value }))} placeholder="kosong = tak terbatas" />
              </div>
              <div>
                <label className="t2-label" htmlFor="p-voice">Durasi pesan suara (detik)</label>
                <input id="p-voice" type="number" className="t2-input t2-mono" min={0} max={60} value={form.maxVoiceSeconds}
                  onChange={(e) => setForm((f) => ({ ...f, maxVoiceSeconds: e.target.value }))} />
              </div>

              <div>
                <label className="t2-label" htmlFor="p-sort">Urutan</label>
                <input id="p-sort" type="number" className="t2-input t2-mono" value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} />
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 16, paddingBottom: 10 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--a-clr-text)" }}>
                  <input type="checkbox" checked={form.isTopup}
                    onChange={(e) => setForm((f) => ({ ...f, isTopup: e.target.checked }))} />
                  Paket topup
                </label>
              </div>

              <div style={{ gridColumn: "1 / -1", display: "flex", gap: 20 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                  <input type="checkbox" checked={form.allowCustomFrame}
                    onChange={(e) => setForm((f) => ({ ...f, allowCustomFrame: e.target.checked }))} />
                  Boleh unggah bingkai sendiri
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                  <input type="checkbox" checked={form.allowGallery}
                    onChange={(e) => setForm((f) => ({ ...f, allowGallery: e.target.checked }))} />
                  Galeri Momen
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                  <input type="checkbox" checked={form.allowVideoCard}
                    onChange={(e) => setForm((f) => ({ ...f, allowVideoCard: e.target.checked }))} />
                  Kartu video
                </label>
              </div>
            </div>

            <div className="flex" style={{ gap: 8, marginTop: 20 }}>
              <button className="t2-btn t2-btn-primary" onClick={save} disabled={saving} type="button">
                {saving ? "Menyimpan…" : "Simpan"}
              </button>
              <button className="t2-btn t2-btn-secondary" onClick={closeForm} type="button">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="t2-sheet">
        {rows.length === 0 ? (
          <div className="t2-sheet-section" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--a-clr-text)" }}>Belum ada paket.</p>
            <p style={{ fontSize: 13, color: "var(--a-clr-text-muted)", marginTop: 4 }}>
              Buat paket pertama supaya klien punya sesuatu untuk dibeli.
            </p>
          </div>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="t2-sheet-section flex items-center justify-between" style={{ gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div className="flex items-center" style={{ gap: 8 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--a-clr-text)" }}>{row.name}</p>
                  <span
                    className={`t2-badge ${row.status === "published" ? "t2-badge-active" : "t2-badge-archived"}`}
                  >
                    {row.status}
                  </span>
                </div>
                <p className="t2-mono" style={{ fontSize: 12, color: "var(--a-clr-text-muted)" }}>
                  {row.code} · {row.audience} · {row.allocationMode} · {row.strips} strip · {formatIdr(row.priceIdr)}
                </p>
              </div>
              <div className="flex" style={{ gap: 8, flexShrink: 0 }}>
                <button className="t2-btn t2-btn-secondary t2-btn-sm" onClick={() => startEdit(row)} type="button">
                  Ubah
                </button>
                {row.status !== "published" && (
                  <button className="t2-btn t2-btn-secondary t2-btn-sm" onClick={() => setStatus(row, "published")} type="button">
                    Terbitkan
                  </button>
                )}
                {row.status !== "archived" ? (
                  <button className="t2-btn t2-btn-danger t2-btn-sm" onClick={() => setStatus(row, "archived")} type="button">
                    Arsipkan
                  </button>
                ) : (
                  <button className="t2-btn t2-btn-secondary t2-btn-sm" onClick={() => setStatus(row, "draft")} type="button">
                    Aktifkan lagi
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
