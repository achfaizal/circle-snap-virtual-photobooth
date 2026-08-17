/**
 * Sesi & hasil — BRD dok 03 §6. Fondasi Tahap 4 (D-28/D-16) yang sengaja
 * ditunda sejak Tahap 1 ("rewire booth tamu sepenuhnya" — lihat komentar
 * `quota_ledger.session_id` di commercial.ts), lalu ternyata belum
 * dikerjakan juga di Tahap 3 (yang cuma menyambungkan BACA snapshot +
 * klaim kuota, bukan menulis baris sesi/strip). Dibangun sekarang
 * sebagai prasyarat moderasi Momen 1-klik & retensi-hapus media.
 *
 * `quota_ledger.session_id` TETAP bukan foreign key ke tabel ini — baris
 * `quota_ledger` lama (uji regresi Tahap 1/3, event nyata yang sudah
 * publish) punya `session_id` acak yang tidak pernah jadi baris di sini.
 * Menambah FK sekarang gagal migrasi karena referensi yatim.
 *
 * Dua deviasi disengaja dari dok 03 §6.2 `strips` (pola sama
 * `frames.blurb`/`templates.previewed_at` Tahap 1/2, dicatat di rencana
 * Tahap 4):
 * 1. `image_asset_id` DILONGGARKAN nullable (dok 03 menandainya wajib) —
 *    baris `strips` harus bisa ada SEBELUM gambar selesai terunggah
 *    (dok 07 §8: retry 3x, tamu tetap dapat struk kalau gagal).
 * 2. Kolom baru `upload_status` (`pending|uploaded|failed`) — dok 07 §8
 *    mensyaratkan status ini tapi skema resmi dok 03 tidak menyediakan
 *    kolomnya.
 */
import {
  boolean,
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
import { users } from "./identity";
import { assets, frames } from "./templates";
import { events } from "./events";

export const sessionStatusEnum = pgEnum("session_status", [
  "in_progress",
  "completed",
  "abandoned",
  "rejected",
]);
export const sessionRejectReasonEnum = pgEnum("session_reject_reason", [
  "quota_empty",
  "event_closed",
  "expired",
]);
export const stripUploadStatusEnum = pgEnum("strip_upload_status", ["pending", "uploaded", "failed"]);

const baseColumns = {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
};

export const sessions = pgTable(
  "sessions",
  {
    // TANPA .defaultRandom() — id sesi SELALU dipasok pemanggil (sama
    // dengan sessionId yang sudah dikirim ke /api/quota/claim sebagai
    // kunci idempoten, dok 03 §6.1). Insert tanpa id eksplisit adalah
    // bug pemanggil, bukan sesuatu yang boleh diam-diam "diperbaiki"
    // lewat id acak baru.
    id: uuid("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id),
    guestName: varchar("guest_name", { length: 60 }),
    frameId: uuid("frame_id")
      .notNull()
      .references(() => frames.id),
    deviceHint: jsonb("device_hint"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    status: sessionStatusEnum("status").notNull(),
    rejectReason: sessionRejectReasonEnum("reject_reason"),
    retakeCount: integer("retake_count").notNull().default(0),
  },
  (table) => [index("sessions_event_idx").on(table.eventId)]
);

export const strips = pgTable(
  "strips",
  {
    ...baseColumns,
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id),
    // Denormalisasi disengaja (dok 03 §6.2: "untuk kecepatan galeri") —
    // menghindari join ke sessions tiap kali galeri di-render.
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id),
    receiptNo: varchar("receipt_no", { length: 24 }).notNull(),
    imageAssetId: uuid("image_asset_id").references(() => assets.id), // nullable — lihat deviasi #1 di komentar berkas
    videoAssetId: uuid("video_asset_id").references(() => assets.id),
    variableSnapshot: jsonb("variable_snapshot").notNull(),
    filterId: varchar("filter_id", { length: 24 }).notNull(),
    isHidden: boolean("is_hidden").notNull().default(false),
    hiddenByUserId: uuid("hidden_by_user_id").references(() => users.id),
    hiddenReason: varchar("hidden_reason", { length: 120 }),
    guestDeleteTokenHash: text("guest_delete_token_hash"),
    downloadedCount: integer("downloaded_count").notNull().default(0),
    uploadStatus: stripUploadStatusEnum("upload_status").notNull().default("pending"), // deviasi #2
  },
  (table) => [
    // dok 03 §9 poin 2 — wajib di level DB: unik per acara.
    uniqueIndex("strips_event_receipt_uq").on(table.eventId, table.receiptNo),
    index("strips_event_hidden_idx").on(table.eventId, table.isHidden),
  ]
);

/** Foto mentah per slot — dok 03 §6.3, "supaya strip bisa dirender ulang
    bila bingkai ternyata salah". Ditulis kalau ada waktu (Langkah 5),
    bukan wajib untuk moderasi/retensi (6 butir inti Tahap 4). */
export const stripPhotos = pgTable("strip_photos", {
  ...baseColumns,
  stripId: uuid("strip_id")
    .notNull()
    .references(() => strips.id),
  slotIndex: integer("slot_index").notNull(),
  assetId: uuid("asset_id")
    .notNull()
    .references(() => assets.id),
});

export const voiceNotes = pgTable("voice_notes", {
  ...baseColumns,
  stripId: uuid("strip_id")
    .notNull()
    .references(() => strips.id),
  assetId: uuid("asset_id")
    .notNull()
    .references(() => assets.id),
  durationMs: integer("duration_ms").notNull(),
  transcript: text("transcript"), // disiapkan untuk fitur lanjutan, kosong di rilis 1 (dok 03 §6.4)
});
