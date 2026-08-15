"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface DetailsCategory {
  id: string;
  name: string;
}

export default function EventDetailsForm({
  eventId,
  categories,
  initial,
  startsAtLocked,
}: {
  eventId: string;
  categories: DetailsCategory[];
  initial: { internalName: string; categoryId: string; venue: string; timezone: string; startsAtLocal: string };
  startsAtLocked: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/app/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          internalName: form.internalName,
          categoryId: form.categoryId,
          venue: form.venue,
          timezone: form.timezone,
          ...(startsAtLocked ? {} : { startsAt: new Date(form.startsAtLocal).toISOString() }),
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "Gagal menyimpan.");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Tidak bisa menghubungi server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ background: "white", border: "1px solid #E4E4E7", borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 4, color: "#3F3F46" }}>Nama internal</label>
        <input className="admin-input" style={{ margin: 0 }} value={form.internalName} onChange={(e) => setForm((p) => ({ ...p, internalName: e.target.value }))} />
      </div>

      <div>
        <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 4, color: "#3F3F46" }}>Kategori</label>
        <select className="admin-input" style={{ margin: 0 }} value={form.categoryId} onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 4, color: "#3F3F46" }}>Lokasi</label>
        <input className="admin-input" style={{ margin: 0 }} placeholder="mis. Grand Ballroom, Jakarta" value={form.venue} onChange={(e) => setForm((p) => ({ ...p, venue: e.target.value }))} />
      </div>

      <div>
        <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 4, color: "#3F3F46" }}>
          Jadwal mulai {startsAtLocked && <span style={{ fontWeight: 500, color: "#EF4444" }}>(terkunci — acara sudah berjalan)</span>}
        </label>
        <input
          type="datetime-local"
          className="admin-input"
          style={{ margin: 0 }}
          value={form.startsAtLocal}
          disabled={startsAtLocked}
          onChange={(e) => setForm((p) => ({ ...p, startsAtLocal: e.target.value }))}
        />
      </div>

      {error && <p style={{ fontSize: 13, color: "#EF4444" }}>{error}</p>}
      {saved && !error && <p style={{ fontSize: 13, color: "#16A34A" }}>Tersimpan.</p>}

      <button
        type="submit"
        disabled={busy}
        style={{
          alignSelf: "flex-start",
          padding: "9px 18px",
          borderRadius: 100,
          border: "none",
          background: "linear-gradient(135deg, var(--a-clr-brand-1), var(--a-clr-brand-2))",
          color: "white",
          fontWeight: 800,
          fontSize: 13,
          cursor: busy ? "not-allowed" : "pointer",
          opacity: busy ? 0.7 : 1,
        }}
      >
        {busy ? "Menyimpan…" : "Simpan"}
      </button>
    </form>
  );
}
