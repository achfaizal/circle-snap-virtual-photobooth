/**
 * MOMEN TAMU
 *
 * Belum ada database. Dua mode penyimpanan tergantung lingkungan (dicek di
 * server lewat /api/moments/config, lihat catatan di sana):
 *
 *  - Local dev (`next dev` di komputer sendiri): ditulis ke
 *    public/moments-local/ di filesystem lokal, lewat upload biasa ke
 *    /api/moments/upload-local. Testing jadi tidak numpang di data tamu
 *    sungguhan.
 *  - Production di Vercel: Vercel Blob, lewat upload langsung
 *    browser→Blob (bukan lewat body request Next.js) karena video pesan
 *    suara bisa sampai ~10MB, di atas batas body request Vercel Functions
 *    (4.5MB).
 *
 * Foto & video satu momen berbagi momentId (nomor struk tamu) sebagai nama
 * dasar file, supaya gampang dikelompokkan lagi saat dibaca di
 * /api/moments.
 */
import { upload } from "@vercel/blob/client";

export interface Moment {
  id: string;
  photoUrl?: string;
  videoUrl?: string;
  uploadedAt: string;
  /** Nama tamu yang mengambil momen ini, kalau diisi saat sesi. */
  guestName?: string;
}

async function storageMode(): Promise<"blob" | "local"> {
  try {
    const res = await fetch("/api/moments/config");
    const data = (await res.json()) as { mode?: "blob" | "local" };
    return data.mode === "blob" ? "blob" : "local";
  } catch {
    return "local";
  }
}

async function uploadToBlob(
  code: string,
  momentId: string,
  photo: Blob,
  video?: Blob | null,
  guestName?: string
) {
  // allowOverwrite diatur di server (onBeforeGenerateToken di
  // app/api/moments/upload/route.ts) — kuota per event disimpan di
  // localStorage tamu, bukan di server, jadi kalau localStorage-nya
  // kehapus/reset, nomor struk (momentId) bisa kebentur lagi dari 1.
  // Overwrite lebih baik daripada upload gagal total dan tamu kehilangan
  // momennya.
  await upload(`moments/${code}/${momentId}.png`, photo, {
    access: "public",
    handleUploadUrl: "/api/moments/upload",
    contentType: "image/png",
  });

  if (video) {
    // video.type dari MediaRecorder ikut membawa parameter codec (mis.
    // "video/mp4;codecs=avc1,mp4a.40.2") — dipakai untuk deteksi ekstensi
    // saja, bukan dikirim apa adanya sebagai contentType.
    const ext = video.type.includes("mp4") ? "mp4" : "webm";
    await upload(`moments/${code}/${momentId}.${ext}`, video, {
      access: "public",
      handleUploadUrl: "/api/moments/upload",
      contentType: `video/${ext}`,
    });
  }

  // `guestName` TIDAK LAGI ditulis sebagai sidecar JSON di sini — bug
  // ditemukan & diperbaiki saat menguji Langkah 18 Tahap 4 (retensi):
  // sejak Langkah 6, /api/moments (GET) baca nama tamu dari
  // `sessions.guest_name` (Postgres, diisi saat klaim), bukan dari
  // sidecar ini lagi. Menulisnya di sini cuma buang satu panggilan
  // upload Blob per momen (biaya nyata) untuk file yang tidak pernah
  // dibaca — dan jadi objek yatim yang tidak ikut kena skrip retensi
  // (Langkah 18 cuma menghapus objek yang tercatat di `assets`).
}

async function uploadToLocal(
  code: string,
  momentId: string,
  photo: Blob,
  video?: Blob | null,
  guestName?: string
) {
  const form = new FormData();
  form.set("eventCode", code);
  form.set("momentId", momentId);
  form.set("photo", photo, "photo.png");
  if (video) form.set("video", video, "video.webm");
  if (guestName) form.set("guestName", guestName);

  const res = await fetch("/api/moments/upload-local", { method: "POST", body: form });
  if (!res.ok) throw new Error("Upload momen (local) gagal.");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** dok 07 §8: "Unggah gagal → coba ulang otomatis 3 kali dengan jeda
    menaik. Tetap gagal → strip tetap bisa diunduh tamu; tandai entri
    Momen pending_upload." `momentId` di sini SEKARANG sama dengan
    `sessionId` yang sudah dikirim ke klaim kuota (Langkah 5 Tahap 4) —
    dipakai menandai `strips.upload_status` lewat /api/moments/mark-failed
    kalau semua retry habis, supaya statusnya jujur (bukan diam-diam
    tetap 'pending' selamanya). */
export async function uploadMoment({
  eventCode,
  momentId,
  photo,
  video,
  guestName,
}: {
  eventCode: string;
  momentId: string;
  photo: Blob;
  video?: Blob | null;
  guestName?: string;
}): Promise<void> {
  const code = eventCode.toUpperCase();
  const mode = await storageMode();
  const attempt = () => (mode === "blob" ? uploadToBlob(code, momentId, photo, video, guestName) : uploadToLocal(code, momentId, photo, video, guestName));

  const delaysMs = [1000, 3000, 8000]; // jeda menaik, 3 percobaan
  let lastError: unknown;
  for (let i = 0; i <= delaysMs.length; i++) {
    try {
      await attempt();
      return;
    } catch (e) {
      lastError = e;
      if (i < delaysMs.length) await sleep(delaysMs[i]);
    }
  }

  // Semua retry habis — tandai gagal (bukan diam-diam tetap 'pending'),
  // lalu tetap lempar supaya pemanggil tahu unduhan manual jadi jalan
  // satu-satunya (tamu tetap punya struk, K14).
  await fetch("/api/moments/mark-failed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: momentId }),
  }).catch(() => {});
  throw lastError;
}

export async function fetchMoments(eventCode: string): Promise<Moment[]> {
  const res = await fetch(`/api/moments?event=${encodeURIComponent(eventCode)}`);
  if (!res.ok) throw new Error("Momen belum bisa dimuat.");
  const data = (await res.json()) as { moments?: Moment[] };
  return data.moments ?? [];
}
