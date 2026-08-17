import { and, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { events } from "@/lib/db/schema/events";
import { sessions, strips } from "@/lib/db/schema/sessions";
import { assets } from "@/lib/db/schema/templates";
import { getSessionAccount } from "@/lib/clientAuth";

/**
 * Langkah 6 Tahap 4 — diganti total dari file-listing prefix (Blob/folder
 * lokal) jadi query `strips` Postgres (dibuat Langkah 5 saat sesi tamu
 * selesai). `strips.session_id` DIPAKAI ULANG sebagai `Moment.id` — sama
 * persis nilai yang tadinya jadi nama dasar file. `photoUrl`/`videoUrl`
 * diambil dari `assets.storage_key`, yang isinya sudah berupa URL siap
 * pakai di kedua mode (path relatif `/moments-local/...` di dev, URL Blob
 * penuh di produksi) — tidak perlu tahu mode penyimpanan di sini lagi.
 */
interface Moment {
  id: string;
  photoUrl?: string;
  videoUrl?: string;
  uploadedAt: string;
  guestName?: string;
}

const photoAssets = alias(assets, "moments_photo_assets");
const videoAssets = alias(assets, "moments_video_assets");

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventCode = searchParams.get("event");
  if (!eventCode) {
    return NextResponse.json({ error: "Parameter event wajib diisi." }, { status: 400 });
  }

  const [event] = await db.select().from(events).where(eq(events.slug, eventCode.toLowerCase()));
  // Acara tidak ada di Postgres = tidak ada satu pun baris strip yang bisa
  // ditulis untuknya — daftar kosong, bukan error (tamu di URL acara
  // kedaluwarsa/salah tidak perlu melihat pesan galangan teknis).
  if (!event) return NextResponse.json({ moments: [] });

  // D-18/K6 — gerbang galeri privat, SEBELUM baris strip dibaca.
  if (!event.galleryEnabled) {
    return NextResponse.json({ error: "Galeri Momen untuk acara ini tidak diaktifkan." }, { status: 403 });
  }
  const session = await getSessionAccount();
  const isOwner = session?.accountId === event.accountId;
  if (!event.galleryPublic && !isOwner) {
    return NextResponse.json({ error: "Galeri Momen acara ini privat." }, { status: 403 });
  }

  // Tamu polos cuma lihat yang tidak disembunyikan moderasi (Langkah 7);
  // pemilik akun (owner/manager/operator) lihat semuanya, sama seperti
  // panel moderasi di /app/*.
  const rows = await db
    .select({
      id: strips.sessionId,
      createdAt: strips.createdAt,
      guestName: sessions.guestName,
      photoUrl: photoAssets.storageKey,
      videoUrl: videoAssets.storageKey,
    })
    .from(strips)
    .innerJoin(sessions, eq(sessions.id, strips.sessionId))
    .leftJoin(photoAssets, eq(photoAssets.id, strips.imageAssetId))
    .leftJoin(videoAssets, eq(videoAssets.id, strips.videoAssetId))
    .where(
      isOwner
        ? eq(strips.eventId, event.id)
        : and(eq(strips.eventId, event.id), eq(strips.isHidden, false))
    )
    .orderBy(desc(strips.createdAt));

  const moments: Moment[] = rows.map((r) => ({
    id: r.id,
    photoUrl: r.photoUrl ?? undefined,
    videoUrl: r.videoUrl ?? undefined,
    uploadedAt: r.createdAt.toISOString(),
    guestName: r.guestName ?? undefined,
  }));

  return NextResponse.json({ moments });
}
