"use client";

import { useEffect, useState } from "react";
import { Archive, Eye, EyeOff, Mic, Trash2, Video } from "lucide-react";
import Spinner from "@/components/admin/Spinner";

interface StaffMoment {
  id: string; // strips.id — kunci untuk PATCH/DELETE, BEDA dari sessions.id
  sessionId: string;
  receiptNo: string;
  guestName: string | null;
  photoUrl: string | null;
  videoUrl: string | null;
  hasVoiceNote: boolean;
  isHidden: boolean;
  hiddenReason: string | null;
  uploadStatus: "pending" | "uploaded" | "failed";
  downloadedCount: number;
  createdAt: string;
}

function StatusBadge({ status }: { status: StaffMoment["uploadStatus"] }) {
  // "uploaded" tidak dapat badge sama sekali — itu keadaan normal, cuma
  // pending/failed yang perlu menarik perhatian panitia (dok 07 §8).
  if (status === "uploaded") return null;
  const isFailed = status === "failed";
  return (
    <span
      style={{
        position: "absolute",
        top: 6,
        left: 6,
        padding: "2px 7px",
        borderRadius: 100,
        fontSize: 10,
        fontWeight: 800,
        color: isFailed ? "#991B1B" : "#92400E",
        background: isFailed ? "#FEE2E2" : "#FEF3C7",
      }}
    >
      {isFailed ? "Unggah gagal" : "Menunggu unggah"}
    </span>
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Langkah 8 Tahap 4 — dok 05 §5.6: kisi rapat, strip terbaru di depan,
    tiap entri punya nama tamu/waktu/indikator pesan suara. Menyembunyikan
    HARUS satu klik (tidak ada modal konfirmasi) — hapus permanen dijaga
    `window.confirm` karena tidak bisa dibatalkan, beda kelas risiko. */
export default function MomentsPanel({
  eventId,
  canDeletePermanently,
}: {
  eventId: string;
  canDeletePermanently: boolean;
}) {
  const [moments, setMoments] = useState<StaffMoment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = async () => {
    const res = await fetch(`/api/app/events/${eventId}/moments`);
    const data = (await res.json().catch(() => null)) as { moments?: StaffMoment[]; error?: string } | null;
    if (!res.ok) {
      setError(data?.error ?? "Momen belum bisa dimuat.");
      return;
    }
    setMoments(data?.moments ?? []);
  };

  useEffect(() => {
    refresh().catch(() => setError("Tidak bisa menghubungi server."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const toggleHidden = async (m: StaffMoment) => {
    setBusyId(m.id);
    setError(null);
    try {
      const res = await fetch(`/api/app/events/${eventId}/moments/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHidden: !m.isHidden }),
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

  const remove = async (m: StaffMoment) => {
    if (!window.confirm(`Hapus permanen momen dari ${m.guestName || "tamu ini"}? Tidak bisa dibatalkan.`)) return;
    setBusyId(m.id);
    setError(null);
    try {
      const res = await fetch(`/api/app/events/${eventId}/moments/${m.id}`, { method: "DELETE" });
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

  if (error && moments === null) {
    return <p style={{ fontSize: 13, color: "#EF4444" }}>{error}</p>;
  }
  if (moments === null) {
    return (
      <p style={{ fontSize: 13, color: "#71717A", display: "flex", alignItems: "center", gap: 8 }}>
        <Spinner size={14} color="#71717A" /> Memuat momen…
      </p>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ fontSize: 12, color: "#71717A" }}>{moments.length} momen tersimpan</p>
        {moments.length > 0 && (
          <a
            href={`/api/app/events/${eventId}/moments/download-all`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 100,
              border: "1px solid #E4E4E7",
              background: "white",
              color: "#18181B",
              fontWeight: 700,
              fontSize: 12,
              textDecoration: "none",
            }}
          >
            <Archive size={14} /> Unduh semua (zip)
          </a>
        )}
      </div>

      {error && <p style={{ fontSize: 13, color: "#EF4444", marginBottom: 12 }}>{error}</p>}

      {moments.length === 0 && (
        <p style={{ fontSize: 13, color: "#71717A", textAlign: "center", padding: "40px 20px", maxWidth: 360, margin: "0 auto" }}>
          Belum ada foto masuk. Strip pertama akan muncul di sini begitu ada tamu berfoto.
        </p>
      )}

      {moments.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
          {moments.map((m) => (
            <div
              key={m.id}
              style={{
                border: "1px solid #E4E4E7",
                borderRadius: 12,
                overflow: "hidden",
                background: "white",
                opacity: m.isHidden ? 0.55 : 1,
              }}
            >
              <div style={{ position: "relative", aspectRatio: "3/4", background: "#F4F4F5" }}>
                <StatusBadge status={m.uploadStatus} />
                {m.isHidden && (
                  <span
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 22,
                      height: 22,
                      borderRadius: 100,
                      background: "rgba(24,24,27,0.8)",
                      color: "white",
                    }}
                    title={m.hiddenReason ?? "Disembunyikan"}
                  >
                    <EyeOff size={12} />
                  </span>
                )}
                {m.videoUrl ? (
                  <video src={m.videoUrl} muted playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : m.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#A1A1AA" }}>
                    <Video size={20} />
                  </div>
                )}
                {m.hasVoiceNote && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: 6,
                      right: 6,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 22,
                      height: 22,
                      borderRadius: 100,
                      background: "rgba(24,24,27,0.8)",
                      color: "white",
                    }}
                    title="Ada pesan suara"
                  >
                    <Mic size={12} />
                  </span>
                )}
              </div>
              <div style={{ padding: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: "#18181B", marginBottom: 1 }}>{m.receiptNo}</p>
                <p style={{ fontSize: 10, color: "#71717A", marginBottom: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {m.guestName ? `dari ${m.guestName}` : "tanpa nama"} · {formatTime(m.createdAt)}
                </p>
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    type="button"
                    onClick={() => toggleHidden(m)}
                    disabled={busyId === m.id}
                    aria-label={m.isHidden ? "Tampilkan" : "Sembunyikan"}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "5px 0",
                      borderRadius: 8,
                      border: "1px solid #E4E4E7",
                      background: "white",
                      cursor: busyId === m.id ? "not-allowed" : "pointer",
                    }}
                  >
                    {busyId === m.id ? <Spinner size={12} color="#71717A" /> : m.isHidden ? <Eye size={13} /> : <EyeOff size={13} />}
                  </button>
                  {m.photoUrl && (
                    <a
                      href={m.photoUrl}
                      download
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "5px 0",
                        borderRadius: 8,
                        border: "1px solid #E4E4E7",
                        background: "white",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#18181B",
                        textDecoration: "none",
                      }}
                    >
                      Unduh
                    </a>
                  )}
                  {canDeletePermanently && (
                    <button
                      type="button"
                      onClick={() => remove(m)}
                      disabled={busyId === m.id}
                      aria-label="Hapus permanen"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "5px 8px",
                        borderRadius: 8,
                        border: "1px solid #E4E4E7",
                        background: "white",
                        cursor: busyId === m.id ? "not-allowed" : "pointer",
                      }}
                    >
                      <Trash2 size={13} color="#EF4444" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
