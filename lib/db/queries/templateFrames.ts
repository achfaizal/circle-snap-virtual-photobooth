/**
 * Bingkai terpasang di template — Langkah 6 rencana Tahap 2, tab 5.
 * Tabel `template_frames` (dok 03 §3.6). "wajib bingkai sistem
 * (account_id IS NULL)" ditegakkan DI SINI (bukan FK — butuh trigger
 * lintas-tabel, tidak ada di daftar wajib dok 03 §9).
 */
import { asc, eq, isNull } from "drizzle-orm";
import { db } from "../client";
import { frames, templateFrames } from "../schema";

export async function listTemplateFrames(templateId: string) {
  return db
    .select({
      id: templateFrames.id,
      templateId: templateFrames.templateId,
      frameId: templateFrames.frameId,
      sortOrder: templateFrames.sortOrder,
      frameName: frames.name,
      frameSlotCount: frames.slotCount,
      frameTextLayers: frames.textLayers,
    })
    .from(templateFrames)
    .innerJoin(frames, eq(templateFrames.frameId, frames.id))
    .where(eq(templateFrames.templateId, templateId))
    .orderBy(asc(templateFrames.sortOrder));
}

export async function attachFrame(templateId: string, frameId: string, sortOrder: number): Promise<{ ok: true } | { ok: false; reason: "not_system_frame" }> {
  const [frame] = await db.select({ accountId: frames.accountId }).from(frames).where(eq(frames.id, frameId));
  if (!frame || frame.accountId !== null) {
    return { ok: false, reason: "not_system_frame" };
  }
  await db.insert(templateFrames).values({ templateId, frameId, sortOrder });
  return { ok: true };
}

export async function detachFrame(templateFrameRowId: string) {
  await db.delete(templateFrames).where(eq(templateFrames.id, templateFrameRowId));
}

export async function listAvailableSystemFrames() {
  return db.select().from(frames).where(isNull(frames.accountId)).orderBy(asc(frames.name));
}
