/**
 * Kueri identitas klien (users/accounts/account_members) — Tahap 3.
 * Dipakai lib/clientAuth.ts (sesi /app/*) dan rute /app/* (Langkah 2+).
 */
import { createHash, randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../client";
import { accountMembers, accounts, users } from "../schema/identity";

// Bukan angka dari BRD (dok05 cuma menyebut 60 menit untuk LUPA PASSWORD,
// bukan verifikasi email) — 24 jam dipilih sebagai default wajar untuk
// link mode-dev yang ditampilkan langsung di layar, bukan dikirim email
// sungguhan.
const EMAIL_VERIFICATION_TTL_MS = 1000 * 60 * 60 * 24;

export type AccountRole = "owner" | "manager" | "operator";
export type AccountType = "personal" | "vendor";

export interface AccountMembership {
  userId: string;
  accountId: string;
  role: AccountRole;
  accountType: AccountType;
}

/**
 * Keanggotaan akun AKTIF pertama milik user — fase ini sengaja ambil
 * SATU (belum ada UI pindah-akun/multi-akun sekaligus, D-08/D-09 Tahap 5).
 * Kalau nanti satu user bisa jadi anggota beberapa akun, ini titik yang
 * perlu diperluas (switcher akun), bukan dianggap bug sekarang.
 */
export async function getActiveMembershipByUserId(userId: string): Promise<AccountMembership | null> {
  const rows = await db
    .select({
      userId: accountMembers.userId,
      accountId: accountMembers.accountId,
      role: accountMembers.role,
      accountType: accounts.type,
    })
    .from(accountMembers)
    .innerJoin(accounts, eq(accounts.id, accountMembers.accountId))
    .where(and(eq(accountMembers.userId, userId), eq(accountMembers.status, "active")))
    .limit(1);
  return rows[0] ?? null;
}

export async function getUserByEmail(email: string) {
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return rows[0] ?? null;
}

export async function getUserById(userId: string) {
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return rows[0] ?? null;
}

export async function getAccountById(accountId: string) {
  const rows = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
  return rows[0] ?? null;
}

/**
 * Verifikasi email minimal — koreksi 15 Agu 2026 (Tahap 3): jawaban
 * sebelumnya "anggap otomatis terverifikasi" DIBATALKAN pemilik produk,
 * diganti alur token sungguhan. Tidak ada SMTP — token ditampilkan
 * langsung di /app/verify-email (mode dev), bukan dikirim email.
 *
 * Hash SHA-256 disimpan di DB (bukan token mentah), pola sama
 * account_invites.tokenHash — token mentah HANYA ada di respons fungsi
 * ini sekali, tidak bisa diambil ulang dari hash. Memanggil fungsi ini
 * lagi menerbitkan token BARU dan membatalkan yang lama (cukup untuk
 * mode dev, bukan multi-link aktif sekaligus).
 */
export async function createEmailVerificationToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);
  await db
    .update(users)
    .set({ emailVerificationTokenHash: tokenHash, emailVerificationExpiresAt: expiresAt })
    .where(eq(users.id, userId));
  return token;
}

export type VerifyEmailTokenResult = { ok: true } | { ok: false; reason: "invalid" | "expired" };

export async function verifyEmailToken(token: string): Promise<VerifyEmailTokenResult> {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const [user] = await db.select().from(users).where(eq(users.emailVerificationTokenHash, tokenHash));
  if (!user) return { ok: false, reason: "invalid" };
  if (!user.emailVerificationExpiresAt || user.emailVerificationExpiresAt.getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }
  await db
    .update(users)
    .set({ emailVerifiedAt: new Date(), emailVerificationTokenHash: null, emailVerificationExpiresAt: null })
    .where(eq(users.id, user.id));
  return { ok: true };
}
