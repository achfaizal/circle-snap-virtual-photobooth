"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

export interface CategoryRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  defaultGreeting: string | null;
  defaultBrandLabel: string | null;
  sortOrder: number;
  status: "active" | "archived";
}

type FormState = {
  code: string;
  name: string;
  description: string;
  icon: string;
  defaultGreeting: string;
  defaultBrandLabel: string;
  sortOrder: string;
};

const EMPTY_FORM: FormState = {
  code: "",
  name: "",
  description: "",
  icon: "",
  defaultGreeting: "",
  defaultBrandLabel: "",
  sortOrder: "0",
};

export default function CategoriesManager({ initial }: { initial: CategoryRow[] }) {
  const [rows, setRows] = useState(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function startCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setCreating(true);
    setError(null);
  }

  function startEdit(row: CategoryRow) {
    setForm({
      code: row.code,
      name: row.name,
      description: row.description ?? "",
      icon: row.icon ?? "",
      defaultGreeting: row.defaultGreeting ?? "",
      defaultBrandLabel: row.defaultBrandLabel ?? "",
      sortOrder: String(row.sortOrder),
    });
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
        description: form.description || null,
        icon: form.icon || null,
        defaultGreeting: form.defaultGreeting || null,
        defaultBrandLabel: form.defaultBrandLabel || null,
        sortOrder: Number(form.sortOrder) || 0,
      };

      if (editingId) {
        const res = await fetch(`/api/admin/categories/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Gagal menyimpan.");
        setRows((prev) => prev.map((r) => (r.id === editingId ? data.category : r)));
      } else {
        const res = await fetch("/api/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Gagal membuat kategori.");
        setRows((prev) => [...prev, data.category].sort((a, b) => a.sortOrder - b.sortOrder));
      }
      closeForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleArchive(row: CategoryRow) {
    const nextStatus = row.status === "active" ? "archived" : "active";
    const res = await fetch(`/api/admin/categories/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const data = await res.json();
    if (res.ok) setRows((prev) => prev.map((r) => (r.id === row.id ? data.category : r)));
  }

  async function remove(row: CategoryRow) {
    const res = await fetch(`/api/admin/categories/${row.id}`, { method: "DELETE" });
    if (res.ok) {
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      return;
    }
    const data = await res.json().catch(() => ({}));
    alert(data.error ?? "Kategori tidak bisa dihapus.");
  }

  const showForm = creating || editingId !== null;

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <span className="t2-mono" style={{ fontSize: 12, color: "var(--a-clr-text-muted)" }}>
          {rows.length} kategori
        </span>
        {!showForm && (
          <button className="t2-btn t2-btn-primary" onClick={startCreate} type="button">
            <Plus size={16} /> Kategori baru
          </button>
        )}
      </div>

      {showForm && (
        <div className="t2-sheet" style={{ marginBottom: 20 }}>
          <div className="t2-sheet-section">
            <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--a-clr-text)" }}>
                {editingId ? "Ubah kategori" : "Kategori baru"}
              </h2>
              <button
                type="button"
                onClick={closeForm}
                aria-label="Tutup"
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--a-clr-text-muted)" }}
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <p style={{ fontSize: 13, color: "var(--a-clr-danger)", marginBottom: 12 }}>{error}</p>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label className="t2-label" htmlFor="code">
                  Kode {editingId && "(terkunci)"}
                </label>
                <input
                  id="code"
                  className="t2-input"
                  value={form.code}
                  disabled={!!editingId}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="wedding"
                />
              </div>
              <div>
                <label className="t2-label" htmlFor="name">
                  Nama
                </label>
                <input
                  id="name"
                  className="t2-input"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Pernikahan"
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="t2-label" htmlFor="description">
                  Deskripsi
                </label>
                <input
                  id="description"
                  className="t2-input"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Resepsi, akad, atau keduanya"
                  maxLength={140}
                />
              </div>
              <div>
                <label className="t2-label" htmlFor="icon">
                  Ikon (emoji)
                </label>
                <input
                  id="icon"
                  className="t2-input"
                  value={form.icon}
                  onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                  placeholder="💍"
                />
              </div>
              <div>
                <label className="t2-label" htmlFor="sortOrder">
                  Urutan
                </label>
                <input
                  id="sortOrder"
                  className="t2-input t2-mono"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                />
              </div>
              <div>
                <label className="t2-label" htmlFor="defaultBrandLabel">
                  Sapaan besar bawaan
                </label>
                <input
                  id="defaultBrandLabel"
                  className="t2-input"
                  value={form.defaultBrandLabel}
                  onChange={(e) => setForm((f) => ({ ...f, defaultBrandLabel: e.target.value }))}
                  placeholder="Happy Wedding"
                  maxLength={40}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="t2-label" htmlFor="defaultGreeting">
                  Sambutan bawaan
                </label>
                <input
                  id="defaultGreeting"
                  className="t2-input"
                  value={form.defaultGreeting}
                  onChange={(e) => setForm((f) => ({ ...f, defaultGreeting: e.target.value }))}
                  placeholder="Terima kasih sudah datang…"
                />
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
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--a-clr-text)" }}>Belum ada kategori.</p>
            <p style={{ fontSize: 13, color: "var(--a-clr-text-muted)", marginTop: 4 }}>
              Buat kategori pertama supaya template &amp; acara punya cara disaring.
            </p>
          </div>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="t2-sheet-section flex items-center justify-between" style={{ gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <span style={{ fontSize: 20 }} aria-hidden>
                  {row.icon || "—"}
                </span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--a-clr-text)" }}>{row.name}</p>
                  <p className="t2-mono" style={{ fontSize: 12, color: "var(--a-clr-text-muted)" }}>
                    {row.code}
                  </p>
                </div>
                <span className={`t2-badge ${row.status === "active" ? "t2-badge-active" : "t2-badge-archived"}`}>
                  {row.status === "active" ? "aktif" : "arsip"}
                </span>
              </div>
              <div className="flex" style={{ gap: 8, flexShrink: 0 }}>
                <button className="t2-btn t2-btn-secondary t2-btn-sm" onClick={() => startEdit(row)} type="button">
                  Ubah
                </button>
                <button className="t2-btn t2-btn-secondary t2-btn-sm" onClick={() => toggleArchive(row)} type="button">
                  {row.status === "active" ? "Arsipkan" : "Aktifkan"}
                </button>
                <button className="t2-btn t2-btn-danger t2-btn-sm" onClick={() => remove(row)} type="button">
                  Hapus
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
