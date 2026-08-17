import { readFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { NextResponse } from "next/server";
import { requireAccountRole } from "@/lib/clientAuth";
import { db } from "@/lib/db/client";
import { getEventForAccount } from "@/lib/db/queries/events";
import { strips } from "@/lib/db/schema/sessions";
import { assets } from "@/lib/db/schema/templates";

const photoAssets = alias(assets, "dl_photo_assets");
const videoAssets = alias(assets, "dl_video_assets");

/** `storage_key` sudah berupa URL siap pakai di kedua mode (lihat
    lib/db/queries/sessions.ts) — path relatif `/moments-local/...` di
    dev (file di bawah public/), URL Blob penuh di produksi. */
async function readAssetBytes(storageKey: string): Promise<Buffer> {
  if (storageKey.startsWith("http")) {
    const res = await fetch(storageKey);
    if (!res.ok) throw new Error(`Gagal mengambil aset: ${storageKey}`);
    return Buffer.from(await res.arrayBuffer());
  }
  return readFile(path.join(process.cwd(), "public", storageKey));
}

/** Langkah 9 Tahap 4 — dok 05 §5.6 "Unduh semua (zip)". Bawaan cuma
    strip yang TIDAK disembunyikan (sama semangat dengan galeri tamu) —
    beda dari "Unduh arsip lengkap" (produk tambahan berbayar dok 02 §6,
    TIDAK dikerjakan di sini). Owner/manager/operator semua boleh (tabel
    peran dok 05 §5.6, sama seperti "Unduh satu"). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAccountRole("operator");
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const event = await getEventForAccount(id, guard.accountId); // K5
  if (!event) return NextResponse.json({ error: "Acara tidak ditemukan." }, { status: 404 });

  const rows = await db
    .select({
      stripId: strips.id,
      receiptNo: strips.receiptNo,
      photoKey: photoAssets.storageKey,
      videoKey: videoAssets.storageKey,
    })
    .from(strips)
    .leftJoin(photoAssets, eq(photoAssets.id, strips.imageAssetId))
    .leftJoin(videoAssets, eq(videoAssets.id, strips.videoAssetId))
    .where(and(eq(strips.eventId, event.id), eq(strips.isHidden, false), isNotNull(strips.imageAssetId)));

  if (rows.length === 0) {
    return NextResponse.json({ error: "Belum ada momen yang bisa diunduh." }, { status: 404 });
  }

  const zip = new JSZip();
  const includedStripIds: string[] = [];
  for (const row of rows) {
    try {
      if (row.photoKey) {
        const bytes = await readAssetBytes(row.photoKey);
        zip.file(`${row.receiptNo}.png`, bytes);
      }
      if (row.videoKey) {
        const ext = path.extname(row.videoKey) || ".webm";
        const bytes = await readAssetBytes(row.videoKey);
        zip.file(`${row.receiptNo}${ext}`, bytes);
      }
      includedStripIds.push(row.stripId);
    } catch {
      // K14 "gagal pelan" — satu aset hilang/tidak terjangkau (mis. objek
      // storage sempat dihapus manual) tidak boleh menggagalkan seluruh
      // unduhan; strip itu cuma dilewati, sisanya tetap terkumpul.
    }
  }

  if (includedStripIds.length === 0) {
    return NextResponse.json({ error: "Aset momen tidak terjangkau saat ini." }, { status: 502 });
  }

  const archive = await zip.generateAsync({ type: "nodebuffer" });

  // Increment atomik (bukan read-then-write) walau banyak strip sekaligus
  // diunduh.
  await db
    .update(strips)
    .set({ downloadedCount: sql`${strips.downloadedCount} + 1` })
    .where(inArray(strips.id, includedStripIds));

  return new NextResponse(new Uint8Array(archive), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="momen-${event.slug}.zip"`,
    },
  });
}
