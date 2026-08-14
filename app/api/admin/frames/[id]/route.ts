import { NextResponse } from "next/server";
import { getSessionClientId } from "@/lib/adminAuth";
import { getRepo } from "@/lib/repo";
import type { Frame } from "@/lib/models/frame";
import type { Client } from "@/lib/models/client";

/**
 * Gerbang kepemilikan bingkai — pola yang sama dengan requireEventOwner
 * di app/api/admin/events/[id]/route.ts.
 *
 * ⚠️ Sebelum ini ketiga handler di bawah HANYA memanggil
 * requireAdminSession(): siapa pun yang punya akun bisa melihat,
 * mengubah, bahkan menghapus bingkai milik klien lain maupun bingkai
 * bawaan Circle Snap (clientId === null) asal tahu id-nya. Yang paling
 * parah ada di DELETE — rutin pembersih `frameIds` di sana menyapu
 * SELURUH event milik siapa pun, jadi satu klien menghapus satu bingkai
 * bisa mencopot bingkai dari acara klien lain yang sedang berjalan.
 *
 * Aturannya sekarang:
 *   - staff            → boleh semua
 *   - klien biasa      → hanya bingkai miliknya sendiri
 *   - bingkai bawaan   → hanya-baca bagi klien (boleh GET, tidak boleh
 *                        PATCH/DELETE); itu aset Circle Snap yang dipakai
 *                        bersama semua klien
 *
 * Balasan penolakan sengaja 404, bukan 403 — jangan bocorkan bahwa
 * bingkai itu ada tapi milik orang lain.
 */
async function requireFrameAccess(
  id: string,
  mode: "read" | "write"
): Promise<{ frame: Frame; client: Client } | NextResponse> {
  const clientId = await getSessionClientId();
  if (!clientId) {
    return NextResponse.json({ error: "Belum masuk." }, { status: 401 });
  }

  const repo = getRepo();
  const [frame, client] = await Promise.all([repo.frames.getById(id), repo.clients.getById(clientId)]);
  if (!frame || !client) {
    return NextResponse.json({ error: "Bingkai tidak ditemukan." }, { status: 404 });
  }

  if (client.isStaff) return { frame, client };

  const isShared = frame.clientId === null;
  const isOwner = frame.clientId === client.id;

  // Bingkai bawaan boleh dibaca semua klien (mereka memang memakainya),
  // tapi tidak boleh diubah/dihapus.
  if (mode === "read" && (isShared || isOwner)) return { frame, client };
  if (mode === "write" && isOwner) return { frame, client };

  return NextResponse.json({ error: "Bingkai tidak ditemukan." }, { status: 404 });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireFrameAccess(id, "read");
  if (guard instanceof NextResponse) return guard;
  return NextResponse.json({ frame: guard.frame });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireFrameAccess(id, "write");
  if (guard instanceof NextResponse) return guard;

  const patch = (await request.json().catch(() => null)) as Partial<Frame> | null;
  if (!patch) return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });

  const { id: _ignoredId, clientId: _ignoredClientId, createdAt: _ignoredCreatedAt, ...safePatch } =
    patch;
  void _ignoredId;
  void _ignoredClientId;
  void _ignoredCreatedAt;

  const repo = getRepo();
  const updated = await repo.frames.update(id, { ...safePatch, updatedAt: new Date().toISOString() });
  return NextResponse.json({ frame: updated });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireFrameAccess(id, "write");
  if (guard instanceof NextResponse) return guard;

  const repo = getRepo();
  const { client } = guard;

  // Ketemu nyata saat uji Fase 3 (bukan cuma teori): hapus bingkai yang
  // masih dipakai event meninggalkan ID basi di event.frameIds —
  // getMany() di repo memang menyaring diam-diam (tidak crash), tapi
  // datanya jadi kotor dan `frameIds.length` bohong soal berapa bingkai
  // yang BENAR-BENAR tersedia. Bersihkan referensinya sekalian, bukan
  // cuma hapus baris Frame-nya.
  //
  // ⚠️ Dilingkupi ke event milik klien ini saja. Versi lama menyapu
  // repo.events.list() tanpa filter — satu klien menghapus bingkai bisa
  // merusak acara klien lain. Staff tetap menyapu semua, karena bingkai
  // bawaan yang mereka hapus memang bisa dipakai lintas klien.
  const affected = await repo.events.list(client.isStaff ? undefined : client.id);
  await Promise.all(
    affected
      .filter((e) => e.frameIds.includes(id))
      .map((e) => repo.events.update(e.id, { frameIds: e.frameIds.filter((f) => f !== id) }))
  );

  await repo.frames.remove(id);
  return NextResponse.json({ ok: true });
}
