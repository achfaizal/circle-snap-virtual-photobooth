import { NextResponse } from "next/server";
import { getSessionClientId, hashPassword, verifyClientPassword } from "@/lib/adminAuth";
import { getRepo } from "@/lib/repo";

export async function POST(request: Request) {
  const clientId = await getSessionClientId();
  if (!clientId) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as
    | { currentPassword?: string; newPassword?: string }
    | null;
  const currentPassword = body?.currentPassword ?? "";
  const newPassword = body?.newPassword ?? "";

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Password baru minimal 8 karakter." }, { status: 400 });
  }

  const repo = getRepo();
  const client = await repo.clients.getById(clientId);
  if (!client) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });

  // Wajib membuktikan tahu password LAMA dulu — tanpa ini, siapa pun yang
  // sesinya sedang aktif (mis. lupa logout di komputer bersama) bisa
  // mengunci pemilik akun sungguhan keluar cukup dengan mengganti
  // passwordnya diam-diam.
  if (!verifyClientPassword(client, currentPassword)) {
    return NextResponse.json({ error: "Password saat ini salah." }, { status: 401 });
  }

  await repo.clients.update(clientId, { passwordHash: hashPassword(newPassword) });
  return NextResponse.json({ ok: true });
}
