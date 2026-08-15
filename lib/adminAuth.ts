/**
 * AUTH ADMIN — fase ini sengaja sederhana (docs/blueprint/04-arsitektur.md
 * bagian 7): cookie session ber-tanda-tangan HMAC (bukan menyimpan
 * password di cookie). Multi-user per-klien, reset password, OAuth —
 * masih menunggu database (Fase 8).
 *
 * Registrasi klien BARU (app/api/admin/register/route.ts) sudah nyata
 * sejak sekarang — password disimpan per-Client (passwordHash, scrypt),
 * dan sesi login membawa `clientId` supaya data (event) bisa dilingkupi
 * per-klien (lihat getSessionClientId). Klien DEMO lama (dibuat sebelum
 * ini ada) tidak punya passwordHash — verifyClientPassword jatuh balik
 * ke satu ADMIN_PASSWORD environment lama, supaya kredensial demo yang
 * sudah dikomunikasikan ke pengguna tidak tiba-tiba berhenti berfungsi.
 *
 * ⚠️ Cookie di app/admin/(protected)/layout.tsx MELINDUNGI HALAMAN, bukan
 * API. Tiap route /api/admin/* wajib memanggil requireAdminSession() (atau
 * getSessionClientId() kalau butuh tahu klien mana) sendiri di baris
 * pertama — layout tidak menjaga route handler.
 */
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getRepo } from "./repo";
import type { Client } from "./models/client";

export const ADMIN_COOKIE_NAME = "circlesnap_admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 hari

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

/** Bandingan tahan-timing-attack, tapi tetap aman kalau panjangnya beda
    (timingSafeEqual melempar error untuk panjang berbeda, bukan false). */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

interface SessionPayload {
  clientId: string;
  exp: number;
}

export function createSessionToken(clientId: string): string {
  const payload: SessionPayload = { clientId, exp: Date.now() + SESSION_TTL_MS };
  const encoded = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

/** Dekode + verifikasi tanda tangan DAN kadaluwarsa — dipakai internal
    oleh requireAdminSession()/getSessionClientId(). `clientId` bisa
    hilang (undefined) untuk token lama yang diterbitkan SEBELUM field
    ini ada (format cuma {exp}) — pemanggil yang butuh clientId wajib
    memperlakukan itu sebagai "tidak diketahui", bukan diam-diam
    dianggap klien tertentu. */
function decodeSession(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return null;
  if (!safeEqual(sig, sign(encoded))) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8")) as Partial<SessionPayload>;
    if (typeof payload.exp !== "number" || payload.exp <= Date.now()) return null;
    return { clientId: payload.clientId ?? "", exp: payload.exp };
  } catch {
    return null;
  }
}

function verifySessionToken(token: string | undefined | null): boolean {
  return decodeSession(token) !== null;
}

/** Password lama, satu untuk semua klien demo — dipertahankan HANYA
    sebagai fallback klien tanpa passwordHash (lihat verifyClientPassword). */
export function verifyPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return safeEqual(password, expected);
}

/** scrypt (bawaan Node, tanpa dependency baru) — format tersimpan
    "saltHex:hashHex". Dipanggil sekali saat registrasi
    (app/api/admin/register/route.ts). */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/** Bandingan generik terhadap hash format "salt:hash" hex (scrypt) —
    dipisah dari verifyClientPassword supaya lib/clientAuth.ts (sesi
    /app/*, Tahap 3) dan verifikasi users.password_hash (login staf,
    juga Tahap 3) bisa dipakai ulang tanpa butuh bentuk `Client` JSON. */
export function verifyPasswordHash(hash: string | null | undefined, password: string): boolean {
  if (!hash) return false;
  const [salt, storedHash] = hash.split(":");
  if (!salt || !storedHash) return false;
  const attempt = scryptSync(password, salt, 64).toString("hex");
  const bufA = Buffer.from(attempt, "hex");
  const bufB = Buffer.from(storedHash, "hex");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Klien BARU (punya passwordHash) diverifikasi terhadap hash miliknya
    sendiri. Klien LAMA (passwordHash kosong, mis. cli_demo) jatuh balik
    ke satu ADMIN_PASSWORD environment — lihat catatan di atas file. */
export function verifyClientPassword(client: Client, password: string): boolean {
  if (!client.passwordHash) return verifyPassword(password);
  return verifyPasswordHash(client.passwordHash, password);
}

/** Dipanggil di baris pertama tiap route /api/admin/* yang TIDAK perlu
    tahu klien mana yang login (mis. cek sesi generik) — lihat catatan
    di atas kenapa penjagaan layout saja tidak cukup. Untuk route yang
    perlu tahu klien mana, pakai getSessionClientId() di bawah (itu
    sudah termasuk cek validitas sesi). */
export async function requireAdminSession(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(ADMIN_COOKIE_NAME)?.value);
}

/** Sesi valid TAPI clientId kosong ("") = token lama pra-multi-klien —
    diperlakukan sebagai tidak-terautentikasi oleh pemanggil yang perlu
    tahu klien (lebih aman daripada menebak), bukan error keras: user
    tinggal Keluar+Masuk ulang sekali, dapat token baru yang lengkap. */
export async function getSessionClientId(): Promise<string | null> {
  const store = await cookies();
  const session = decodeSession(store.get(ADMIN_COOKIE_NAME)?.value);
  if (!session || !session.clientId) return null;
  return session.clientId;
}

/**
 * Gerbang staf untuk route /api/admin/* BARU yang baca-tulis Postgres
 * (Tahap 2 — lib/db/*, bukan lib/repo/json-file.ts lama). Dipakai di
 * baris pertama route handler, sama pola dengan requireAdminSession().
 *
 * Sengaja MASIH pakai sesi JSON (Client.isStaff), BUKAN users.platform_role
 * dari tabel identitas Tahap 1 — menyatukan sesi dengan tabel `users`
 * adalah pekerjaan Tahap 3 (pindah rute ke /app/*), bukan disebut sama
 * sekali di 5 butir Tahap 2 (docs/BRD/09-DELTA-DARI-IMPLEMENTASI.md §5).
 *
 * 401 kalau belum login sama sekali, 403 kalau login tapi bukan staf —
 * pola yang sama dipakai app/api/admin/frames/route.ts.
 */
export async function requireStaff(): Promise<Client | NextResponse> {
  const clientId = await getSessionClientId();
  if (!clientId) {
    return NextResponse.json({ error: "Belum masuk." }, { status: 401 });
  }
  const client = await getRepo().clients.getById(clientId);
  if (!client) {
    return NextResponse.json({ error: "Belum masuk." }, { status: 401 });
  }
  if (!client.isStaff) {
    return NextResponse.json(
      { error: "Halaman ini khusus staf Circle Snap." },
      { status: 403 }
    );
  }
  return client;
}

/** Fase satu-klien lama: email dicek nyata terhadap data Client
    tersimpan (repo.clients.getByEmail), tapi TIDAK dipakai lagi oleh
    login route (sekarang perlu Client utuh untuk verifyClientPassword) —
    dipertahankan cuma untuk pemanggil lama yang cuma butuh tahu email
    terdaftar atau tidak. */
export async function verifyEmail(email: string): Promise<boolean> {
  const repo = getRepo();
  const client = await repo.clients.getByEmail(email.trim());
  return client !== null;
}
