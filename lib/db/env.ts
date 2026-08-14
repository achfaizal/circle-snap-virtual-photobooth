/**
 * Muat `.env.local` secara manual untuk skrip yang jalan DI LUAR proses
 * Next.js (drizzle-kit, `scripts/*.ts` lewat tsx) — Next.js otomatis
 * membaca `.env.local` sendiri, tapi CLI/skrip mandiri tidak.
 *
 * Sengaja tidak pakai paket `dotenv` — cukup format KEY=VALUE sederhana,
 * dan CLAUDE.md melarang menambah dependensi tanpa bertanya dulu.
 * Dipanggil sekali di awal `drizzle.config.ts` dan tiap skrip migrasi.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export function loadEnvLocal(): void {
  const path = join(process.cwd(), ".env.local");
  let raw: string;
  try {
    raw = readFileSync(path, "utf-8");
  } catch {
    return; // tidak ada .env.local — biarkan process.env apa adanya
  }

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // Buang tanda kutip pembungkus kalau ada ("..." atau '...')
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Jangan timpa yang sudah di-set lewat env asli (mis. di Vercel) —
    // .env.local cuma fallback lokal.
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

/** DATABASE_URL wajib ada — gagal jelas di awal, bukan error samar nanti
    di tengah query pertama. */
export function requireDatabaseUrl(): string {
  loadEnvLocal();
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL tidak ditemukan. Isi di .env.local — lihat docs/AUDIT-AWAL.md " +
        "atau rencana Tahap 1 untuk cara menyiapkan Postgres lokal."
    );
  }
  return url;
}
