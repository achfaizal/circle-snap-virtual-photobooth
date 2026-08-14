import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, createSessionToken, verifyClientPassword } from "@/lib/adminAuth";
import { getRepo } from "@/lib/repo";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { email?: string; password?: string }
    | null;

  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: "Email dan password wajib diisi." }, { status: 400 });
  }

  const repo = getRepo();
  const client = await repo.clients.getByEmail(body.email.trim());

  // Pesan error disatukan (bukan "email tidak ditemukan" vs "password
  // salah" terpisah) — kebiasaan keamanan standar, supaya orang yang
  // coba menebak tidak tahu bagian mana yang sudah benar.
  if (!client || !verifyClientPassword(client, body.password)) {
    return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, createSessionToken(client.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
