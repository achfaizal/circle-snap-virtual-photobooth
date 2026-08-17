"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Download, X } from "lucide-react";
import Spinner from "@/components/admin/Spinner";
import { showSuccessToast, showErrorToast } from "@/lib/utils";

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
  slug,
  failed,
  alreadyLive,
}: {
  eventId: string;
  slug: string;
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
    const boothPath = `/e/${slug}`;
    const boothUrl = typeof window !== "undefined" ? `${window.location.origin}${boothPath}` : boothPath;
    const qrRoute = `/api/app/events/${eventId}/qr`;

    const copyLink = async () => {
      try {
        await navigator.clipboard.writeText(boothUrl);
        showSuccessToast("Tautan tersalin.");
      } catch {
        showErrorToast("Gagal menyalin — salin manual dari kotak di atas.");
      }
    };

    return (
      <div style={{ padding: 16, borderRadius: 12, background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
        <p style={{ fontSize: 13, color: "#166534", fontWeight: 700, marginBottom: 14 }}>Acara ini sudah live.</p>

        {/* dok 05 §5.5 "Blok Link & QR" — tautan+salin, pratinjau QR,
            unduh PNG/PDF A4/PDF A5. "QR versi PDF siap cetak bukan
            tambahan kecil... pemindaian gagal adalah kegagalan produk." */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <input
            readOnly
            value={boothUrl}
            onFocus={(e) => e.target.select()}
            style={{
              flex: 1,
              minWidth: 0,
              padding: "9px 12px",
              borderRadius: 8,
              border: "1px solid #BBF7D0",
              background: "white",
              fontSize: 12.5,
              color: "#18181B",
              fontFamily: "monospace",
            }}
          />
          <button
            type="button"
            onClick={copyLink}
            aria-label="Salin tautan"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 14px",
              borderRadius: 8,
              border: "1px solid #16A34A",
              background: "white",
              color: "#166534",
              fontWeight: 700,
              fontSize: 12.5,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <Copy size={13} /> Salin
          </button>
        </div>

        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- pratinjau QR dari rute API sendiri, dinamis per acara */}
          <img
            src={`${qrRoute}?format=png`}
            alt={`Kode QR acara ${slug}`}
            width={140}
            height={140}
            style={{ borderRadius: 8, border: "1px solid #BBF7D0", background: "white", flexShrink: 0 }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 200 }}>
            <p style={{ fontSize: 12, color: "#166534" }}>
              Cetak &amp; tempel di lokasi acara supaya tamu gampang memindai — QR dari layar HP sering buram
              kalau difoto ulang.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a
                href={`${qrRoute}?format=png`}
                download
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8, border: "1px solid #BBF7D0", background: "white", color: "#166534", fontWeight: 700, fontSize: 12, textDecoration: "none" }}
              >
                <Download size={12} /> PNG
              </a>
              <a
                href={`${qrRoute}?format=pdf-a4`}
                download
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8, border: "1px solid #BBF7D0", background: "white", color: "#166534", fontWeight: 700, fontSize: 12, textDecoration: "none" }}
              >
                <Download size={12} /> PDF A4
              </a>
              <a
                href={`${qrRoute}?format=pdf-a5`}
                download
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8, border: "1px solid #BBF7D0", background: "white", color: "#166534", fontWeight: 700, fontSize: 12, textDecoration: "none" }}
              >
                <Download size={12} /> PDF A5
              </a>
            </div>
          </div>
        </div>
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
