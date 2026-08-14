/**
 * Satu-satunya tempat proses aplikasi (DAN skrip DML di scripts/*.ts)
 * membuka koneksi ke Postgres. Jangan `new Pool()` di tempat lain — pool
 * ini dipakai bersama supaya tidak membuka koneksi baru di setiap
 * request (Next.js App Router bisa memuat modul ini berkali-kali di
 * dev/HMR, makanya pool disimpan di `globalThis`).
 *
 * ⚠️ Sengaja pakai `DATABASE_RUNTIME_URL` (role `app_runtime`), BUKAN
 * `DATABASE_URL` (role pemilik skema) — Langkah 8 rencana Tahap 1, K2:
 * `app_runtime` tidak punya hak `UPDATE`/`DELETE` di `quota_ledger`
 * (lihat lib/db/roles.sql). Kalau modul ini diam-diam dibalik ke
 * `DATABASE_URL`, K2 cuma jadi disiplin kode lagi — persis yang
 * dilarang instruksi Tahap 1.
 *
 * `drizzle-kit` (DDL/migrasi) TIDAK lewat sini — itu perlu hak bentuk-
 * tabel yang justru sengaja tidak dimiliki `app_runtime`. Jalurnya
 * terpisah lewat `drizzle.config.ts` + `lib/db/env.ts`, memakai
 * `DATABASE_URL` (role pemilik skema).
 */
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __circlesnapPgPool: Pool | undefined;
}

function getPool(): Pool {
  const connectionString = process.env.DATABASE_RUNTIME_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_RUNTIME_URL tidak ada di environment. Isi di .env.local (dev) atau " +
        "env var Vercel (production) — lihat Langkah 8 di rencana Tahap 1 (lib/db/roles.sql)."
    );
  }

  if (!globalThis.__circlesnapPgPool) {
    globalThis.__circlesnapPgPool = new Pool({ connectionString });
  }
  return globalThis.__circlesnapPgPool;
}

export const db = drizzle(getPool(), { schema });
