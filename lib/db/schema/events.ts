/**
 * Acara — BRD dok 03 §5.1, §5.4, §5.5. K8: template adalah KELAS, acara
 * adalah INSTANS — tabel-tabel di berkas ini yang jadi tujuan SEMUA
 * tulisan klien (bukan `templates`/`template_*` di lib/db/schema/templates.ts).
 *
 * `event_variable_values` dan `event_frames` dapat kolom `account_id`
 * TAMBAHAN di luar dok 03 §5.4/§5.5 — dok 03 sendiri cukup dengan
 * `event_id` (account_id terbaca lewat join ke `events`), tapi instruksi
 * Tahap 1 menegaskan literal: "setiap tabel data klien wajib punya
 * account_id sejak migrasi pertama" (K5), bukan cuma tabel induknya.
 * Ini penambahan disengaja, bukan salah baca dok 03.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
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
import { eventCategories } from "./catalog";
import { assets, frames, templates } from "./templates";

export const eventStatusEnum = pgEnum("event_status", [
  "draft",
  "live",
  "ended",
  "expired",
  "suspended",
  "archived",
]);
export const eventFrameSourceEnum = pgEnum("event_frame_source", ["template", "custom"]);

const baseColumns = {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
};

export const events = pgTable(
  "events",
  {
    ...baseColumns,
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => eventCategories.id),
    // null selama belum memilih template (dok 03 §5.1).
    templateId: uuid("template_id").references(() => templates.id),
    templateVersion: integer("template_version"),
    // AB-14: dibekukan saat publikasi — acara live TIDAK mengikuti
    // perubahan template setelahnya. Diisi di lapisan aplikasi saat
    // status berubah ke 'live' (Tahap 3), bukan di sini.
    templateSnapshot: jsonb("template_snapshot"),
    internalName: varchar("internal_name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 40 }).notNull().unique(),
    displayNames: varchar("display_names", { length: 120 }),
    dateDisplay: varchar("date_display", { length: 60 }),
    venue: varchar("venue", { length: 160 }),
    hashtag: varchar("hashtag", { length: 60 }),
    greeting: text("greeting"),
    // AB-09: jadwal SUNGGUHAN, bukan tanggal publikasi (K16).
    startsAt: timestamp("starts_at", { withTimezone: true }),
    timezone: varchar("timezone", { length: 40 }).notNull().default("Asia/Jakarta"),
    activeDays: integer("active_days").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    extendedCount: integer("extended_count").notNull().default(0),
    status: eventStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    // §5.3 — validasi "minimal satu tombol unduh menyala" perlu inspeksi
    // isi jsonb bersarang (share.downloadPng/Jpg/Video), terlalu rapuh
    // untuk CHECK; ditegakkan di lapisan aplikasi (Tahap 3).
    sessionConfig: jsonb("session_config").notNull(),
    galleryEnabled: boolean("gallery_enabled").notNull().default(true),
    // K6: privat secara bawaan.
    galleryPublic: boolean("gallery_public").notNull().default(false),
    guestNameRequired: boolean("guest_name_required").notNull().default(true),
    operatorCanEnd: boolean("operator_can_end").notNull().default(false),
    cachedQuota: integer("cached_quota").notNull().default(0),
    cachedConsumed: integer("cached_consumed").notNull().default(0),
    retentionUntil: timestamp("retention_until", { withTimezone: true }),
    suspendedReason: text("suspended_reason"),
  },
  (table) => [
    index("events_account_status_idx").on(table.accountId, table.status),
    index("events_starts_at_idx").on(table.startsAt),
    index("events_expires_at_idx").on(table.expiresAt),
    // dok 03 §9 poin 7 — wajib di level DB: extended_count <= 2 (bawaan
    // 0, jadi batas bawah 0 ikut ditegakkan sekalian, bukan cuma "maks").
    check("events_extended_count_check", sql`${table.extendedCount} BETWEEN 0 AND 2`),
  ]
);

export const eventVariableValues = pgTable(
  "event_variable_values",
  {
    ...baseColumns,
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id),
    // Deviasi K5 — lihat komentar berkas.
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id),
    // Merujuk template_variables.key — BUKAN foreign key sungguhan: dok 03
    // §5.4 tidak menyimpan template_id di tabel ini (dicari lewat join ke
    // events.template_id), dan key hanya unik PER TEMPLATE, bukan global.
    variableKey: varchar("variable_key", { length: 40 }).notNull(),
    valueText: text("value_text"),
    valueAssetId: uuid("value_asset_id").references(() => assets.id),
  },
  (table) => [
    // Dinyatakan langsung di dok 03 §5.4: "Kunci unik (event_id, variable_key)".
    uniqueIndex("event_variable_values_event_key_uq").on(table.eventId, table.variableKey),
  ]
);

export const eventFrames = pgTable(
  "event_frames",
  {
    ...baseColumns,
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id),
    // Deviasi K5 — lihat komentar berkas.
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id),
    frameId: uuid("frame_id")
      .notNull()
      .references(() => frames.id),
    source: eventFrameSourceEnum("source").notNull(),
    isEnabled: boolean("is_enabled").notNull().default(true),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [
    // dok 03 §9 poin 5 — wajib di level DB: unik (event_id, frame_id).
    uniqueIndex("event_frames_event_frame_uq").on(table.eventId, table.frameId),
    // AB-17 ("minimal satu bingkai aktif") BUKAN constraint baris-tunggal
    // — butuh menghitung SEMUA baris is_enabled per event_id, di luar
    // jangkauan CHECK biasa (butuh trigger). Ditegakkan di lapisan
    // aplikasi: "menonaktifkan yang terakhir ditolak" (dok 03 §5.5).
  ]
);
