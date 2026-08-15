"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, ArrowDown, Trash2, Upload } from "lucide-react";
import Spinner from "@/components/admin/Spinner";

export interface EventFrameRow {
  id: string;
  frameId: string;
  source: "template" | "custom";
  isEnabled: boolean;
  sortOrder: number;
  name: string;
  slotCount: number;
  storageKey: string;
}

/**
 * Editor bingkai acara (Langkah 8 Tahap 3) — grid gabungan bawaan
 * template + unggahan sendiri. Reorder pakai tombol naik/turun (bukan
 * drag-and-drop — tidak menambah dependency baru untuk itu), efeknya
 * sama: sortOrder tersimpan, itu yang menentukan urutan karusel tamu.
 */
export default function EventFramesEditor({ eventId, initialFrames }: { eventId: string; initialFrames: EventFrameRow[] }) {
  const router = useRouter();
  const [frames, setFrames] = useState(initialFrames);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    const res = await fetch(`/api/app/events/${eventId}/frames`);
    if (res.ok) {
      const data = (await res.json()) as { frames: EventFrameRow[] };
      setFrames(data.frames);
    }
    router.refresh();
  };

  const toggle = async (row: EventFrameRow) => {
    setBusyId(row.id);
    setError(null);
    try {
      const res = await fetch(`/api/app/events/${eventId}/frames/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: !row.isEnabled }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "Gagal mengubah status.");
        return;
      }
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (row: EventFrameRow) => {
    setBusyId(row.id);
    setError(null);
    try {
      const res = await fetch(`/api/app/events/${eventId}/frames/${row.id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "Gagal menghapus.");
        return;
      }
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= frames.length) return;
    const next = [...frames];
    [next[index], next[target]] = [next[target], next[index]];
    setFrames(next);
    await fetch(`/api/app/events/${eventId}/frames/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: next.map((f) => f.id) }),
    });
    router.refresh();
  };

  const upload = async () => {
    const file = fileRef.current?.files?.[0];
    const name = nameRef.current?.value.trim();
    if (!file || !name) {
      setError("Nama dan berkas PNG wajib diisi.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("name", name);
      const res = await fetch(`/api/app/events/${eventId}/frames`, { method: "POST", body: form });
      const data = (await res.json().catch(() => null)) as { error?: string; failedChecks?: string[] } | null;
      if (!res.ok) {
        setError([data?.error, ...(data?.failedChecks ?? [])].filter(Boolean).join(" — "));
        return;
      }
      if (nameRef.current) nameRef.current.value = "";
      if (fileRef.current) fileRef.current.value = "";
      await refresh();
    } catch {
      setError("Tidak bisa menghubungi server.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {error && <p style={{ fontSize: 13, color: "#EF4444", marginBottom: 12 }}>{error}</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
        {frames.map((f, i) => (
          <div
            key={f.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "white",
              border: "1px solid #E4E4E7",
              borderRadius: 12,
              padding: 10,
              opacity: f.isEnabled ? 1 : 0.5,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- pratinjau bingkai, dinamis per acara */}
            <img src={f.storageKey} alt={f.name} style={{ width: 48, height: 48, objectFit: "contain", borderRadius: 8, background: "#F4F4F5" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#18181B" }}>{f.name}</div>
              <div style={{ fontSize: 11, color: "#71717A" }}>
                {f.slotCount} slot · {f.source === "template" ? "bawaan template" : "unggahan sendiri"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <IconButton onClick={() => move(i, -1)} disabled={i === 0} label="Naikkan urutan">
                <ArrowUp size={14} />
              </IconButton>
              <IconButton onClick={() => move(i, 1)} disabled={i === frames.length - 1} label="Turunkan urutan">
                <ArrowDown size={14} />
              </IconButton>
              <button
                type="button"
                onClick={() => toggle(f)}
                disabled={busyId === f.id}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid #E4E4E7",
                  background: f.isEnabled ? "#F0FDF4" : "white",
                  color: f.isEnabled ? "#166534" : "#71717A",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {busyId === f.id ? <Spinner size={12} /> : f.isEnabled ? "Aktif" : "Nonaktif"}
              </button>
              {f.source === "custom" && (
                <IconButton onClick={() => remove(f)} disabled={busyId === f.id} label="Hapus">
                  <Trash2 size={14} color="#EF4444" />
                </IconButton>
              )}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          border: "2px dashed #D4D4D8",
          borderRadius: 16,
          padding: 20,
          // pola arsir diagonal — dok 05 §5.4 "area jatuh dengan pola
          // arsir diagonal supaya jelas mana yang akan jadi lubang foto"
          backgroundImage: "repeating-linear-gradient(45deg, #F4F4F5 0, #F4F4F5 8px, white 8px, white 16px)",
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 800, color: "#18181B", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <Upload size={16} /> Unggah bingkai sendiri
        </p>
        <input ref={nameRef} type="text" placeholder="Nama bingkai" className="admin-input" style={{ margin: "0 0 8px" }} />
        <input ref={fileRef} type="file" accept="image/png" style={{ fontSize: 12, marginBottom: 10 }} />
        <div>
          <button
            type="button"
            onClick={upload}
            disabled={uploading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 16px",
              borderRadius: 100,
              border: "none",
              background: "linear-gradient(135deg, var(--a-clr-brand-1), var(--a-clr-brand-2))",
              color: "white",
              fontWeight: 800,
              fontSize: 13,
              cursor: uploading ? "not-allowed" : "pointer",
              opacity: uploading ? 0.7 : 1,
            }}
          >
            {uploading && <Spinner size={14} />}
            {uploading ? "Memvalidasi…" : "Unggah"}
          </button>
        </div>
        <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 8 }}>
          PNG bertransparansi, ≤8MB, 1–6 lubang foto. Bingkai ini belum dapat layer teks tercetak (Rilis 1).
        </p>
      </div>
    </div>
  );
}

function IconButton({ onClick, disabled, label, children }: { onClick: () => void; disabled?: boolean; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      style={{
        padding: 6,
        borderRadius: 8,
        border: "1px solid #E4E4E7",
        background: "white",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        display: "flex",
      }}
    >
      {children}
    </button>
  );
}
