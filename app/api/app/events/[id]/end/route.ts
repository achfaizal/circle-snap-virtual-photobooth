import { NextResponse } from "next/server";
import { requireAccountRole } from "@/lib/clientAuth";
import { getEventForAccount } from "@/lib/db/queries/events";
import { endEvent } from "@/lib/db/queries/eventEnd";

/**
 * Langkah 17 Tahap 4 — "Akhiri Acara" (dok 01 §3.2 tabel peran: owner ✔,
 * manager ✔, operator ◐ hanya kalau `event.operatorCanEnd=true`).
 * `requireAccountRole("operator")` di sini cuma memastikan MINIMAL
 * anggota akun (bukan orang luar) — pembatasan operator SUNGGUHAN
 * dicek di bawah terhadap `operatorCanEnd` per-acara, bukan peran
 * global (dok 01 §3.2 catatan kaki ²).
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAccountRole("operator");
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const event = await getEventForAccount(id, guard.accountId); // K5
  if (!event) return NextResponse.json({ error: "Acara tidak ditemukan." }, { status: 404 });

  if (guard.role === "operator" && !event.operatorCanEnd) {
    return NextResponse.json(
      { error: "Kamu tidak punya izin mengakhiri acara ini. Minta owner/manager mengaktifkannya dulu." },
      { status: 403 }
    );
  }

  const result = await endEvent(id, guard.accountId, guard.userId);
  if (!result.ok) {
    if (result.reason === "not_found") return NextResponse.json({ error: "Acara tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ error: "Acara ini tidak sedang berjalan (live)." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, event: result.event });
}
