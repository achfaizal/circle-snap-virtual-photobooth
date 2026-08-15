import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, createSessionToken, verifyPasswordHash } from "@/lib/adminAuth";
import { getRepo } from "@/lib/repo";
import { getUserByEmail } from "@/lib/db/queries/accounts";

/**
 * Login STAF (Tahap 3) — diverifikasi terhadap `users.platform_role`
 * Postgres, BUKAN lagi `Client.isStaff` JSON (menyelesaikan catatan
 * eksplisit Tahap 2 di requireStaff(): "menyatukan sesi dengan tabel
 * users adalah pekerjaan Tahap 3"). `/admin/*` sekarang staf-saja —
 * klien pindah ke /app/login (lib/clientAuth.ts).
 *
 * Cookie sesi yang diterbitkan TETAP {clientId, exp} lewat
 * createSessionToken() lama — 22 rute CMS Postgres Tahap 2 (requireStaff)
 * masih mengandalkan bentuk itu, merombaknya bukan cakupan Langkah 1.
 * clientId dijembatani lewat email (pola sama Tahap 2: cari Client JSON
 * ber-email sama). Staf BARU yang belum tersinkron ke Client JSON —
 * belum mungkin terjadi (belum ada UI buat staf baru) — ditolak jelas,
 * bukan diam-diam gagal di requireStaff() nanti.
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

  // Pesan error disatukan (bukan "email tidak ditemukan"/"password
  // salah"/"bukan staf" terpisah) — supaya orang yang coba menebak tidak
  // tahu bagian mana yang sudah benar.
  if (!user || !user.platformRole || !verifyPasswordHash(user.passwordHash, body.password)) {
    return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
  }

  const repo = getRepo();
  const client = await repo.clients.getByEmail(email);
  if (!client) {
    return NextResponse.json(
      { error: "Akun staf ini belum tersinkron ke portal admin — hubungi pengembang." },
      { status: 500 }
    );
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
