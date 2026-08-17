/**
 * Sesi & strip tamu (Langkah 5 Tahap 4) — menulis baris SUNGGUHAN
 * SETELAH klaim kuota (`claimQuota()`, K1) sudah commit. Fungsi ini
 * SENGAJA transaksi TERPISAH dari klaim — urutan "klaim dulu, baru
 * susun strip" (K4) tidak boleh dibalik, dan menyentuh kode K1-kritis
 * itu di luar cakupan Tahap 4.
 */
import { eq } from "drizzle-orm";
import { db } from "../client";
import { sessions, strips } from "../schema/sessions";

export interface RecordCompletedSessionInput {
  sessionId: string;
  eventId: string;
  frameId: string;
  guestName?: string | null;
  filterId: string;
  variableSnapshot: Record<string, string>;
  receiptNo: string;
}

/**
 * Idempoten by design — `sessionId` yang sama (retry jaringan pemanggil,
 * dsb.) tidak menulis baris dobel; `strips.receipt_no` unik per acara
 * (CHECK DB) jadi jaring pengaman kedua kalau logika ini pernah salah.
 */
export async function recordCompletedSession(input: RecordCompletedSessionInput): Promise<{ ok: boolean }> {
  const existing = await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.id, input.sessionId)).limit(1);
  if (existing.length > 0) return { ok: true }; // sudah pernah ditulis — retry aman, bukan error

  const now = new Date();
  await db.insert(sessions).values({
    id: input.sessionId,
    eventId: input.eventId,
    frameId: input.frameId,
    guestName: input.guestName || null,
    startedAt: now,
    completedAt: now,
    status: "completed",
  });

  await db.insert(strips).values({
    sessionId: input.sessionId,
    eventId: input.eventId,
    receiptNo: input.receiptNo,
    variableSnapshot: input.variableSnapshot,
    filterId: input.filterId,
    uploadStatus: "pending",
  });

  return { ok: true };
}

/** Dipanggil endpoint unggah momen SETELAH berkas berhasil tersimpan —
    menandai strip yang sudah ada (dibuat recordCompletedSession()
    barusan) sekarang benar-benar punya gambar (dok 07 §8). Diam-diam
    tidak melakukan apa pun kalau baris strip belum ada (retry/timing
    aneh) — bukan alasan menjatuhkan upload yang sudah berhasil. */
export async function markStripUploaded(
  sessionId: string,
  patch: { imageAssetId?: string; videoAssetId?: string }
): Promise<void> {
  await db
    .update(strips)
    .set({ ...patch, uploadStatus: "uploaded" })
    .where(eq(strips.sessionId, sessionId));
}

export async function markStripUploadFailed(sessionId: string): Promise<void> {
  await db.update(strips).set({ uploadStatus: "failed" }).where(eq(strips.sessionId, sessionId));
}
