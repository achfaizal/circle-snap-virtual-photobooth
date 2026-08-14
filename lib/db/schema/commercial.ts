/**
 * Pesanan & buku besar kuota — BRD dok 02 §3.3 (`quota_ledger`) & §4.2
 * (`orders`), dirangkum ulang di dok 03 §7.
 *
 * K2 (AB-03) INTI di berkas ini: `quota_ledger` HANYA `INSERT`. Skema di
 * sini menyiapkan bentuknya (index unik parsial `idempotency_key`,
 * TIDAK ADA `updated_at` — tabel ini bukan tempat sesuatu di-"update",
 * koreksi selalu baris baru). Pencabutan hak `UPDATE`/`DELETE` dari role
 * `app_runtime` ada di lib/db/roles.sql — TIDAK bisa dinyatakan lewat
 * Drizzle schema (itu izin di level role Postgres, bukan bentuk tabel).
 *
 * `quota_ledger.session_id` SENGAJA kolom uuid biasa, BUKAN foreign key
 * ke tabel `sessions` — `sessions`/`strips`/`strip_photos`/`voice_notes`
 * di luar cakupan Tahap 1 (lihat rencana Langkah 9), rewire booth tamu
 * sepenuhnya itu Tahap 3.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { accounts, users } from "./identity";
import { packages } from "./catalog";
import { assets } from "./templates";
import { events } from "./events";

export const orderStatusEnum = pgEnum("order_status", [
  "draft",
  "awaiting_payment",
  "paid",
  "fulfilled",
  "cancelled",
  "expired",
  "refunded",
]);
export const paymentMethodEnum = pgEnum("payment_method", ["manual_transfer", "qris", "va", "card"]);
export const quotaLedgerEntryTypeEnum = pgEnum("quota_ledger_entry_type", [
  "purchase",
  "allocation",
  "deallocation",
  "consumption",
  "return_on_end",
  "forfeit",
  "expiry",
  "adjustment",
  "refund_reversal",
]);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
    number: varchar("number", { length: 20 }).notNull().unique(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id),
    packageId: uuid("package_id")
      .notNull()
      .references(() => packages.id),
    // P-02: seluruh nilai paket saat dibeli, dibekukan — paket boleh
    // berubah belakangan, pesanan lama TIDAK ikut berubah.
    packageSnapshot: jsonb("package_snapshot").notNull(),
    targetEventId: uuid("target_event_id").references(() => events.id),
    strips: integer("strips").notNull(),
    subtotalIdr: bigint("subtotal_idr", { mode: "number" }).notNull(),
    discountIdr: bigint("discount_idr", { mode: "number" }).notNull().default(0),
    voucherCode: varchar("voucher_code", { length: 32 }),
    totalIdr: bigint("total_idr", { mode: "number" }).notNull(),
    status: orderStatusEnum("status").notNull().default("draft"),
    paymentMethod: paymentMethodEnum("payment_method").notNull(),
    paymentRef: varchar("payment_ref", { length: 80 }),
    proofAssetId: uuid("proof_asset_id").references(() => assets.id),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    verifiedByUserId: uuid("verified_by_user_id").references(() => users.id),
    expiresAt: timestamp("expires_at", { withTimezone: true })
      .notNull()
      .default(sql`(now() + interval '48 hours')`),
    notesInternal: text("notes_internal"),
  },
  (table) => [
    // dok 03 §9 poin 7 — wajib di level DB: orders.total_idr >= 0.
    check("orders_total_idr_check", sql`${table.totalIdr} >= 0`),
  ]
);

export const quotaLedger = pgTable(
  "quota_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // TIDAK ADA updated_at di sini secara sengaja — lihat komentar berkas.
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id),
    // null = pergerakan di dompet (bukan di acara mana pun).
    eventId: uuid("event_id").references(() => events.id),
    entryType: quotaLedgerEntryTypeEnum("entry_type").notNull(),
    strips: integer("strips").notNull(), // positif = masuk, negatif = keluar
    balanceAfter: integer("balance_after").notNull(),
    orderId: uuid("order_id").references(() => orders.id),
    sessionId: uuid("session_id"), // lihat komentar berkas — bukan FK
    actorUserId: uuid("actor_user_id").references(() => users.id),
    reason: text("reason"), // wajib untuk 'adjustment' — ditegakkan aplikasi
    idempotencyKey: varchar("idempotency_key", { length: 64 }),
  },
  (table) => [
    // dok 03 §9 poin 3 — wajib di level DB: unik PARSIAL, bukan unik penuh
    // (banyak baris boleh punya idempotency_key NULL sekaligus).
    uniqueIndex("quota_ledger_idempotency_key_uq")
      .on(table.idempotencyKey)
      .where(sql`${table.idempotencyKey} IS NOT NULL`),
  ]
);
