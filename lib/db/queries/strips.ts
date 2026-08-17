import { and, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db/client";
import { sessions, strips, voiceNotes } from "@/lib/db/schema/sessions";
import { assets } from "@/lib/db/schema/templates";

const photoAssets = alias(assets, "strip_photo_assets");
const videoAssets = alias(assets, "strip_video_assets");

export interface StaffStripRow {
  id: string;
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
  createdAt: Date;
}

/** Langkah 7 Tahap 4 — daftar LENGKAP (termasuk yang disembunyikan) untuk
    panel staf `/app/events/[id]/moments`, beda dari GET /api/moments (yang
    dipakai tamu, cuma yang tidak `is_hidden`). Pemanggil WAJIB sudah
    memverifikasi `event.account_id` (K5) sebelum memanggil ini. */
export async function listStripsForEvent(eventId: string): Promise<StaffStripRow[]> {
  const rows = await db
    .select({
      id: strips.id,
      sessionId: strips.sessionId,
      receiptNo: strips.receiptNo,
      guestName: sessions.guestName,
      photoUrl: photoAssets.storageKey,
      videoUrl: videoAssets.storageKey,
      voiceNoteId: voiceNotes.id,
      isHidden: strips.isHidden,
      hiddenReason: strips.hiddenReason,
      uploadStatus: strips.uploadStatus,
      downloadedCount: strips.downloadedCount,
      createdAt: strips.createdAt,
    })
    .from(strips)
    .innerJoin(sessions, eq(sessions.id, strips.sessionId))
    .leftJoin(photoAssets, eq(photoAssets.id, strips.imageAssetId))
    .leftJoin(videoAssets, eq(videoAssets.id, strips.videoAssetId))
    .leftJoin(voiceNotes, eq(voiceNotes.stripId, strips.id))
    .where(eq(strips.eventId, eventId))
    .orderBy(desc(strips.createdAt));

  return rows.map((r) => ({
    id: r.id,
    sessionId: r.sessionId,
    receiptNo: r.receiptNo,
    guestName: r.guestName,
    photoUrl: r.photoUrl,
    videoUrl: r.videoUrl,
    hasVoiceNote: r.voiceNoteId !== null,
    isHidden: r.isHidden,
    hiddenReason: r.hiddenReason,
    uploadStatus: r.uploadStatus,
    downloadedCount: r.downloadedCount,
    createdAt: r.createdAt,
  }));
}

/** Satu baris strip, dipastikan milik `eventId` (K5) — dipakai PATCH/DELETE
    supaya staf akun lain tidak bisa menebak `stripId` acara orang lain. */
export async function getStripForEvent(stripId: string, eventId: string) {
  const [row] = await db
    .select()
    .from(strips)
    .where(and(eq(strips.id, stripId), eq(strips.eventId, eventId)));
  return row ?? null;
}

/** Sembunyikan/tampilkan — satu klik, bisa dibatalkan (dok 05 §5.6). Owner,
    manager, DAN operator boleh (tabel peran dok 05 §5.6). */
export async function setStripHidden(
  stripId: string,
  isHidden: boolean,
  hiddenByUserId: string,
  hiddenReason?: string | null
): Promise<void> {
  await db
    .update(strips)
    .set({
      isHidden,
      hiddenByUserId: isHidden ? hiddenByUserId : null,
      hiddenReason: isHidden ? hiddenReason ?? null : null,
    })
    .where(eq(strips.id, stripId));
}

/** Hapus permanen — AB-04: TIDAK PERNAH menyentuh `quota_ledger`, kuota
    yang sudah terpakai tidak dikembalikan gara-gara moderasi. Baris
    `strips`/`sessions`/`voice_notes` dihapus; baris `assets` (byte
    sungguhan di storage) SENGAJA dibiarkan — pembersihan objek storage
    nyata itu tanggung jawab skrip retensi (Langkah 18), bukan aksi
    moderasi ini (menghapus objek storage sinkron di sini bisa membuat
    klik "hapus" terasa lambat/gagal kalau storage sedang lambat). */
export async function deleteStripPermanently(stripId: string): Promise<void> {
  await db.delete(voiceNotes).where(eq(voiceNotes.stripId, stripId));
  const [strip] = await db.select().from(strips).where(eq(strips.id, stripId));
  if (!strip) return;
  await db.delete(strips).where(eq(strips.id, stripId));
  await db.delete(sessions).where(eq(sessions.id, strip.sessionId));
}
