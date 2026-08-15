/**
 * Kueri identitas klien (users/accounts/account_members) — Tahap 3.
 * Dipakai lib/clientAuth.ts (sesi /app/*) dan rute /app/* (Langkah 2+).
 */
import { and, eq } from "drizzle-orm";
import { db } from "../client";
import { accountMembers, accounts, users } from "../schema/identity";

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
