import { NextResponse } from "next/server";

/**
 * Vercel selalu mengeset `VERCEL=1` di lingkungan servernya (production
 * maupun preview) — tidak pernah ada saat `next dev` biasa di komputer
 * sendiri. Dipakai untuk menentukan mode penyimpanan momen: `next dev`
 * lokal ("local", nulis ke public/moments-local) vs sungguhan di Vercel
 * ("blob", nulis ke Vercel Blob). Dicek di server (bukan lewat env
 * NEXT_PUBLIC_* di client) supaya tidak tergantung pengaturan expose
 * env var project yang bisa berubah-ubah.
 */
export async function GET() {
  const mode = process.env.VERCEL ? "blob" : "local";
  return NextResponse.json({ mode });
}
