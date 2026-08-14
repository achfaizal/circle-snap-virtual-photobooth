import { NextResponse } from "next/server";
import { getSessionClientId } from "@/lib/adminAuth";
import { getRepo } from "@/lib/repo";

/** Profil sendiri saja — TIDAK menerima id di URL/body, supaya tidak ada
    cara mengubah klien lain lewat parameter yang salah ketik/dipalsukan.
    clientId SELALU dari sesi, tidak pernah dari input pemanggil. */
export async function GET() {
  const clientId = await getSessionClientId();
  if (!clientId) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });

  const client = await getRepo().clients.getById(clientId);
  if (!client) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });

  // passwordHash TIDAK PERNAH dikirim ke browser, bahkan untuk pemiliknya
  // sendiri — tidak ada alasan sah client-side membutuhkannya.
  const { passwordHash: _hash, ...safe } = client;
  void _hash;
  return NextResponse.json({ client: safe });
}

export async function PATCH(request: Request) {
  const clientId = await getSessionClientId();
  if (!clientId) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { name?: string } | null;
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "Nama tidak boleh kosong." }, { status: 400 });
  }

  const updated = await getRepo().clients.update(clientId, { name: body.name.trim() });
  if (!updated) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });

  const { passwordHash: _hash, ...safe } = updated;
  void _hash;
  return NextResponse.json({ client: safe });
}
