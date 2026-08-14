"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { Check, X, Copy, Download, Clock } from "lucide-react";
import type { Event } from "@/lib/models/event";
import type { Subscription } from "@/lib/models/plan";
import { msUntilExpiry } from "@/lib/services/eventLifecycle";
import Spinner from "./Spinner";
import { notifyEventSaved, showSuccessToast } from "@/lib/utils";

const STATUS_LABEL: Record<Event["status"], string> = {
  draft: "Draft",
  live: "Live",
  ended: "Selesai",
};

const STATUS_DESC: Record<Event["status"], string> = {
  draft: "Belum bisa diakses tamu — hanya kamu yang bisa lihat lewat pratinjau.",
  live: "Tamu bisa memindai QR dan langsung mulai sesi foto.",
  ended: "Sesi foto baru ditolak, tapi galeri Momen tetap bisa dibuka tamu lama.",
};

/** Format sisa/lewat waktu dalam kalimat pendek — dipakai kartu masa
    aktif di bawah, supaya klien tidak perlu menghitung sendiri dari
    tanggal ISO mentah. */
function formatDuration(ms: number): string {
  const abs = Math.abs(ms);
  const days = Math.floor(abs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((abs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days > 0) return `${days} hari ${hours} jam`;
  const mins = Math.floor((abs % (60 * 60 * 1000)) / (60 * 1000));
  return hours > 0 ? `${hours} jam ${mins} menit` : `${mins} menit`;
}

export default function EventPublishEditor({
  event,
  subscription,
  onSaved,
}: {
  event: Event;
  subscription: Subscription | null;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(event.status);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const guestPath = `/e/${event.slug}`;
  const guestUrl = typeof window !== "undefined" ? `${window.location.origin}${guestPath}` : guestPath;

  useEffect(() => {
    QRCode.toDataURL(guestUrl, {
      width: 320,
      margin: 1,
      color: { dark: "#0A1F44", light: "#FFFFFF" },
    })
      .then(setQrUrl)
      .catch(() => setQrUrl(null));
  }, [guestUrl]);

  // Pemeriksaan sama sekali tidak memblokir sesi tamu (playground sudah
  // fail-soft) — ini murni bimbingan admin sebelum menekan "Publikasikan",
  // supaya tidak lupa langkah penting.
  const checklist = [
    { ok: event.frameIds.length > 0, label: `Minimal 1 bingkai terpasang (sekarang ${event.frameIds.length})` },
    { ok: Boolean(event.identity.names.trim()), label: "Nama yang ditampilkan sudah diisi" },
    { ok: Boolean(event.identity.dateDisplay.trim()), label: "Tanggal sudah diisi" },
    { ok: Boolean(event.identity.greeting.trim()), label: "Sambutan sudah diisi" },
    {
      ok: Boolean(event.startAt),
      label: "Jadwal mulai (tanggal & jam sungguhan) sudah diisi — menentukan masa aktif 7 hari",
    },
  ];
  const readyForLive = checklist.every((c) => c.ok);

  const changeStatus = async (next: Event["status"]) => {
    setSaving(true);
    setNote(null);
    try {
      const res = await fetch(`/api/admin/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: next,
          ...(next === "live" && !event.publishedAt ? { publishedAt: new Date().toISOString() } : {}),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setNote(data?.error ?? "Gagal menyimpan.");
        return;
      }
      setStatus(next);
      setNote("Tersimpan.");
      notifyEventSaved();
      // Status event dipakai layout untuk badge & penyaring notifikasi
      // kuota rendah — sama seperti nama di Detail Acara, tanpa refresh
      // ini nilainya basi sampai halaman dimuat ulang manual.
      router.refresh();
      onSaved?.();
    } catch {
      setNote("Tidak bisa menghubungi server.");
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(guestUrl);
      setCopied(true);
      // Dua penanda sekaligus (§15.26 UI-UX-DESIGN-SYSTEM.md) — label
      // tombol berubah sementara BISA terlewat (kecil, di tepi layar),
      // toast di pojok lebih mustahil kelewat.
      showSuccessToast("📋 Link berhasil disalin!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setNote("Tidak bisa menyalin — salin manual dari kotak teks.");
    }
  };

  const downloadQr = () => {
    if (!qrUrl) return;
    const a = document.createElement("a");
    a.href = qrUrl;
    a.download = `qr-${event.slug}.png`;
    a.click();
  };

  return (
    <div className="max-w-2xl">
      <div className="admin-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <span
              className={`admin-badge ${
                status === "live" ? "admin-badge-success" : "admin-badge-neutral"
              }`}
            >
              {STATUS_LABEL[status]}
            </span>
            <p className="mt-2 text-sm text-[var(--a-clr-text-muted)]">{STATUS_DESC[status]}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {status === "draft" && (
            <button
              onClick={() => changeStatus("live")}
              disabled={saving || !readyForLive}
              className="admin-btn admin-btn-primary admin-btn-press"
              title={readyForLive ? undefined : "Selesaikan checklist di bawah dulu"}
            >
              {saving && <Spinner size={14} />}
              Publikasikan (jadi Live)
            </button>
          )}
          {status === "live" && (
            <button
              onClick={() => changeStatus("ended")}
              disabled={saving}
              className="admin-btn admin-btn-outline admin-btn-press"
            >
              {saving && <Spinner size={14} color="var(--a-clr-text)" />}
              Akhiri acara (jadi Selesai)
            </button>
          )}
          {status === "ended" && (
            <button
              onClick={() => changeStatus("live")}
              disabled={saving}
              className="admin-btn admin-btn-primary admin-btn-press"
            >
              {saving && <Spinner size={14} />}
              Buka lagi (jadi Live)
            </button>
          )}
          {note && <span className="self-center text-sm font-medium text-[var(--a-clr-text-muted)]">{note}</span>}
        </div>
      </div>

      {/* Kartu masa aktif — cuma berarti kalau event sudah live (draft
          belum menghitung apa-apa, ended punya alasannya sendiri). Sisa
          waktu dihitung dari Subscription.expiresAt yang disinkronkan
          server setiap kali startAt berubah (lib/services/
          eventLifecycle.ts). Tidak ada polling — cukup akurat untuk
          halaman admin yang dibuka manual, bukan jam yang berdetak. */}
      {status === "live" && subscription?.expiresAt && (
        <div
          className="admin-card mt-4 flex items-center gap-3 p-4"
          style={{
            background: msUntilExpiry(subscription)! < 0 ? "#FEF2F2" : undefined,
            borderColor: msUntilExpiry(subscription)! < 0 ? "#FEE2E2" : undefined,
          }}
        >
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
            style={{
              background: msUntilExpiry(subscription)! < 0 ? "#FEE2E2" : "var(--a-clr-primary-light)",
            }}
          >
            <Clock size={16} color={msUntilExpiry(subscription)! < 0 ? "var(--a-clr-danger)" : "var(--a-clr-primary)"} />
          </span>
          <div>
            <p className="text-sm font-bold text-[#0F172A]">
              {msUntilExpiry(subscription)! < 0
                ? `Masa aktif habis ${formatDuration(msUntilExpiry(subscription)!)} lalu`
                : `Masa aktif tersisa ${formatDuration(msUntilExpiry(subscription)!)}`}
            </p>
            <p className="text-xs text-[var(--a-clr-text-muted)]">
              {msUntilExpiry(subscription)! < 0
                ? "Sesi foto baru & galeri Momen terkunci untuk tamu. Hubungi dukungan untuk perpanjangan."
                : `Dihitung 7 hari sejak jadwal mulai — berakhir ${new Date(subscription.expiresAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}.`}
            </p>
          </div>
        </div>
      )}

      {status === "draft" && (
        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--a-clr-text-muted)]">
            Checklist pra-publish
          </p>
          <div className="mt-2 space-y-1.5">
            {checklist.map((c) => (
              <div key={c.label} className="flex items-center gap-2 text-sm">
                {c.ok ? (
                  <Check size={15} className="shrink-0 text-[var(--a-clr-success)]" />
                ) : (
                  <X size={15} className="shrink-0 text-[var(--a-clr-danger)]" />
                )}
                <span className={c.ok ? "text-[var(--a-clr-text-muted)]" : "font-medium text-[#0F172A]"}>
                  {c.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--a-clr-text-muted)]">
          Link & QR code
        </p>
        <div className="mt-2 flex flex-col items-start gap-4 sm:flex-row">
          <div className="admin-card shrink-0 p-3">
            {qrUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URI, bukan aset produksi
              <img src={qrUrl} alt={`QR ${guestUrl}`} className="h-40 w-40" />
            ) : (
              <div className="grid h-40 w-40 place-items-center text-xs text-[var(--a-clr-text-muted)]">
                Membuat QR…
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={guestUrl}
                className="admin-input font-mono text-xs"
                onFocus={(e) => e.target.select()}
              />
              <button onClick={copyLink} className="admin-btn admin-btn-outline admin-btn-sm shrink-0">
                <Copy size={13} />
                {copied ? "Tersalin!" : "Salin"}
              </button>
            </div>
            <button
              onClick={downloadQr}
              disabled={!qrUrl}
              className="admin-btn admin-btn-outline admin-btn-sm mt-2"
            >
              <Download size={13} />
              Unduh QR (PNG)
            </button>
            {status !== "live" && (
              <p className="mt-2 text-xs text-[var(--a-clr-text-muted)]">
                QR ini baru berfungsi untuk tamu setelah status event <strong>Live</strong>.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
