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

  // Sidecar JSON kecil berisi nama tamu — file terpisah, bukan ditambahkan
  // sebagai query/metadata Blob, supaya /api/moments (GET) bisa membacanya
  // dengan cara yang sama persis di mode local maupun blob.
  if (guestName) {
    await upload(`moments/${code}/${momentId}.json`, JSON.stringify({ name: guestName }), {
      access: "public",
      handleUploadUrl: "/api/moments/upload",
      contentType: "application/json",
    });
  }
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

  if (mode === "blob") {
    await uploadToBlob(code, momentId, photo, video, guestName);
  } else {
    await uploadToLocal(code, momentId, photo, video, guestName);
  }
}

export async function fetchMoments(eventCode: string): Promise<Moment[]> {
  const res = await fetch(`/api/moments?event=${encodeURIComponent(eventCode)}`);
  if (!res.ok) throw new Error("Momen belum bisa dimuat.");
  const data = (await res.json()) as { moments?: Moment[] };
  return data.moments ?? [];
}
