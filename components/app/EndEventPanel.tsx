"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleStop } from "lucide-react";
import Spinner from "@/components/admin/Spinner";

/** Langkah 17 Tahap 4 — "Akhiri Acara" (dok 01 §3.2, AB-11). Tombol
    cuma ditampilkan (dari server, lihat pemanggil) untuk acara `live`
    dan pengguna yang berhak — API tetap menegakkan ulang di server,
    ini cuma menyembunyikan supaya tidak ada tombol yang ditekan lalu
    ditolak. */
export default function EndEventPanel({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const end = async () => {
    if (!window.confirm("Akhiri acara ini? Sesi foto baru akan ditolak, tapi galeri Momen tetap terbuka untuk tamu (AB-11). Sisa kuota kembali/hangus sesuai jenis akun.")) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/app/events/${eventId}/end`, { method: "POST" });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "Gagal mengakhiri acara.");
        return;
      }
      setDone(true);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div style={{ marginTop: 24, padding: 16, borderRadius: 12, background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#166534" }}>Acara sudah diakhiri.</p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 24, padding: 16, borderRadius: 12, background: "#FEF2F2", border: "1px solid #FECACA" }}>
      <p style={{ fontSize: 13, fontWeight: 800, color: "#991B1B", marginBottom: 4 }}>Akhiri Acara</p>
      <p style={{ fontSize: 12, color: "#7F1D1D", marginBottom: 10 }}>
        Sesi foto baru ditolak setelah ini, tapi galeri Momen tetap terbuka untuk tamu. Tidak bisa dibatalkan.
      </p>
      {error && <p style={{ fontSize: 12, color: "#EF4444", marginBottom: 8 }}>{error}</p>}
      <button
        type="button"
        onClick={end}
        disabled={busy}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 14px",
          borderRadius: 100,
          border: "1px solid #EF4444",
          background: "white",
          color: "#EF4444",
          fontWeight: 800,
          fontSize: 12,
          cursor: busy ? "not-allowed" : "pointer",
        }}
      >
        {busy ? <Spinner size={13} color="#EF4444" /> : <CircleStop size={14} />}
        Akhiri Acara
      </button>
    </div>
  );
}
