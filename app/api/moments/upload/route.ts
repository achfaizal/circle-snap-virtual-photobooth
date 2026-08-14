import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

/**
 * Token upload dikeluarkan di server (route ini), tapi byte filenya lewat
 * langsung dari browser tamu ke Vercel Blob — TIDAK numpang lewat body
 * request Next.js. Video pesan suara bisa sampai ~10MB (15 detik pada
 * 6 Mbps), jauh di atas batas body request Vercel Functions (4.5MB), jadi
 * upload sisi-server biasa bukan opsi di sini.
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
      onUploadCompleted: async () => {
        // Tidak perlu aksi tambahan — file sudah ada di Blob dan langsung
        // kelihatan lewat GET /api/moments (list by prefix), tidak ada
        // database terpisah yang perlu disinkronkan.
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
