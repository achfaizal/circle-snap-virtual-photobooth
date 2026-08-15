/**
 * `startsAt` bebas diubah selama acara belum benar-benar berjalan.
 * "Sudah berjalan" = status `live` DAN waktu sekarang sudah lewat
 * `startsAt`. Draft selalu bebas. Live tapi terjadwal maju (belum
 * sampai waktunya) masih bebas — klien yang salah ketik jam masih bisa
 * membetulkan sebelum acaranya benar-benar mulai.
 *
 * Versi Postgres-native dari lib/services/eventLifecycle.ts (`Event`
 * JSON lama) — TIDAK memakai file itu (tipe beda, dan file itu ikut
 * dipensiunkan Langkah 11 bersama portal klien JSON). Tanpa aturan ini,
 * klien tinggal memundurkan `startsAt` terus-menerus dan masa aktifnya
 * tidak pernah habis.
 */
export function canEditStartsAt(event: { status: string; startsAt: Date | null }, now: Date = new Date()): boolean {
  if (event.status !== "live") return true;
  if (!event.startsAt) return true;
  return now < event.startsAt;
}

/** K16/AB-09 — masa aktif dari JADWAL MULAI, bukan tanggal publikasi.
    Dipakai Langkah 9 (publish) memakai `events.activeDays` ASLI milik
    acara ini (diisi saat wizard/alokasi, Langkah 4) — BEDA dari bug lama
    `lib/services/eventLifecycle.ts` yang jatuh ke hardcode 7 kalau
    caller lupa kirim argumen `days`. Di sini `days` WAJIB (tidak ada
    default tersembunyi), supaya tidak mungkin lupa. */
export function computeExpiresAt(startsAt: Date, activeDays: number): Date {
  const d = new Date(startsAt);
  d.setDate(d.getDate() + activeDays);
  return d;
}
