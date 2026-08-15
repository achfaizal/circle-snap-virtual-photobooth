import { NextResponse } from "next/server";
import { requireAccountRole } from "@/lib/clientAuth";
import { getEventForAccount } from "@/lib/db/queries/events";
import { getEventFrameRow, countActiveEventFrames, setEventFrameEnabled, deleteCustomEventFrame } from "@/lib/db/queries/eventFrames";

const LAST_ACTIVE_MESSAGE =
  "Minimal satu bingkai harus aktif — tanpa itu tamu tidak punya pilihan apa pun saat berfoto.";

/** Nonaktifkan/aktifkan bingkai (AB-17: menonaktifkan yang TERAKHIR
    aktif ditolak). Bawaan template maupun kustom sama-sama boleh
    dinonaktifkan (beda dari DELETE — itu AB-16, kustom saja). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; frameId: string }> }) {
  const guard = await requireAccountRole("manager");
  if (guard instanceof NextResponse) return guard;

  const { id, frameId } = await params;
  const event = await getEventForAccount(id, guard.accountId);
  if (!event) return NextResponse.json({ error: "Acara tidak ditemukan." }, { status: 404 });

  const row = await getEventFrameRow(frameId);
  if (!row || row.eventId !== id) return NextResponse.json({ error: "Bingkai tidak ditemukan." }, { status: 404 });

  const body = (await request.json().catch(() => null)) as { isEnabled?: boolean } | null;
  if (body?.isEnabled === undefined) return NextResponse.json({ error: "isEnabled wajib diisi." }, { status: 400 });

  if (!body.isEnabled && row.isEnabled) {
    const activeCount = await countActiveEventFrames(id);
    if (activeCount <= 1) {
      return NextResponse.json({ error: LAST_ACTIVE_MESSAGE }, { status: 400 });
    }
  }

  const updated = await setEventFrameEnabled(frameId, body.isEnabled);
  return NextResponse.json({ ok: true, eventFrame: updated });
}

/** AB-16 — cuma bingkai KUSTOM (unggahan klien) yang boleh dihapus
    penuh; bawaan template ditolak keras (bukan diam-diam diabaikan). */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; frameId: string }> }) {
  const guard = await requireAccountRole("manager");
  if (guard instanceof NextResponse) return guard;

  const { id, frameId } = await params;
  const event = await getEventForAccount(id, guard.accountId);
  if (!event) return NextResponse.json({ error: "Acara tidak ditemukan." }, { status: 404 });

  const row = await getEventFrameRow(frameId);
  if (!row || row.eventId !== id) return NextResponse.json({ error: "Bingkai tidak ditemukan." }, { status: 404 });

  if (row.source !== "custom") {
    return NextResponse.json(
      { error: "Bingkai bawaan template tidak bisa dihapus, hanya dinonaktifkan (AB-16)." },
      { status: 400 }
    );
  }

  if (row.isEnabled) {
    const activeCount = await countActiveEventFrames(id);
    if (activeCount <= 1) {
      return NextResponse.json({ error: LAST_ACTIVE_MESSAGE }, { status: 400 });
    }
  }

  await deleteCustomEventFrame(frameId);
  return NextResponse.json({ ok: true });
}
