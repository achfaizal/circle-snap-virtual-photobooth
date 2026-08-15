"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import Spinner from "@/components/admin/Spinner";

const ALL_POINTS = [
  "Minimal 1 bingkai aktif",
  "Nama yang ditampilkan terisi",
  "Tanggal tampil terisi",
  "Sambutan terisi",
  "Jadwal mulai terisi",
  "Template sudah dipilih",
  "Semua variabel wajib template terisi",
  "Kuota acara lebih dari 0",
  "Pesanan sudah lunas (kalau berlaku)",
  "Email sudah diverifikasi",
  "Minimal satu tombol unduh menyala",
];

export default function EventPublishPanel({
  eventId,
  failed,
  alreadyLive,
}: {
  eventId: string;
  failed: { point: number; label: string }[];
  alreadyLive: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const failedPoints = new Set(failed.map((f) => f.point));

  const publish = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/app/events/${eventId}/publish`, { method: "POST" });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "Gagal menerbitkan.");
        return;
      }
      router.refresh();
    } catch {
      setError("Tidak bisa menghubungi server.");
    } finally {
      setBusy(false);
    }
  };

  if (alreadyLive) {
    return (
      <div style={{ padding: 16, borderRadius: 12, background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
        <p style={{ fontSize: 13, color: "#166534", fontWeight: 700 }}>Acara ini sudah live.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
        {ALL_POINTS.map((label, i) => {
          const point = i + 1;
          const ok = !failedPoints.has(point);
          const failedDetail = failed.find((f) => f.point === point);
          return (
            <div key={point} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 12px", borderRadius: 10, background: ok ? "#F0FDF4" : "#FEF2F2" }}>
              {ok ? <Check size={16} color="#16A34A" style={{ flexShrink: 0, marginTop: 1 }} /> : <X size={16} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />}
              <span style={{ fontSize: 12.5, color: ok ? "#166534" : "#991B1B", fontWeight: 600 }}>
                {point}. {failedDetail?.label ?? label}
              </span>
            </div>
          );
        })}
      </div>

      {error && <p style={{ fontSize: 13, color: "#EF4444", marginBottom: 12 }}>{error}</p>}

      <button
        type="button"
        onClick={publish}
        disabled={busy || failed.length > 0}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "11px 22px",
          borderRadius: 100,
          border: "none",
          background: "linear-gradient(135deg, var(--a-clr-brand-1), var(--a-clr-brand-2))",
          color: "white",
          fontWeight: 800,
          fontSize: 14,
          cursor: busy || failed.length > 0 ? "not-allowed" : "pointer",
          opacity: busy || failed.length > 0 ? 0.5 : 1,
        }}
      >
        {busy && <Spinner size={14} />}
        {busy ? "Menerbitkan…" : "Terbitkan Acara"}
      </button>
    </div>
  );
}
