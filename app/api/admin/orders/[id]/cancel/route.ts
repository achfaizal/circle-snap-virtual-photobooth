import { NextResponse } from "next/server";
import { getSessionClientId } from "@/lib/adminAuth";
import { getRepo } from "@/lib/repo";

/** Pemilik pesanan boleh membatalkan punyanya sendiri (berubah pikiran
    sebelum transfer), staff boleh membatalkan siapa pun (transfer tidak
    pernah masuk). Sudah "paid" tidak bisa dibatalkan dari sini — itu
    perlu alur refund, di luar cakupan fase konfirmasi manual ini. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clientId = await getSessionClientId();
  if (!clientId) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });

  const repo = getRepo();
  const [order, client] = await Promise.all([repo.orders.getById(id), repo.clients.getById(clientId)]);
  if (!order || !client) return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
  if (!client.isStaff && order.clientId !== client.id) {
    return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
  }

  if (order.status !== "pending") {
    return NextResponse.json({ order });
  }

  const updated = await repo.orders.update(id, { status: "cancelled" });
  return NextResponse.json({ order: updated });
}
