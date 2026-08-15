import { NextResponse } from "next/server";
import { verifyPasswordHash } from "@/lib/adminAuth";
import { CLIENT_COOKIE_NAME, createClientSessionToken } from "@/lib/clientAuth";
import { getActiveMembershipByUserId, getUserByEmail } from "@/lib/db/queries/accounts";

/**
 * Login KLIEN (/app/*, Tahap 3) — Postgres users/accounts, terpisah dari
 * login staf (/admin/login, users.platform_role). Ditolak kalau user
 * tidak punya keanggotaan akun aktif mana pun — termasuk staf murni
 * (platform_role terisi tapi tanpa account, lihat lib/clientAuth.ts) dan
 * anggota yang statusnya belum 'active' (undangan belum diterima, di
 * luar cakupan Tahap 3 — belum ada UI undang, tapi gerbang ini tetap
 * benar begitu ada).
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { email?: string; password?: string }
    | null;

  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: "Email dan password wajib diisi." }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();
  const user = await getUserByEmail(email);

  // Pesan error disatukan — supaya orang yang coba menebak tidak tahu
  // bagian mana yang sudah benar (pola sama /api/admin/login).
  const invalid = () => NextResponse.json({ error: "Email atau password salah." }, { status: 401 });

  if (!user || !verifyPasswordHash(user.passwordHash, body.password)) {
    return invalid();
  }

  const membership = await getActiveMembershipByUserId(user.id);
  if (!membership) {
    return invalid();
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(CLIENT_COOKIE_NAME, createClientSessionToken(user.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
