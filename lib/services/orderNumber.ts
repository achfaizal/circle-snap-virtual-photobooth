/**
 * Nomor pesanan — dok 02 §4.2: "unik, CS-2608-0001, dipakai di percakapan".
 * Format: CS-{YYMM}-{urutan 4 digit dalam bulan itu}.
 */
import { count } from "drizzle-orm";
import { db } from "../db/client";
import { orders } from "../db/schema";

export async function nextOrderNumber(now = new Date()): Promise<string> {
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `CS-${yy}${mm}-`;

  // Perkiraan urutan dari total baris orders — cukup untuk keterbacaan
  // manusia ("dipakai di percakapan"), BUKAN kunci unik sesungguhnya;
  // keunikan sungguhan dijaga oleh UNIQUE constraint orders.number di
  // DB (kalau tabrakan, pemanggil boleh coba lagi).
  const [{ value }] = await db.select({ value: count() }).from(orders);
  const sequence = String(value + 1).padStart(4, "0");
  return `${prefix}${sequence}`;
}

/** Nominal unik (dok 02 §4.3): total + 3 digit acak, supaya mutasi bank
    gampang dicocokkan manual. */
export function withUniqueSuffix(totalIdr: number): number {
  const suffix = Math.floor(Math.random() * 900) + 100; // 100-999
  return totalIdr + suffix;
}
