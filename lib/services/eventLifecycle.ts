/**
 * MASA AKTIF EVENT — docs/blueprint/09-brd-model-bisnis.md §5.3 & §8.
 *
 * Aturan intinya: satu event berlaku 7 hari dihitung dari `Event.startAt`
 * (waktu mulai acara yang diisi klien) — BUKAN dari tanggal beli, bukan
 * dari tanggal publish. Setelah 7 hari, sesi foto BARU ditolak dan momen
 * tidak bisa dilihat/diunduh (momen tidak dihapus — klien bisa membeli
 * perpanjangan untuk membukanya lagi).
 *
 * "Expired" SENGAJA tidak pernah disimpan sebagai baris status di
 * database — dihitung ulang dari waktu setiap kali `effectiveStatus()`
 * dipanggil. Kalau disimpan dan butuh cron untuk mentransisikannya, satu
 * kegagalan cron membuat event yang seharusnya terkunci tetap terbuka
 * berhari-hari tanpa ada yang sadar.
 */
import type { Event } from "@/lib/models/event";
import type { Subscription } from "@/lib/models/plan";

/** Masa aktif standar, dalam hari. Sama untuk semua paket sekarang —
    kalau nanti ada katalog Plan sungguhan (belum dikerjakan, lihat
    peta jalan di dokumen 09 §9), pindahkan ke Plan.activeDays per-paket
    alih-alih konstanta tunggal ini. */
const ACTIVE_DAYS = 7;

export function computeExpiresAt(startAt: string, days: number = ACTIVE_DAYS): string {
  const d = new Date(startAt);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/**
 * BRD §8 poin 11: `startAt` bebas diubah selama event belum genap
 * berjalan. "Sudah berjalan" = statusnya `live` DAN waktu sekarang sudah
 * lewat `startAt`. Draft selalu bebas (belum ada yang dirugikan kalau
 * jadwal berubah). Live tapi terjadwal maju (belum sampai waktunya)
 * masih bebas diubah — klien yang salah ketik jam masih bisa membetulkan
 * sebelum acaranya benar-benar mulai.
 *
 * Tanpa aturan ini, klien tinggal memundurkan `startAt` terus-menerus dan
 * paketnya tidak pernah habis.
 */
export function canEditStartAt(event: Pick<Event, "status" | "startAt">, now: Date = new Date()): boolean {
  if (event.status !== "live") return true;
  if (!event.startAt) return true;
  return now < new Date(event.startAt);
}

export type EffectiveStatus = "draft" | "live" | "ended" | "expired";

/**
 * Status SUNGGUHAN yang menggerbang akses tamu — beda dari `Event.status`
 * yang murni pilihan staff/klien (draft/live/ended, lihat
 * EventPublishEditor.tsx). Dipakai di SATU titik (toEventConfig() di
 * lib/adapters/legacy.ts) supaya gerbang tamu (EventBooth, WelcomeScreen,
 * MomentsGallery) semuanya melihat status yang sama tanpa masing-masing
 * menghitung ulang.
 *
 * `ended` (diakhiri panitia) TETAP membuka momen — itu keputusan sadar
 * ("acaranya sudah selesai, tapi kami masih mau bagikan fotonya").
 * `expired` (habis waktu) MENGUNCI momen juga — itu batas komersial,
 * bukan keputusan panitia. Beda perlakuan ini disengaja, bukan lupa.
 */
export function effectiveStatus(
  event: Pick<Event, "status">,
  subscription: Pick<Subscription, "expiresAt"> | null,
  now: Date = new Date()
): EffectiveStatus {
  if (event.status !== "live") return event.status;
  if (subscription?.expiresAt && now > new Date(subscription.expiresAt)) return "expired";
  return "live";
}

/** Sisa waktu dalam milidetik sampai kedaluwarsa — negatif kalau sudah
    lewat. Dipakai UI admin untuk menampilkan hitung mundur ("3 hari
    lagi"), null kalau belum ada subscription/expiresAt sama sekali. */
export function msUntilExpiry(
  subscription: Pick<Subscription, "expiresAt"> | null,
  now: Date = new Date()
): number | null {
  if (!subscription?.expiresAt) return null;
  return new Date(subscription.expiresAt).getTime() - now.getTime();
}
