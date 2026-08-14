import { NextResponse } from "next/server";
import { getSessionClientId } from "@/lib/adminAuth";
import { getRepo } from "@/lib/repo";
import { addonById } from "@/lib/services/addons";
import type { OrderKind } from "@/lib/models/order";

export async function GET(_request: Request) {
  const clientId = await getSessionClientId();
  if (!clientId) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });

  const repo = getRepo();
  const client = await repo.clients.getById(clientId);
  if (!client) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });

  // Staff melihat SEMUA klien (perlu itu untuk mengonfirmasi pesanan
  // siapa pun) — pola sama dengan GET /api/admin/events. Klien biasa
  // cuma pesanannya sendiri, apa pun yang diminta di query.
  const orders = await repo.orders.list(client.isStaff ? undefined : client.id);

  // Nama klien cuma dikirim untuk staff (perlu tahu pesanan ini dari
  // siapa) — klien biasa tidak butuh dan tidak berhak melihat daftar
  // klien lain sama sekali.
  let clientNames: Record<string, string> | undefined;
  if (client.isStaff) {
    const all = await repo.clients.list();
    clientNames = Object.fromEntries(all.map((c) => [c.id, c.name]));
  }

  return NextResponse.json({ orders, clientNames });
}

interface CreateOrderBody {
  addonId?: string;
  eventId?: string;
}

export async function POST(request: Request) {
  const clientId = await getSessionClientId();
  if (!clientId) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as CreateOrderBody | null;
  if (!body?.addonId) return NextResponse.json({ error: "Pilih add-on dulu." }, { status: 400 });

  // Harga & besaran SELALU dari katalog server, tidak pernah dipercaya
  // dari body — klien yang mengirim priceIdr sendiri (mis. lewat DevTools)
  // tidak boleh bisa membeli 50 strip seharga Rp1.
  const addon = addonById(body.addonId);
  if (!addon) return NextResponse.json({ error: "Add-on tidak dikenali." }, { status: 400 });

  const repo = getRepo();

  const needsEvent: OrderKind[] = ["topup_strip", "extend_days"];
  if (needsEvent.includes(addon.kind)) {
    if (!body.eventId) {
      return NextResponse.json({ error: "Pilih event tujuan dulu." }, { status: 400 });
    }
    // Kepemilikan event WAJIB dicek — tanpa ini klien A bisa membeli
    // top-up untuk event klien B asal tahu/tebak id-nya. 404, bukan 403
    // (pola yang sama dipakai di seluruh route event lain di proyek ini).
    const event = await repo.events.getById(body.eventId);
    const client = await repo.clients.getById(clientId);
    if (!event || !client || (!client.isStaff && event.clientId !== client.id)) {
      return NextResponse.json({ error: "Event tidak ditemukan." }, { status: 404 });
    }
  }

  const order = await repo.orders.create({
    clientId,
    eventId: needsEvent.includes(addon.kind) ? body.eventId : undefined,
    kind: addon.kind,
    amount: addon.amount,
    priceIdr: addon.priceIdr,
    method: "manual_transfer",
  });

  return NextResponse.json({ order }, { status: 201 });
}
