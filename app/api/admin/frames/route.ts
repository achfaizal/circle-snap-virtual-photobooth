import { NextResponse } from "next/server";
import { getSessionClientId } from "@/lib/adminAuth";
import { getRepo } from "@/lib/repo";
import type { NewFrame, Slot } from "@/lib/models/frame";

interface CreateFrameBody {
  name: string;
  blurb: string;
  printSize: string;
  overlayAssetId: string;
  paper: string;
  width: number;
  height: number;
  slots: Slot[];
  slotSource: "auto" | "manual" | "auto-adjusted";
}

export async function POST(request: Request) {
  const sessionClientId = await getSessionClientId();
  if (!sessionClientId) {
    return NextResponse.json({ error: "Belum masuk." }, { status: 401 });
  }

  const repo = getRepo();
  const client = await repo.clients.getById(sessionClientId);
  if (!client) {
    return NextResponse.json({ error: "Belum masuk." }, { status: 401 });
  }

  // Upload bingkai sendiri adalah fitur berbayar (docs/blueprint/09 §6).
  // Staff selalu boleh — mereka yang mengisi pustaka bawaan.
  if (!client.isStaff) {
    const subs = await Promise.all(
      (await repo.events.list(client.id)).map((e) => repo.subscriptions.getByEventId(e.id))
    );
    const allowed = subs.some((s) => s?.features.customFrameUpload);
    if (!allowed) {
      return NextResponse.json(
        { error: "Paketmu belum termasuk upload bingkai sendiri. Upgrade dulu ya." },
        { status: 403 }
      );
    }
  }

  const body = (await request.json().catch(() => null)) as CreateFrameBody | null;
  if (!body?.name?.trim() || !body?.overlayAssetId) {
    return NextResponse.json({ error: "Nama dan gambar bingkai wajib diisi." }, { status: 400 });
  }
  if (!Array.isArray(body.slots) || body.slots.length === 0) {
    return NextResponse.json(
      { error: "Minimal satu slot foto wajib ada — tambahkan manual kalau deteksi otomatis kosong." },
      { status: 400 }
    );
  }

  const input: NewFrame = {
    // Staff mengisi pustaka BAWAAN (clientId null, dipakai semua klien);
    // klien biasa memiliki bingkainya sendiri. Sebelumnya semua bingkai
    // dibuat null — artinya bingkai upload satu klien diam-diam muncul
    // di pustaka klien lain.
    clientId: client.isStaff ? null : client.id,
    name: body.name.trim(),
    blurb: body.blurb.trim(),
    width: body.width,
    height: body.height,
    printSize: body.printSize.trim() || "10x30cm",
    overlayAssetId: body.overlayAssetId,
    paper: body.paper,
    slots: body.slots,
    // Sengaja kosong — canvas designer (Fase 3b) belum ada, staff yang
    // menulis textLayers manual kalau bingkai ini butuh teks dinamis.
    textLayers: [],
    slotSource: body.slotSource,
  };

  const frame = await repo.frames.create(input);
  return NextResponse.json({ frame }, { status: 201 });
}
