import { NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/clientAuth";
import { createEmailVerificationToken, verifyEmailToken } from "@/lib/db/queries/accounts";

/**
 * Verifikasi email minimal (koreksi 15 Agu 2026, menggantikan "anggap
 * otomatis terverifikasi") — TIDAK ADA SMTP, link ditampilkan langsung
 * di /app/verify-email (mode dev), sama pola dengan bukti transfer
 * manual yang "dev-lokal saja".
 *
 * GET  ?token=... — INI link yang diklik (dari halaman verifikasi),
 *      menandai emailVerifiedAt lalu redirect balik dengan status.
 * POST — dipanggil halaman /app/verify-email untuk MENERBITKAN token
 *      baru bagi user yang sedang login (bukan aksi akun, jadi cukup
 *      sesi valid — bukan requireAccountRole yang mengecek peran akun).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/app/verify-email?status=invalid", url.origin));
  }

  const result = await verifyEmailToken(token);
  const status = result.ok ? "success" : result.reason; // "invalid" | "expired"
  return NextResponse.redirect(new URL(`/app/verify-email?status=${status}`, url.origin));
}

export async function POST(request: Request) {
  const session = await getSessionAccount();
  if (!session) {
    return NextResponse.json({ error: "Belum masuk." }, { status: 401 });
  }

  const token = await createEmailVerificationToken(session.userId);
  const url = new URL(request.url);
  const verifyUrl = `${url.origin}/api/app/verify-email?token=${token}`;
  return NextResponse.json({ ok: true, verifyUrl });
}
