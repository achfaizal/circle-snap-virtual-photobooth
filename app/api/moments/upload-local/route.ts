import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { stripImageMetadata } from "@/lib/services/imageProcessing";
import { db } from "@/lib/db/client";
import { events } from "@/lib/db/schema/events";
import { assets } from "@/lib/db/schema/templates";
import { markStripUploaded } from "@/lib/db/queries/sessions";

/**
 * Cuma dipakai saat `next dev` di komputer sendiri (lihat
 * app/api/moments/config) — momen ditulis ke public/moments-local/ di
 * filesystem lokal, bukan Vercel Blob, supaya testing tidak numpang di
 * data tamu sungguhan. Route ini sengaja menolak jalan kalau ternyata
 * di-deploy ke Vercel: filesystem-nya read-only & sementara di sana, jadi
 * upload akan terlihat "berhasil" padahal filenya lenyap begitu request
 * selesai — lebih baik gagal jelas daripada gagal diam-diam.
 */
const SAFE_ID = /^[A-Za-z0-9-]+$/;
const MOMENTS_DIR = path.join(process.cwd(), "public", "moments-local");

export async function POST(request: Request) {
  if (process.env.VERCEL) {
    return NextResponse.json(
      { error: "Route ini cuma untuk local dev, bukan Vercel." },
      { status: 400 }
    );
  }

  const form = await request.formData();
  const eventCode = String(form.get("eventCode") ?? "").toUpperCase();
  const momentId = String(form.get("momentId") ?? "");
  const photo = form.get("photo");
  const video = form.get("video");
  // `guestName` di FormData (masih dikirim lib/moments.ts) TIDAK dibaca
  // di sini lagi — bug ditemukan & diperbaiki saat menguji Langkah 18
  // (retensi): rute ini dulu (pra-Langkah 6) menulis sidecar
  // `{momentId}.json` berisi nama tamu, tapi Langkah 6 memindahkan
  // sumber nama tamu ke `sessions.guest_name` (Postgres, diisi saat
  // klaim). Sidecar JSON itu jadi tulis-doang, tidak pernah dibaca
  // siapa pun — DAN jadi objek yatim yang tidak ikut terhapus skrip
  // retensi (cuma menghapus baris `assets`). Dihapus, bukan cuma
  // dibiarkan menulis file yang tidak berguna.

  if (!SAFE_ID.test(eventCode) || !SAFE_ID.test(momentId)) {
    return NextResponse.json({ error: "eventCode/momentId tidak valid." }, { status: 400 });
  }
  if (!(photo instanceof File)) {
    return NextResponse.json({ error: "File foto wajib diisi." }, { status: 400 });
  }

  const dir = path.join(MOMENTS_DIR, eventCode);
  await mkdir(dir, { recursive: true });

  // K7/D-17 — PNG ini lahir dari <canvas> compositor sisi tamu, bukan
  // foto kamera mentah (risiko GPS EXIF jauh lebih kecil dibanding
  // bukti transfer), tapi dibersihkan juga demi konsisten "SEMUA
  // gambar" (dok 08 §1.4) — murah, tidak ada alasan mengecualikannya.
  const { buffer: cleanPhoto, width, height } = await stripImageMetadata(Buffer.from(await photo.arrayBuffer()));
  await writeFile(path.join(dir, `${momentId}.png`), cleanPhoto);

  let videoBytes: Buffer | null = null;
  let videoExt = "webm";
  if (video instanceof File) {
    videoExt = video.type.includes("mp4") ? "mp4" : "webm";
    videoBytes = Buffer.from(await video.arrayBuffer());
    await writeFile(path.join(dir, `${momentId}.${videoExt}`), videoBytes);
  }

  // Langkah 5 Tahap 4 — tandai strip (dibuat /api/quota/claim setelah
  // klaim sukses) sekarang benar-benar punya gambar. `momentId` DI SINI
  // sama dengan `sessionId` klaim (lihat lib/moments.ts). Diam-diam
  // dilewati kalau acara belum ada di Postgres (jalur JSON lama) atau
  // baris strip belum sempat tertulis — bukan alasan menggagalkan
  // unggahan yang sudah berhasil tersimpan di disk.
  try {
    const [event] = await db.select().from(events).where(eq(events.slug, eventCode.toLowerCase()));
    if (event) {
      const [photoAsset] = await db
        .insert(assets)
        .values({
          accountId: event.accountId,
          kind: "strip",
          storageKey: `/moments-local/${eventCode}/${momentId}.png`,
          mime: "image/png",
          bytes: cleanPhoto.byteLength,
          width,
          height,
          checksumSha256: createHash("sha256").update(cleanPhoto).digest("hex"),
          visibility: "private", // K6 — galeri privat bawaan
        })
        .returning();

      let videoAssetId: string | undefined;
      if (videoBytes) {
        const [videoAsset] = await db
          .insert(assets)
          .values({
            accountId: event.accountId,
            kind: "video",
            storageKey: `/moments-local/${eventCode}/${momentId}.${videoExt}`,
            mime: `video/${videoExt}`,
            bytes: videoBytes.byteLength,
            checksumSha256: createHash("sha256").update(videoBytes).digest("hex"),
            visibility: "private",
          })
          .returning();
        videoAssetId = videoAsset.id;
      }

      await markStripUploaded(momentId, { imageAssetId: photoAsset.id, videoAssetId });
    }
  } catch {
    // Fondasi Momen (Tahap 4) gagal mencatat — berkas SUDAH aman di
    // disk, tamu tidak boleh terpengaruh (K14).
  }

  return NextResponse.json({ ok: true });
}
