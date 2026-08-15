import { NextResponse } from "next/server";
import { requireAccountRole } from "@/lib/clientAuth";
import { getAccountById } from "@/lib/db/queries/accounts";
import { getPackageById } from "@/lib/db/queries/packages";
import { createOrder } from "@/lib/db/queries/purchaseOrders";

/**
 * Top-up dompet vendor (Langkah 6 Tahap 3, `/app/billing`) — order TANPA
 * acara target, strip masuk dompet (bukan langsung ke acara). Beda dari
 * `/api/app/events` (Langkah 4) yang selalu membuat Order terikat SATU
 * acara baru. Pakai createOrder() yang sama (Tahap 2) — tidak menulis
 * ulang alur pesanan.
 */
export async function POST(request: Request) {
  const guard = await requireAccountRole("manager");
  if (guard instanceof NextResponse) return guard;

  const body = (await request.json().catch(() => null)) as { packageId?: string } | null;
  if (!body?.packageId) {
    return NextResponse.json({ error: "Pilih paket." }, { status: 400 });
  }

  const account = await getAccountById(guard.accountId);
  if (!account) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });

  const pkg = await getPackageById(body.packageId);
  if (!pkg || pkg.status !== "published") {
    return NextResponse.json({ error: "Paket tidak ditemukan atau belum diterbitkan." }, { status: 400 });
  }
  if (pkg.audience !== account.type && pkg.audience !== "both") {
    return NextResponse.json({ error: "Paket ini bukan untuk jenis akunmu." }, { status: 400 });
  }
  if (pkg.allocationMode !== "flexible") {
    // single_event WAJIB target_event_id (createOrder menegakkan ini) —
    // top-up dompet tanpa acara tujuan cuma masuk akal untuk flexible.
    return NextResponse.json({ error: "Paket ini terikat satu acara, tidak bisa untuk isi ulang dompet." }, { status: 400 });
  }

  const order = await createOrder({
    accountId: account.id,
    createdByUserId: guard.userId,
    packageId: pkg.id,
    paymentMethod: "manual_transfer",
  });

  return NextResponse.json({ ok: true, order }, { status: 201 });
}
