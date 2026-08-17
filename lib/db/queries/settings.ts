import { eq } from "drizzle-orm";
import { db } from "../client";
import { systemSettings } from "../schema/settings";

/** Bawaan AB-21 kalau baris belum di-seed (mis. lingkungan dev baru
    belum jalankan seed) — supaya skrip retensi tidak meledak, cuma
    pakai angka BRD asli sebagai jaring pengaman, bukan hardcode
    dipakai diam-diam menggantikan DB. */
const DEFAULT_RETENTION_DAYS = 90;

export async function getRetentionDaysAfterEnd(): Promise<number> {
  const [row] = await db.select().from(systemSettings).where(eq(systemSettings.key, "retention_days_after_end"));
  if (!row) return DEFAULT_RETENTION_DAYS;
  const value = row.value as number;
  return typeof value === "number" && value > 0 ? value : DEFAULT_RETENTION_DAYS;
}
