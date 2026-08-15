import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/adminAuth";
import { CLIENT_COOKIE_NAME, createClientSessionToken } from "@/lib/clientAuth";
import { createEmailVerificationToken, getUserByEmail } from "@/lib/db/queries/accounts";
import { normalizeWhatsapp } from "@/lib/phone";
import { slugify } from "@/lib/slug";
import { db } from "@/lib/db/client";
import { users, accounts, accountMembers } from "@/lib/db/schema/identity";

interface RegisterBody {
  name?: string;
  email?: string;
  password?: string;
  mode?: "personal" | "vendor";
  whatsapp?: string;
  businessName?: string;
}

/**
 * Pendaftaran klien BARU (Tahap 3, Postgres) — pengganti
 * app/api/admin/register/route.ts (JSON, dipensiunkan Langkah 11).
 * Satu langkah membuat 3 baris: `users` (identitas login), `accounts`
 * (`type` dari `mode`), `account_members` (role='owner' — pendaftar
 * SELALU jadi owner pertama akunnya, dok 01 §1: "anggotanya selalu
 * satu orang dengan peran owner" untuk akun baru).
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as RegisterBody | null;
  if (!body) return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const mode = body.mode;
  const businessName = body.businessName?.trim() ?? "";

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Nama, email, dan password wajib diisi." }, { status: 400 });
  }
  if (mode !== "personal" && mode !== "vendor") {
    return NextResponse.json({ error: "Pilih dulu kamu daftar sebagai apa." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password minimal 8 karakter." }, { status: 400 });
  }
  if (!email.includes("@") || !email.includes(".")) {
    return NextResponse.json({ error: "Format email tidak valid." }, { status: 400 });
  }

  // WhatsApp WAJIB — tanpa nomor ini staf tidak punya cara membalas
  // klien yang mengirim bukti transfer (dok 04 §7).
  const whatsapp = normalizeWhatsapp(body.whatsapp ?? "");
  if (!whatsapp) {
    return NextResponse.json(
      { error: "Nomor WhatsApp tidak valid. Contoh: 0812-3456-7890." },
      { status: 400 }
    );
  }

  // Vendor menjual atas nama usaha; nama PIC saja tidak cukup untuk
  // tagihan maupun daftar klien di panel staf.
  if (mode === "vendor" && !businessName) {
    return NextResponse.json({ error: "Nama usaha/EO wajib diisi." }, { status: 400 });
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "Email ini sudah terdaftar. Coba masuk." }, { status: 409 });
  }

  const displayName = mode === "vendor" ? businessName : name;
  const slug = await uniqueSlug(displayName || email);

  const [userRow] = await db
    .insert(users)
    .values({
      email,
      passwordHash: hashPassword(password),
      fullName: name,
      phoneWa: `+${whatsapp}`,
      // Koreksi 15 Agu 2026: TIDAK lagi otomatis terverifikasi.
      // emailVerifiedAt tetap NULL sampai token sungguhan diverifikasi
      // lewat /app/verify-email — lihat createEmailVerificationToken().
    })
    .returning({ id: users.id });

  // Token dibuat SAAT REGISTRASI (bukan ditunda sampai user membuka
  // /app/verify-email) — sesuai permintaan eksplisit, walau raw token-nya
  // di sini tidak dipakai (halaman verifikasi menerbitkan token baru
  // saat dibuka, lihat catatan "tidak bisa diambil ulang dari hash" di
  // createEmailVerificationToken()). Baris ini murni memenuhi "token
  // dibuat saat registrasi" sebagai jejak nyata di DB sejak akun lahir.
  await createEmailVerificationToken(userRow.id);

  const [accountRow] = await db
    .insert(accounts)
    .values({
      type: mode,
      displayName,
      slug,
      businessName: mode === "vendor" ? businessName : null,
    })
    .returning({ id: accounts.id, type: accounts.type });

  await db.insert(accountMembers).values({
    accountId: accountRow.id,
    userId: userRow.id,
    role: "owner",
    status: "active",
  });

  const res = NextResponse.json(
    { ok: true, account: { id: accountRow.id, type: accountRow.type } },
    { status: 201 }
  );
  // Langsung masuk (bukan minta login ulang) — sama seperti alur
  // pendaftaran /admin/register lama.
  res.cookies.set(CLIENT_COOKIE_NAME, createClientSessionToken(userRow.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

/** Tabrakan slug ditangani dengan sufiks acak pendek — sama pola dengan
    scripts/migrate-clients-events.ts, bukan menolak pendaftaran cuma
    karena dua usaha kebetulan mirip namanya. */
async function uniqueSlug(input: string): Promise<string> {
  const base = slugify(input) || "akun";
  let candidate = base;
  for (let i = 0; i < 5; i++) {
    const [row] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.slug, candidate)).limit(1);
    if (!row) return candidate;
    candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${base}-${Date.now()}`;
}
