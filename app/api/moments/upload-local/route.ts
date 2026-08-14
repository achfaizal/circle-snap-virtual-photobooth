import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

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
  // Karakter kontrol (newline dkk, bukan spasi) dibuang — nama ini nanti
  // dicetak ke canvas video dan disimpan sebagai JSON, jangan sampai
  // newline/karakter aneh dari clipboard tamu merusak tampilan atau file
  // JSON-nya.
  // eslint-disable-next-line no-control-regex
  const CONTROL_CHARS = /[\x00-\x1F\x7F]/g;
  const guestName = String(form.get("guestName") ?? "")
    .replace(CONTROL_CHARS, "")
    .trim()
    .slice(0, 40);

  if (!SAFE_ID.test(eventCode) || !SAFE_ID.test(momentId)) {
    return NextResponse.json({ error: "eventCode/momentId tidak valid." }, { status: 400 });
  }
  if (!(photo instanceof File)) {
    return NextResponse.json({ error: "File foto wajib diisi." }, { status: 400 });
  }

  const dir = path.join(MOMENTS_DIR, eventCode);
  await mkdir(dir, { recursive: true });

  await writeFile(path.join(dir, `${momentId}.png`), Buffer.from(await photo.arrayBuffer()));

  if (video instanceof File) {
    const ext = video.type.includes("mp4") ? "mp4" : "webm";
    await writeFile(path.join(dir, `${momentId}.${ext}`), Buffer.from(await video.arrayBuffer()));
  }

  if (guestName) {
    await writeFile(path.join(dir, `${momentId}.json`), JSON.stringify({ name: guestName }));
  }

  return NextResponse.json({ ok: true });
}
