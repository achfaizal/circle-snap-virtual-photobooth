import { NextResponse } from "next/server";
import { claimQuota } from "@/lib/db/queries/claimQuota";

/**
 * Klaim SATU strip — Langkah 9 rencana Tahap 1 (K1/K2/K3, AB-01/02/03).
 *
 * ⚠️ KONTRAK BERUBAH dari versi lama: `sessionId` sekarang WAJIB di body,
 * dipakai sebagai kunci idempoten (dok 02 §3.5). Ini SENGAJA membuat
 * pemanggil lama di components/StepResult.tsx (yang cuma mengirim
 * `eventId`) DITOLAK 400 — pemanggil booth tamu diperbarui di Tahap 3,
 * bukan di langkah ini (lihat rencana Tahap 1, Langkah 9 "Tidak
 * dikerjakan"). Data & kuota tidak dibaca dari JSON lagi sama sekali;
 * lihat lib/db/queries/claimQuota.ts untuk alur transaksinya.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { eventId?: string; sessionId?: string }
    | null;
  const eventId = body?.eventId;
  const sessionId = body?.sessionId;

  if (!eventId || typeof eventId !== "string") {
    return NextResponse.json({ error: "eventId wajib diisi." }, { status: 400 });
  }
  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json({ error: "sessionId wajib diisi." }, { status: 400 });
  }

  const result = await claimQuota(eventId, sessionId);

  if (!result.ok) {
    if (result.reason === "not_found") {
      return NextResponse.json({ error: "Acara tidak ditemukan." }, { status: 404 });
    }
    const messages: Record<Exclude<typeof result.reason, "not_found">, string> = {
      not_live: "Acara ini belum atau tidak lagi berjalan.",
      expired: "Masa aktif acara ini sudah habis.",
      empty: "Kuota acara ini sudah habis.",
    };
    return NextResponse.json({ error: messages[result.reason] }, { status: 409 });
  }

  return NextResponse.json({ remaining: result.remaining, alreadyClaimed: result.alreadyClaimed });
}
