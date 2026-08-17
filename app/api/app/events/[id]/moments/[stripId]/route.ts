import { NextResponse } from "next/server";
import { requireAccountRole } from "@/lib/clientAuth";
import { getEventForAccount } from "@/lib/db/queries/events";
import { getStripForEvent, setStripHidden, deleteStripPermanently } from "@/lib/db/queries/strips";
import { recordAudit, getActorIp } from "@/lib/services/auditLog";

interface HidePatchBody {
  isHidden?: boolean;
  reason?: string;
}

/** Langkah 7 Tahap 4 — sembunyikan/tampilkan (dok 05 §5.6, satu klik,
    bisa dibatalkan). Owner/manager/operator semua boleh — tabel peran
    tidak membedakan untuk aksi ini, beda dari DELETE di bawah. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; stripId: string }> }
) {
  const guard = await requireAccountRole("operator");
  if (guard instanceof NextResponse) return guard;

  const { id, stripId } = await params;
  const event = await getEventForAccount(id, guard.accountId); // K5
  if (!event) return NextResponse.json({ error: "Acara tidak ditemukan." }, { status: 404 });

  const strip = await getStripForEvent(stripId, event.id);
  if (!strip) return NextResponse.json({ error: "Momen tidak ditemukan." }, { status: 404 });

  const body = (await request.json().catch(() => null)) as HidePatchBody | null;
  if (!body || typeof body.isHidden !== "boolean") {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  await setStripHidden(stripId, body.isHidden, guard.userId, body.reason?.trim() || undefined);

  try {
    await recordAudit({
      actorUserId: guard.userId,
      actorIp: getActorIp(request),
      accountId: guard.accountId,
      action: body.isHidden ? "moment.hide" : "moment.unhide",
      entityType: "strip",
      entityId: stripId,
      before: { isHidden: strip.isHidden },
      after: { isHidden: body.isHidden },
      reason: body.reason?.trim() || null,
    });
  } catch (err) {
    console.error("Gagal mencatat audit moment.hide/unhide:", err);
  }

  return NextResponse.json({ ok: true });
}

/** Hapus permanen — dok 05 §5.6: cuma owner/manager, operator ditolak.
    AB-04: TIDAK menyentuh quota_ledger (lihat komentar
    deleteStripPermanently). */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; stripId: string }> }
) {
  const guard = await requireAccountRole("manager");
  if (guard instanceof NextResponse) return guard;

  const { id, stripId } = await params;
  const event = await getEventForAccount(id, guard.accountId); // K5
  if (!event) return NextResponse.json({ error: "Acara tidak ditemukan." }, { status: 404 });

  const strip = await getStripForEvent(stripId, event.id);
  if (!strip) return NextResponse.json({ error: "Momen tidak ditemukan." }, { status: 404 });

  await deleteStripPermanently(stripId);

  try {
    await recordAudit({
      actorUserId: guard.userId,
      actorIp: getActorIp(request),
      accountId: guard.accountId,
      action: "moment.delete",
      entityType: "strip",
      entityId: stripId,
      before: { receiptNo: strip.receiptNo, sessionId: strip.sessionId },
    });
  } catch (err) {
    console.error("Gagal mencatat audit moment.delete:", err);
  }

  return NextResponse.json({ ok: true });
}
