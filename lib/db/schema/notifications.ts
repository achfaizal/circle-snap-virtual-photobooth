import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { accounts, users } from "./identity";

/**
 * Langkah 13 Tahap 4 — dok 03 §8.2-8.3, D-15. Beda dari `audit_logs`/
 * `quota_ledger` (append-only): baris ini DIUBAH (`read_at` terisi saat
 * tamu klik) — punya `updated_at` seperti tabel biasa.
 *
 * dok 03 §8.3 mendaftar 12 jenis notifikasi. Enum `type` di bawah
 * menampung SEMUANYA (jsonb-safe untuk masa depan), tapi Tahap 4 cuma
 * benar-benar MEMICU `quota.low`/`quota.empty` (Langkah 14) — sisanya
 * disiapkan skemanya, belum ada pemicu kode. Dicatat di rencana Tahap 4
 * Context, bukan diam-diam.
 */
export const notificationTypeEnum = pgEnum("notification_type", [
  "order.awaiting_payment",
  "order.paid",
  "order.expiring",
  "event.published",
  "event.starting_soon",
  "quota.low",
  "quota.empty",
  "event.expiring",
  "event.ended",
  "wallet.expiring",
  "retention.warning",
  "member.invited",
]);

export const notificationChannelEnum = pgEnum("notification_channel", ["in_app", "email", "whatsapp"]);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    accountId: uuid("account_id").references(() => accounts.id),
    type: notificationTypeEnum("type").notNull(),
    title: varchar("title", { length: 120 }).notNull(),
    body: text("body"),
    linkUrl: varchar("link_url", { length: 200 }),
    channel: notificationChannelEnum("channel").array().notNull(),
    // Konteks tambahan (mis. eventId/threshold pemicu quota.low) —
    // dok 03 tidak menyebut kolom ini, ditambah untuk idempotensi
    // pemicu (Langkah 14, cek "sudah pernah dikirim untuk ambang yang
    // sama" tanpa mem-parsing `body`).
    meta: jsonb("meta"),
    readAt: timestamp("read_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (table) => [
    index("notifications_user_read_idx").on(table.userId, table.readAt),
    index("notifications_account_type_idx").on(table.accountId, table.type),
  ]
);
