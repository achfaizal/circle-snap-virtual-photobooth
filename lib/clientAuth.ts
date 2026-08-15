/**
 * AUTH KLIEN (/app/*) — Tahap 3, dok 01 §1-§3. Sesi TERPISAH dari staf
 * (lib/adminAuth.ts, /admin/*) — nama cookie beda, sumber data beda
 * (users/accounts/account_members Postgres, bukan Client JSON). Pola
 * cookie ber-tanda-tangan HMAC sama sengaja dengan lib/adminAuth.ts
 * (sudah teruji, tidak perlu dependency baru) — TIDAK disatukan jadi
 * satu modul karena bentuk sesinya genuinely beda: staf hanya identitas
 * (platform_role tunggal), klien identitas + PERAN PER AKUN yang bisa
 * berubah kapan saja (dok 01 §3.2), sesuai CLAUDE.md §3 tabel rute yang
 * memang memisahkan /admin dan /app.
 *
 * ⚠️ Cookie hanya membawa {userId, exp} — BUKAN accountId/role. Peran
 * selalu diambil ULANG dari DB tiap panggilan (getSessionAccount),
 * bukan dipercaya dari cookie lama — sama alasan requireStaff() di
 * lib/adminAuth.ts re-fetch Client dari repo tiap kali: kalau peran
 * seseorang diubah (Tahap 5, UI undang/keluarkan anggota), efeknya
 * harus langsung berlaku tanpa menunggu re-login.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getActiveMembershipByUserId, type AccountRole } from "./db/queries/accounts";

export type { AccountRole };

export const CLIENT_COOKIE_NAME = "circlesnap_client_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 hari — sama dengan sesi staf

function secret(): string {
  const s = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!s) {
    throw new Error(
      "ADMIN_SESSION_SECRET atau ADMIN_PASSWORD belum diatur di environment (.env.local)."
    );
  }
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

interface ClientSessionPayload {
  userId: string;
  exp: number;
}

export function createClientSessionToken(userId: string): string {
  const payload: ClientSessionPayload = { userId, exp: Date.now() + SESSION_TTL_MS };
  const encoded = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

function decodeSession(token: string | undefined | null): ClientSessionPayload | null {
  if (!token) return null;
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return null;
  if (!safeEqual(sig, sign(encoded))) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8")) as Partial<ClientSessionPayload>;
    if (typeof payload.exp !== "number" || payload.exp <= Date.now()) return null;
    if (!payload.userId) return null;
    return { userId: payload.userId, exp: payload.exp };
  } catch {
    return null;
  }
}

export interface SessionAccount {
  userId: string;
  accountId: string;
  role: AccountRole;
}

/** Dipanggil di app/app/(protected)/layout.tsx untuk gerbang HALAMAN.
    Route /api/app/* wajib panggil requireAccountRole() sendiri di baris
    pertama — layout tidak melindungi route handler (pola sama
    lib/adminAuth.ts). Kosong (null) juga terjadi kalau user valid TAPI
    belum punya keanggotaan akun aktif mana pun (mis. baru dihapus dari
    satu-satunya akunnya) — diperlakukan sebagai "tidak masuk", bukan
    error keras. */
export async function getSessionAccount(): Promise<SessionAccount | null> {
  const store = await cookies();
  const session = decodeSession(store.get(CLIENT_COOKIE_NAME)?.value);
  if (!session) return null;

  const membership = await getActiveMembershipByUserId(session.userId);
  if (!membership) return null;
  return { userId: membership.userId, accountId: membership.accountId, role: membership.role };
}

const ROLE_LEVEL: Record<AccountRole, number> = { operator: 1, manager: 2, owner: 3 };

/** Diekspor terpisah (fungsi murni, tanpa next/headers) supaya bisa
    diuji langsung dari skrip (scripts/test-account-migration.ts) tanpa
    konteks request Next.js — requireAccountRole() di bawah cuma
    membungkusnya dengan sesi+cookie. */
export function roleSatisfies(role: AccountRole, minRole: AccountRole): boolean {
  return ROLE_LEVEL[role] >= ROLE_LEVEL[minRole];
}

/**
 * Gerbang permission dok 01 §3.2 — HIERARKIS (owner ⊇ manager ⊇
 * operator) valid untuk seluruh matriks yang diriset: setiap baris
 * khusus-Owner (billing, undang/keluarkan anggota, hapus akun) memang
 * dipanggil dengan minRole='owner' langsung, bukan "manager + sedikit
 * lagi". 401 belum login, 403 peran kurang — pola sama requireStaff().
 */
export async function requireAccountRole(minRole: AccountRole): Promise<SessionAccount | NextResponse> {
  const session = await getSessionAccount();
  if (!session) {
    return NextResponse.json({ error: "Belum masuk." }, { status: 401 });
  }
  if (!roleSatisfies(session.role, minRole)) {
    return NextResponse.json({ error: "Kamu tidak punya izin untuk melakukan ini." }, { status: 403 });
  }
  return session;
}
