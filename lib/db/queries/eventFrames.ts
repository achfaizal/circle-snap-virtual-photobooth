/**
 * Bingkai ACARA (Langkah 8 Tahap 3, D-10/D-11) — gabungan bawaan
 * template (`source='template'`, dimaterialisasi ke `event_frames` saat
 * template dipilih — lihat syncTemplateFramesForEvent) + unggahan sendiri
 * (`source='custom'`). AB-16: bawaan template TIDAK BISA dihapus klien,
 * cuma dinonaktifkan; unggahan sendiri boleh dihapus penuh (frames+
 * event_frames sekaligus, tidak dipakai baris lain).
 */
import { and, asc, eq } from "drizzle-orm";
import { db } from "../client";
import { eventFrames } from "../schema/events";
import { frames, assets } from "../schema/templates";
import { templateFrames } from "../schema/templates";
import type { Slot, TextLayer } from "../../models/frame";
import type { FrameValidationReport } from "../../services/frameValidator";

/** Dipanggil setiap kali `events.template_id` berubah (Langkah 7) —
    baris `source='template'` lama DIBUANG (template lama sudah tidak
    relevan) dan diganti dari `template_frames` milik template baru.
    Baris `source='custom'` (unggahan klien) TIDAK PERNAH disentuh di
    sini — independen dari template yang dipakai. */
export async function syncTemplateFramesForEvent(eventId: string, accountId: string, templateId: string) {
  await db.delete(eventFrames).where(and(eq(eventFrames.eventId, eventId), eq(eventFrames.source, "template")));

  const rows = await db
    .select({ frameId: templateFrames.frameId, sortOrder: templateFrames.sortOrder })
    .from(templateFrames)
    .where(eq(templateFrames.templateId, templateId))
    .orderBy(asc(templateFrames.sortOrder));
  if (rows.length === 0) return;

  await db.insert(eventFrames).values(
    rows.map((r) => ({
      eventId,
      accountId,
      frameId: r.frameId,
      source: "template" as const,
      isEnabled: true,
      sortOrder: r.sortOrder,
    }))
  );
}

export async function listEventFrames(eventId: string) {
  return db
    .select({
      id: eventFrames.id,
      frameId: eventFrames.frameId,
      source: eventFrames.source,
      isEnabled: eventFrames.isEnabled,
      sortOrder: eventFrames.sortOrder,
      name: frames.name,
      slotCount: frames.slotCount,
      storageKey: assets.storageKey,
    })
    .from(eventFrames)
    .innerJoin(frames, eq(frames.id, eventFrames.frameId))
    .innerJoin(assets, eq(assets.id, frames.assetId))
    .where(eq(eventFrames.eventId, eventId))
    .orderBy(asc(eventFrames.sortOrder));
}

export async function getEventFrameRow(eventFrameRowId: string) {
  const [row] = await db.select().from(eventFrames).where(eq(eventFrames.id, eventFrameRowId));
  return row ?? null;
}

export async function countActiveEventFrames(eventId: string): Promise<number> {
  const rows = await db
    .select({ id: eventFrames.id })
    .from(eventFrames)
    .where(and(eq(eventFrames.eventId, eventId), eq(eventFrames.isEnabled, true)));
  return rows.length;
}

export async function countCustomEventFrames(eventId: string): Promise<number> {
  const rows = await db
    .select({ id: eventFrames.id })
    .from(eventFrames)
    .where(and(eq(eventFrames.eventId, eventId), eq(eventFrames.source, "custom")));
  return rows.length;
}

export async function setEventFrameEnabled(eventFrameRowId: string, enabled: boolean) {
  const [row] = await db.update(eventFrames).set({ isEnabled: enabled }).where(eq(eventFrames.id, eventFrameRowId)).returning();
  return row ?? null;
}

export async function reorderEventFrames(eventId: string, orderedRowIds: string[]) {
  for (const [index, rowId] of orderedRowIds.entries()) {
    await db.update(eventFrames).set({ sortOrder: index }).where(and(eq(eventFrames.id, rowId), eq(eventFrames.eventId, eventId)));
  }
}

export interface CreateCustomFrameInput {
  eventId: string;
  accountId: string;
  uploadedByUserId: string;
  name: string;
  storageKey: string;
  mime: string;
  bytes: number;
  width: number;
  height: number;
  paper: string;
  slots: Slot[];
  validationReport: FrameValidationReport;
  checksumSha256: string;
}

/** Rilis 1: unggahan klien TIDAK dapat layer teks (dok 06 §5.4, W5) —
    `textLayers: []` selalu, sama seperti jalur lama sebelum canvas
    designer ada. */
export async function createCustomEventFrame(input: CreateCustomFrameInput) {
  const [asset] = await db
    .insert(assets)
    .values({
      accountId: input.accountId,
      kind: "frame",
      storageKey: input.storageKey,
      mime: input.mime,
      bytes: input.bytes,
      width: input.width,
      height: input.height,
      checksumSha256: input.checksumSha256,
      visibility: "public",
      uploadedByUserId: input.uploadedByUserId,
    })
    .returning();

  const [frame] = await db
    .insert(frames)
    .values({
      accountId: input.accountId,
      name: input.name,
      assetId: asset.id,
      width: input.width,
      height: input.height,
      paper: input.paper,
      slots: input.slots,
      textLayers: [],
      slotCount: input.slots.length,
      isLocked: false,
      status: "active",
      validationReport: input.validationReport,
    })
    .returning();

  const existing = await listEventFrames(input.eventId);
  const nextSort = existing.length > 0 ? Math.max(...existing.map((r) => r.sortOrder)) + 1 : 0;

  const [row] = await db
    .insert(eventFrames)
    .values({
      eventId: input.eventId,
      accountId: input.accountId,
      frameId: frame.id,
      source: "custom",
      isEnabled: true,
      sortOrder: nextSort,
    })
    .returning();

  return { eventFrame: row, frame, asset };
}

/** AB-16 — hanya `source='custom'` yang boleh sampai sini (dicek
    pemanggil SEBELUM ini, lihat rute API). Hapus PENUH (event_frames +
    frames + assets) — beda dari bingkai sistem yang cuma diarsipkan,
    bingkai unggahan klien murni miliknya sendiri, tidak dipakai baris
    lain (bukan bagian template_frames manapun). */
export async function deleteCustomEventFrame(eventFrameRowId: string) {
  const [row] = await db.select().from(eventFrames).where(eq(eventFrames.id, eventFrameRowId));
  if (!row || row.source !== "custom") return false;

  await db.delete(eventFrames).where(eq(eventFrames.id, eventFrameRowId));
  await db.delete(frames).where(eq(frames.id, row.frameId));
  return true;
}
