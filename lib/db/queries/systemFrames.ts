/**
 * Bingkai SISTEM — Langkah 4 rencana Tahap 2. `account_id IS NULL` di
 * tabel `frames` (dok 03 §3.5: "null = bingkai sistem milik admin").
 * Berdampingan dengan /admin/frames lama (JSON, staf+klien) — lihat
 * catatan tabrakan rute di rencana Tahap 2.
 */
import { asc, eq, isNull } from "drizzle-orm";
import { db } from "../client";
import { assets, frames, templateFrames } from "../schema";
import type { Slot, TextLayer } from "../../models/frame";
import type { FrameValidationReport } from "../../services/frameValidator";

export async function listSystemFrames() {
  return db.select().from(frames).where(isNull(frames.accountId)).orderBy(asc(frames.createdAt));
}

export async function getSystemFrame(id: string) {
  const [row] = await db.select().from(frames).where(eq(frames.id, id));
  return row ?? null;
}

export interface CreateSystemFrameInput {
  name: string;
  blurb?: string | null;
  assetId: string;
  width: number;
  height: number;
  paper: string;
  slots: Slot[];
  textLayers: TextLayer[];
  printSize?: string | null;
  validationReport: FrameValidationReport;
}

export async function createSystemFrame(input: CreateSystemFrameInput) {
  const [row] = await db
    .insert(frames)
    .values({
      accountId: null,
      name: input.name,
      blurb: input.blurb ?? null,
      assetId: input.assetId,
      width: input.width,
      height: input.height,
      paper: input.paper,
      slots: input.slots,
      textLayers: input.textLayers,
      printSize: input.printSize ?? null,
      slotCount: input.slots.length,
      isLocked: true, // account_id null = bingkai sistem (dok 03 §3.5)
      status: "active",
      validationReport: input.validationReport,
    })
    .returning();
  return row;
}

export async function createSystemAsset(input: {
  storageKey: string;
  mime: string;
  bytes: number;
  width: number;
  height: number;
  checksumSha256: string;
}) {
  const [row] = await db
    .insert(assets)
    .values({
      accountId: null,
      kind: "frame",
      storageKey: input.storageKey,
      mime: input.mime,
      bytes: input.bytes,
      width: input.width,
      height: input.height,
      checksumSha256: input.checksumSha256,
      visibility: "public",
    })
    .returning();
  return row;
}

export async function setSystemFrameStatus(id: string, status: "active" | "archived") {
  const [row] = await db.update(frames).set({ status }).where(eq(frames.id, id)).returning();
  return row ?? null;
}

/** dok 04 §5.4: bingkai yang dipakai template published tidak boleh
    dihapus, hanya diarsipkan — dicek di sini lewat template_frames,
    bukan hard-delete tersedia sama sekali (tidak ada endpoint DELETE
    untuk system-frames, cuma arsipkan). */
export async function systemFrameInUse(id: string): Promise<boolean> {
  const [row] = await db.select({ id: templateFrames.id }).from(templateFrames).where(eq(templateFrames.frameId, id)).limit(1);
  return !!row;
}
