import { index, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { accounts, users } from "./identity";

/**
 * Langkah 10 Tahap 4 — dok 03 §8.1, AB-22. Sama filosofi dengan
 * `quota_ledger` (commercial.ts): jurnal APPEND-ONLY, TIDAK ADA
 * `updated_at` sengaja — mengubah baris audit setelah tercatat
 * meniadakan gunanya sebagai bukti.
 *
 * `actor_ip` disimpan sebagai `text`, BUKAN tipe `inet` native Postgres —
 * drizzle-orm/pg-core tidak menyediakan tipe kolom `inet` bawaan, dan di
 * sini cuma dipakai untuk DITAMPILKAN di halaman jejak audit (dok 04
 * §12), bukan untuk kueri jaringan (mis. pencocokan CIDR) yang
 * sungguhan butuh tipe inet asli.
 */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    actorIp: text("actor_ip"),
    accountId: uuid("account_id").references(() => accounts.id),
    action: varchar("action", { length: 60 }).notNull(), // "event.publish", "order.verify", dst — dok 03 §8.1
    entityType: varchar("entity_type", { length: 40 }).notNull(),
    entityId: uuid("entity_id").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    reason: text("reason"), // wajib aplikasi untuk tindakan sensitif — tidak ditegakkan di DB
  },
  (table) => [
    index("audit_logs_account_created_idx").on(table.accountId, table.createdAt),
    index("audit_logs_actor_idx").on(table.actorUserId),
    index("audit_logs_action_idx").on(table.action),
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
  ]
);
