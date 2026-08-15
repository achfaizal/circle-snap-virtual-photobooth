import { NextResponse } from "next/server";
import { requireAccountRole } from "@/lib/clientAuth";
import { getEventForAccount } from "@/lib/db/queries/events";
import { reorderEventFrames } from "@/lib/db/queries/eventFrames";

/** Urutan bingkai = urutan karusel yang dilihat tamu (dok 05 §5.4). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAccountRole("manager");
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const event = await getEventForAccount(id, guard.accountId);
  if (!event) return NextResponse.json({ error: "Acara tidak ditemukan." }, { status: 404 });

  const body = (await request.json().catch(() => null)) as { orderedIds?: string[] } | null;
  if (!body?.orderedIds?.length) return NextResponse.json({ error: "orderedIds wajib diisi." }, { status: 400 });

  await reorderEventFrames(id, body.orderedIds);
  return NextResponse.json({ ok: true });
}
