/**
 * Katalog dikelola admin — BRD dok 03 §3.1 (`event_categories`) dan
 * dok 02 §2.1 (`packages`). "Paket sepenuhnya dikelola admin lewat CMS.
 * Tidak ada harga yang ditulis di kode." (dok 02 §2) — makanya Langkah 3
 * rencana Tahap 1 memindahkan isi lib/services/eventKind.ts dan
 * lib/services/planCatalog.ts ke sini lewat skrip sekali-jalan, bukan
 * menyalinnya sebagai konstanta baru di tempat lain.
 */
import {
  bigint,
  boolean,
  check,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const eventCategoryStatusEnum = pgEnum("event_category_status", ["active", "archived"]);
export const packageAudienceEnum = pgEnum("package_audience", ["personal", "vendor", "both"]);
export const packageAllocationModeEnum = pgEnum("package_allocation_mode", [
  "single_event",
  "flexible",
]);
export const packageTemplateScopeEnum = pgEnum("package_template_scope", ["all", "selected"]);
export const packageStatusEnum = pgEnum("package_status", ["draft", "published", "archived"]);

const baseColumns = {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
};

export const eventCategories = pgTable("event_categories", {
  ...baseColumns,
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 60 }).notNull(),
  description: varchar("description", { length: 140 }),
  icon: varchar("icon", { length: 40 }),
  defaultGreeting: text("default_greeting"),
  defaultBrandLabel: varchar("default_brand_label", { length: 40 }),
  sortOrder: integer("sort_order").notNull(),
  status: eventCategoryStatusEnum("status").notNull().default("active"),
  // Kategori tidak boleh dihapus keras kalau masih dipakai acara/template
  // (dok 03 §3.1) — diarsipkan lewat `status`, bukan DELETE. Ditegakkan
  // di lapisan aplikasi (belum ada FK yang membuat DELETE gagal sendiri
  // di Langkah 3 ini, karena events/templates baru dibuat Langkah 4/6).
});

export const packages = pgTable(
  "packages",
  {
    ...baseColumns,
    code: varchar("code", { length: 32 }).notNull().unique(),
    name: varchar("name", { length: 80 }).notNull(),
    tagline: varchar("tagline", { length: 140 }),
    audience: packageAudienceEnum("audience").notNull(),
    allocationMode: packageAllocationModeEnum("allocation_mode").notNull(),
    strips: integer("strips").notNull(),
    minStrips: integer("min_strips"),
    priceIdr: bigint("price_idr", { mode: "number" }).notNull(),
    activeDays: integer("active_days").notNull().default(7),
    maxEvents: integer("max_events"),
    maxVoiceSeconds: integer("max_voice_seconds").notNull().default(15),
    allowCustomFrame: boolean("allow_custom_frame").notNull().default(true),
    allowGallery: boolean("allow_gallery").notNull().default(true),
    allowVideoCard: boolean("allow_video_card").notNull().default(true),
    maxOperators: integer("max_operators"),
    templateScope: packageTemplateScopeEnum("template_scope").notNull().default("all"),
    templateIds: uuid("template_ids").array(),
    walletValidMonths: integer("wallet_valid_months").notNull().default(12),
    isTopup: boolean("is_topup").notNull().default(false),
    sortOrder: integer("sort_order").notNull(),
    status: packageStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (table) => [
    // dok 03 §9 poin 7 — wajib di level DB: packages.strips >= 1.
    check("packages_strips_check", sql`${table.strips} >= 1`),
    // Bukan bagian daftar §9, tapi field ini punya aturan "≥ 0"/"≥ 1"
    // sendiri di dok 02 §2.1 — ditegakkan juga di DB, bukan cuma catatan.
    check("packages_price_idr_check", sql`${table.priceIdr} >= 0`),
    check(
      "packages_min_strips_check",
      sql`${table.minStrips} IS NULL OR ${table.minStrips} >= 1`
    ),
    check(
      "packages_active_days_check",
      sql`${table.activeDays} BETWEEN 1 AND 90`
    ),
    check(
      "packages_max_voice_seconds_check",
      sql`${table.maxVoiceSeconds} BETWEEN 0 AND 60`
    ),
    // P-04: audience=personal wajib allocation_mode=single_event DAN
    // max_events=1 — "divalidasi saat simpan, bukan diserahkan ke
    // kedisiplinan admin" (dok 02 §2.2). Kombinasi 3 kolom, dituliskan
    // penuh di sini, bukan ditunda ke lapisan aplikasi.
    check(
      "packages_p04_personal_single_event_check",
      sql`${table.audience} <> 'personal' OR (${table.allocationMode} = 'single_event' AND ${table.maxEvents} = 1)`
    ),
  ]
);
