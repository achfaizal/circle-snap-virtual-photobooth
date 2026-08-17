import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Langkah 16 Tahap 4 — dok 03 §8.4 "satu baris key-value bertipe,
 * diubah hanya oleh Super Admin". Cuma `retention_days_after_end`
 * yang diisi & dipakai nyata di Tahap 4 (dibutuhkan Langkah 17/18) —
 * 7 key lain di dok 03 §8.4 (`order_expiry_hours` dkk.) TIDAK
 * dikerjakan sekarang: itu berarti mengganti konstanta hardcode yang
 * sudah dipakai di banyak tempat (`orders.expiresAt` default 48 jam,
 * dst.), pekerjaan tersendiri di luar 6 butir Tahap 4. Dicatat, bukan
 * diam-diam dilewati.
 */
export const systemSettings = pgTable("system_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
