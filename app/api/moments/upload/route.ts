import { createHash } from "node:crypto";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { events } from "@/lib/db/schema/events";
import { assets } from "@/lib/db/schema/templates";
import { markStripUploaded } from "@/lib/db/queries/sessions";

/**
 * Token upload dikeluarkan di server (route ini), tapi byte filenya lewat
 * langsung dari browser tamu ke Vercel Blob — TIDAK numpang lewat body
 * request Next.js. Video pesan suara bisa sampai ~10MB (15 detik pada
 * 6 Mbps), jauh di atas batas body request Vercel Functions (4.5MB), jadi
 * upload sisi-server biasa bukan opsi di sini.
 *
 * ⚠️ K7/D-17 (Tahap 4): route ini SENGAJA TIDAK memanggil
 * stripImageMetadata() — byte gambarnya tidak pernah singgah di server
 * ini (langsung browser→Blob), jadi tidak ada titik untuk memprosesnya
 * server-side tanpa membongkar arsitektur direct-upload di atas (yang
 * ada alasannya sendiri, lihat komentar di atas). Risikonya kecil: PNG
 * di sini lahir dari `<canvas>` compositor sisi tamu, bukan foto kamera
 * mentah, jadi secara teknis tidak membawa EXIF GPS kamera sama sekali.
 * Padanan dev-lokalnya (upload-local/route.ts) TETAP dibersihkan demi
 * konsisten, karena byte-nya memang lewat server di situ.
 *
 * ⚠️ Langkah 5 Tahap 4, jalur Blob: `onUploadCompleted` di bawah TIDAK
 * PERNAH diuji sungguhan (cuma jalan di deploy Vercel produksi/preview —
 * dev lokal SELALU lewat upload-local/route.ts, lihat lib/moments.ts
 * storageMode()). Diimplementasikan best-effort, sengaja dibungkus
 * try/catch total: kalau gagal, file tetap aman di Blob (perilaku LAMA,
 * tidak berubah), cuma baris sessions/strips (fondasi Momen) tidak
 * tersambung — bukan alasan menggagalkan unggahan tamu (K14).
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith("moments/")) {
          throw new Error("Path upload tidak valid.");
        }
        return {
          // Wildcard, bukan exact-match — MediaRecorder mengeluarkan
          // contentType lengkap dengan codec (mis. "video/mp4;codecs=avc1,
          // mp4a.40.2"), yang tidak akan pernah cocok exact-match "video/mp4".
          // application/json: sidecar kecil berisi nama tamu (lihat
          // lib/moments.ts uploadToBlob).
          allowedContentTypes: ["image/png", "video/*", "application/json"],
          addRandomSuffix: false,
          allowOverwrite: true,
          maximumSizeInBytes: 30 * 1024 * 1024,
        };
      },
      onUploadCompleted: async ({ blob }) => {
        // Fondasi Momen (Langkah 5 Tahap 4) — cuma foto (.png) yang
        // ditandai "uploaded", video/JSON sidecar dilewati (video
        // opsional, JSON cuma nama tamu) demi kesederhanaan. Kalau
        // baris ini gagal tersambung, tamu TETAP dapat filenya di Blob
        // (perilaku lama tidak berubah) — lihat komentar besar di atas.
        try {
          const match = blob.pathname.match(/^moments\/([^/]+)\/([^/.]+)\.png$/);
          if (!match) return;
          const [, code, momentId] = match;

          const [event] = await db.select().from(events).where(eq(events.slug, code.toLowerCase()));
          if (!event) return;

          const fileRes = await fetch(blob.url);
          if (!fileRes.ok) return;
          const bytes = Buffer.from(await fileRes.arrayBuffer());

          const [asset] = await db
            .insert(assets)
            .values({
              accountId: event.accountId,
              kind: "strip",
              storageKey: blob.url,
              mime: blob.contentType || "image/png",
              bytes: bytes.byteLength,
              checksumSha256: createHash("sha256").update(bytes).digest("hex"),
              visibility: "private", // K6 — galeri privat bawaan
            })
            .returning();

          await markStripUploaded(momentId, { imageAssetId: asset.id });
        } catch {
          // K14 "gagal pelan" — byte sudah aman di Blob, fondasi Momen
          // boleh gagal tanpa mengganggu tamu.
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload gagal." },
      { status: 400 }
    );
  }
}
