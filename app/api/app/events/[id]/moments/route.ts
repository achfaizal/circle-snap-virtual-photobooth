import { NextResponse } from "next/server";
import { requireAccountRole } from "@/lib/clientAuth";
import { getEventForAccount } from "@/lib/db/queries/events";
import { listStripsForEvent } from "@/lib/db/queries/strips";

/** Langkah 7 Tahap 4 — daftar Momen untuk panel staf (dok 05 §5.6), beda
    dari GET /api/moments (dipakai tamu): staf lihat SEMUA baris termasuk
    yang disembunyikan, plus status unggah & indikator pesan suara. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAccountRole("operator");
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const event = await getEventForAccount(id, guard.accountId); // K5
  if (!event) return NextResponse.json({ error: "Acara tidak ditemukan." }, { status: 404 });

  const moments = await listStripsForEvent(event.id);
  return NextResponse.json({ moments });
}
