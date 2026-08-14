import { NextResponse } from "next/server";
import { getSessionClientId } from "@/lib/adminAuth";
import { getRepo } from "@/lib/repo";
import { applyOrderEffect } from "@/lib/services/orderEffects";

/** Tandai lunas + terapkan efeknya (tambah kuota/masa aktif/jatah event)
    — STAFF SAJA. Klien tidak boleh menandai pesanannya sendiri lunas;
    itu meniadakan gunanya "konfirmasi manual" sama sekali. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clientId = await getSessionClientId();
  if (!clientId) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });

  const repo = getRepo();
  const staff = await repo.clients.getById(clientId);
  if (!staff?.isStaff) {
    // 404, bukan 403 — pola yang sama dipakai di seluruh proyek ini:
    // jangan bocorkan bahwa pesanan ini ADA ke pemanggil yang tidak
    // berhak, biarpun di sini alasan sebenarnya "bukan staff".
    return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
  }

  const order = await repo.orders.getById(id);
  if (!order) return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });

  // Idempoten: konfirmasi dua kali (mis. klik ganda / refresh) tidak
  // boleh menambah kuota/masa aktif DUA kali. Order yang sudah "paid"
  // atau "cancelled" tidak diproses ulang, dikembalikan apa adanya.
  if (order.status !== "pending") {
    return NextResponse.json({ order });
  }

  const body = (await request.json().catch(() => null)) as { note?: string } | null;

  const updated = await repo.orders.update(id, {
    status: "paid",
    paidAt: new Date().toISOString(),
    note: body?.note?.trim() || order.note,
  });
  if (!updated) return NextResponse.json({ error: "Gagal menyimpan." }, { status: 500 });

  await applyOrderEffect(updated, repo);

  return NextResponse.json({ order: updated });
}
