import { NextResponse } from "next/server";
import { markStripUploadFailed } from "@/lib/db/queries/sessions";

/** Dipanggil klien (lib/moments.ts uploadMoment()) setelah 3x retry
    unggah gagal total (dok 07 §8) — sengaja tanpa gerbang sesi, tamu
    yang memanggilnya tidak punya sesi /app/* sama sekali. sessionId
    sendiri sudah jadi kunci idempoten klaim, tidak bisa ditebak orang
    lain untuk mengganggu strip acara lain (uuid acak per sesi). */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { sessionId?: string } | null;
  if (!body?.sessionId) return NextResponse.json({ error: "sessionId wajib diisi." }, { status: 400 });

  await markStripUploadFailed(body.sessionId).catch(() => {});
  return NextResponse.json({ ok: true });
}
