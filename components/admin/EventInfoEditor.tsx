"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import type { Event } from "@/lib/models/event";
import { canEditStartAt } from "@/lib/services/eventLifecycle";
import Spinner from "./Spinner";
import { notifyEventSaved } from "@/lib/utils";

/** ISO 8601 (apa pun offsetnya) -> value yang dimengerti
    <input type="datetime-local"> ("YYYY-MM-DDTHH:mm", waktu LOKAL
    browser). Kosong kalau belum diisi sama sekali. */
function toLocalInputValue(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Satu baris label + input — dipakai berulang di bawah, cukup styling
    konsisten tanpa komponen terpisah untuk fase ini. */
function Field({
  label,
  value,
  onChange,
  hint,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  multiline?: boolean;
}) {
  return (
    <label className="block">
      <span className="admin-label">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="admin-input resize-none"
        />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className="admin-input" />
      )}
      {hint && <span className="mt-1 block text-xs text-[var(--a-clr-text-muted)]">{hint}</span>}
    </label>
  );
}

export default function EventInfoEditor({
  event,
  onSaved,
}: {
  event: Event;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    internalName: event.identity.internalName,
    slug: event.slug,
    brandLabel: event.identity.brandLabel,
    names: event.identity.names,
    dateDisplay: event.identity.dateDisplay,
    venue: event.identity.venue,
    hashtag: event.identity.hashtag,
    greeting: event.identity.greeting,
    startAt: toLocalInputValue(event.startAt),
  });
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const startAtLocked = !canEditStartAt(event);

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    setSaving(true);
    setNote(null);
    try {
      const res = await fetch(`/api/admin/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: form.slug,
          identity: {
            ...event.identity,
            internalName: form.internalName,
            brandLabel: form.brandLabel,
            names: form.names,
            dateDisplay: form.dateDisplay,
            venue: form.venue,
            hashtag: form.hashtag,
            greeting: form.greeting,
          },
          // Tidak dikirim sama sekali kalau terkunci — bukan cuma
          // disabled di UI, field-nya benar-benar absen dari body supaya
          // tidak ada percobaan mengubah lewat DevTools yang lolos diam-
          // diam (server tetap menolak juga, ini lapis kedua).
          ...(startAtLocked
            ? {}
            : { startAt: form.startAt ? new Date(form.startAt).toISOString() : undefined }),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setNote(data?.error ?? "Gagal menyimpan.");
        return;
      }
      setNote("Tersimpan.");
      notifyEventSaved();
      // Nama event tampil di sidebar & topbar, yang dirender layout
      // Server Component — tanpa refresh, nama di situ masih yang lama
      // sampai halaman dimuat ulang manual. notifyEventSaved() di atas
      // cuma memuat ulang iframe pratinjau, bukan layout.
      router.refresh();
      onSaved?.();
    } catch {
      setNote("Tidak bisa menghubungi server.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Field
        label="Nama internal (buat kamu sendiri, tamu tidak lihat)"
        value={form.internalName}
        onChange={set("internalName")}
      />
      <Field
        label="Kode acara (slug URL)"
        value={form.slug}
        onChange={set("slug")}
        hint={`Playground: /e/${form.slug || "..."}`}
      />
      <Field label="Sapaan besar" value={form.brandLabel} onChange={set("brandLabel")} />
      <Field label="Nama yang ditampilkan" value={form.names} onChange={set("names")} />
      <Field label="Tanggal (teks bebas)" value={form.dateDisplay} onChange={set("dateDisplay")} />

      <label className="block">
        <span className="admin-label flex items-center gap-1.5">
          Jadwal mulai (tanggal & jam sungguhan)
          {startAtLocked && <Lock size={11} className="text-[var(--a-clr-text-muted)]" />}
        </span>
        <input
          type="datetime-local"
          value={form.startAt}
          onChange={(e) => set("startAt")(e.target.value)}
          disabled={startAtLocked}
          className="admin-input disabled:cursor-not-allowed disabled:opacity-60"
        />
        <span className="mt-1 block text-xs text-[var(--a-clr-text-muted)]">
          {startAtLocked
            ? "Acara sudah berjalan — jadwal mulai tidak bisa diubah lagi. Hubungi dukungan bila jadwal sungguhan berubah."
            : "Beda dari \"Tanggal (teks bebas)\" di atas — ini yang menentukan kapan masa aktif 7 hari (sesi foto + akses momen) mulai dihitung. Wajib diisi sebelum acara dipublikasikan."}
        </span>
      </label>

      <Field label="Lokasi" value={form.venue} onChange={set("venue")} />
      <Field label="Tagar" value={form.hashtag} onChange={set("hashtag")} />
      <Field
        label="Sambutan"
        value={form.greeting}
        onChange={set("greeting")}
        multiline
        hint="Muncul di layar awal sebelum tamu mulai sesi."
      />

      <div className="flex items-center gap-3 pt-2">
        <button onClick={save} disabled={saving} className="admin-btn admin-btn-primary admin-btn-press">
          {saving && <Spinner size={14} />}
          {saving ? "Menyimpan…" : "Simpan"}
        </button>
        {note && <span className="text-sm font-medium text-[var(--a-clr-text-muted)]">{note}</span>}
      </div>
    </div>
  );
}
