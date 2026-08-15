import { NextResponse } from "next/server";
import { requireAccountRole } from "@/lib/clientAuth";
import { getEventForAccount } from "@/lib/db/queries/events";
import { allocateWalletToEvent, deallocateEventToWallet } from "@/lib/db/queries/allocation";

/** Alokasi tambahan dari dompet ke acara yang SUDAH ada (beda dari
    Langkah 4 yang mengalokasikan sekaligus saat acara dibuat) — dok 01
    §3.2 Owner/Manager saja. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAccountRole("manager");
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const event = await getEventForAccount(id, guard.accountId);
  if (!event) return NextResponse.json({ error: "Acara tidak ditemukan." }, { status: 404 });

  const body = (await request.json().catch(() => null)) as { strips?: number } | null;
  const strips = body?.strips;
  if (!strips || !Number.isInteger(strips) || strips <= 0) {
    return NextResponse.json({ error: "Jumlah strip harus bilangan bulat positif." }, { status: 400 });
  }

  const result = await allocateWalletToEvent(guard.accountId, id, strips, guard.userId);
  if (!result.ok) {
    return NextResponse.json({ error: `Saldo dompet tidak cukup untuk mengalokasikan ${strips} strip.` }, { status: 400 });
  }
  return NextResponse.json(result);
}

/** Tarik kembali alokasi (AB-08) — cuma acara `draft` (belum `live`). */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAccountRole("manager");
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const event = await getEventForAccount(id, guard.accountId);
  if (!event) return NextResponse.json({ error: "Acara tidak ditemukan." }, { status: 404 });

  const body = (await request.json().catch(() => null)) as { strips?: number } | null;
  const strips = body?.strips;
  if (!strips || !Number.isInteger(strips) || strips <= 0) {
    return NextResponse.json({ error: "Jumlah strip harus bilangan bulat positif." }, { status: 400 });
  }

  const result = await deallocateEventToWallet(guard.accountId, id, strips, guard.userId);
  if (!result.ok) {
    const message =
      result.reason === "event_live"
        ? "Alokasi terkunci — acara sudah live. Sisa kuota baru kembali ke dompet otomatis setelah acara diakhiri (AB-08)."
        : result.reason === "insufficient_quota"
          ? "Jumlah melebihi sisa kuota acara ini."
          : "Acara tidak ditemukan.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  return NextResponse.json(result);
}
