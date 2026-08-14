/**
 * Aset, bingkai & template — BRD dok 03 §3.2–3.6 (template) dan §4.1
 * (assets). K8: template adalah KELAS, acara adalah INSTANS — tidak ada
 * satu pun tabel di berkas ini yang ditulis lewat operasi klien; semua
 * tulisan klien jatuh ke `event_*` (Langkah 6).
 *
 * Urutan deklarasi mengikuti urutan dependensi FK: assets → frames →
 * templates → template_categories/template_variables/template_frames.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
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

export const assetKindEnum = pgEnum("asset_kind", [
  "frame",
  "cover",
  "decor",
  "logo",
  "avatar",
  "strip",
  "voice",
  "video",
  "payment_proof",
]);
export const assetVisibilityEnum = pgEnum("asset_visibility", ["public", "private"]);
export const frameStatusEnum = pgEnum("frame_status", ["active", "archived"]);
export const templateStatusEnum = pgEnum("template_status", ["draft", "published", "archived"]);
export const templateVariableInputTypeEnum = pgEnum("template_variable_input_type", [
  "text",
  "textarea",
  "date",
  "time",
  "datetime",
  "image",
  "select",
  "toggle",
]);
export const templateVariableUsedInEnum = pgEnum("template_variable_used_in", [
  "welcome",
  "frame",
  "video_card",
  "share",
]);

const baseColumns = {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
};

export const assets = pgTable("assets", {
  ...baseColumns,
  // null = milik sistem (dok 03 §4.1) — sama pola dengan frames.account_id.
  accountId: uuid("account_id").references(() => accounts.id),
  kind: assetKindEnum("kind").notNull(),
  storageKey: text("storage_key").notNull(),
  mime: varchar("mime", { length: 60 }).notNull(),
  bytes: bigint("bytes", { mode: "number" }).notNull(),
  width: integer("width"),
  height: integer("height"),
  durationMs: integer("duration_ms"),
  checksumSha256: varchar("checksum_sha256", { length: 64 }).notNull(),
  visibility: assetVisibilityEnum("visibility").notNull(),
  uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

export const frames = pgTable(
  "frames",
  {
    ...baseColumns,
    // null = bingkai SISTEM milik admin (dok 03 §3.5) — K5: kolom ini
    // ADA sejak baris pertama meski nullable, bukan ditambah belakangan.
    accountId: uuid("account_id").references(() => accounts.id),
    name: varchar("name", { length: 80 }).notNull(),
    // DI LUAR dok 03 §3.5 — dicatat di docs/BRD/09-DELTA-DARI-IMPLEMENTASI.md
    // §7 (14 Agu 2026, v1.1) sebelum ditambahkan. Frame lama (Frame.blurb)
    // dipakai nyata di components/StepFrame.tsx untuk tamu, bukan cuma
    // metadata usang — dihapus berarti kehilangan teks yang sedang dilihat
    // tamu sungguhan.
    blurb: text("blurb"),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    paper: varchar("paper", { length: 9 }).notNull(),
    slots: jsonb("slots").notNull(),
    // K10/AB-18: bertoken ({{names}}, {{date}}, ...), TIDAK PERNAH nama
    // klien tercetak langsung di sini — itu digambar saat compositing.
    textLayers: jsonb("text_layers").notNull(),
    printSize: varchar("print_size", { length: 20 }),
    slotCount: integer("slot_count").notNull(),
    isLocked: boolean("is_locked").notNull(),
    validationReport: jsonb("validation_report"),
    status: frameStatusEnum("status").notNull().default("active"),
  },
  (table) => [
    index("frames_account_status_idx").on(table.accountId, table.status),
    index("frames_slot_count_idx").on(table.slotCount),
    // Field "Aturan" dok 03 §3.5 menyatakan langsung "minimal 1" dan
    // "= slots.length" — ditegakkan di DB, bukan cuma dicatat.
    check("frames_slots_min_one_check", sql`jsonb_array_length(${table.slots}) >= 1`),
    check(
      "frames_slot_count_matches_slots_check",
      sql`${table.slotCount} = jsonb_array_length(${table.slots})`
    ),
  ]
);

export const templates = pgTable("templates", {
  ...baseColumns,
  code: varchar("code", { length: 48 }).notNull().unique(),
  name: varchar("name", { length: 80 }).notNull(),
  tagline: varchar("tagline", { length: 140 }),
  description: text("description"),
  folder: varchar("folder", { length: 80 }).notNull(),
  coverAssetId: uuid("cover_asset_id")
    .notNull()
    .references(() => assets.id),
  previewAssetIds: uuid("preview_asset_ids").array(),
  brandLabel: varchar("brand_label", { length: 40 }).notNull(),
  // 9 token wajib: ink, film, edge, smoke, paper, flash, live,
  // brandPurple, brandGold (dok 03 §3.2) — bentuk jsonb, isinya divalidasi
  // di lapisan aplikasi (bukan CHECK — jsonb key-presence check rapuh
  // terhadap perubahan skema token warna di masa depan).
  themeColors: jsonb("theme_colors").notNull(),
  fontDisplayId: varchar("font_display_id", { length: 40 }).notNull(),
  themeEffects: jsonb("theme_effects"),
  themeElements: jsonb("theme_elements"),
  videoCardTheme: jsonb("video_card_theme").notNull(),
  decorAssetId: uuid("decor_asset_id").references(() => assets.id),
  videoBgAssetId: uuid("video_bg_asset_id").references(() => assets.id),
  sampleData: jsonb("sample_data").notNull(),
  defaultSessionConfig: jsonb("default_session_config").notNull(),
  version: integer("version").notNull().default(1),
  status: templateStatusEnum("status").notNull().default("draft"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  usageCount: integer("usage_count").notNull().default(0),
});

// Junction M:N template↔kategori. Tidak ada aturan "unik" tertulis di
// dok 03 §3.3 atau daftar wajib §9 untuk pasangan ini — pencegahan baris
// dobel disengaja diserahkan ke lapisan aplikasi (CMS Tahap 2), bukan
// ditambah constraint yang tidak diminta BRD.
export const templateCategories = pgTable("template_categories", {
  ...baseColumns,
  templateId: uuid("template_id")
    .notNull()
    .references(() => templates.id),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => eventCategories.id),
  isPrimary: boolean("is_primary").notNull(),
});

export const templateVariables = pgTable(
  "template_variables",
  {
    ...baseColumns,
    templateId: uuid("template_id")
      .notNull()
      .references(() => templates.id),
    key: varchar("key", { length: 40 }).notNull(),
    label: varchar("label", { length: 80 }).notNull(),
    helpText: varchar("help_text", { length: 160 }),
    inputType: templateVariableInputTypeEnum("input_type").notNull(),
    // Wajib bila input_type='select' (dok 03 §3.4) — kombinasi 2 kolom,
    // ditegakkan di lapisan aplikasi (Visual Builder Tahap 3), sama pola
    // dengan two_factor_secret di lib/db/schema/identity.ts.
    options: jsonb("options"),
    sampleValue: text("sample_value"),
    defaultValue: text("default_value"),
    isRequired: boolean("is_required").notNull(),
    maxLength: integer("max_length"),
    usedIn: templateVariableUsedInEnum("used_in").array().notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [
    // dok 03 §9 poin 6 — wajib di level DB: unik (template_id, key).
    uniqueIndex("template_variables_template_key_uq").on(table.templateId, table.key),
  ]
);

export const templateFrames = pgTable("template_frames", {
  ...baseColumns,
  templateId: uuid("template_id")
    .notNull()
    .references(() => templates.id),
  // "wajib bingkai sistem (account_id IS NULL)" (dok 03 §3.6) — tidak
  // diekspresikan lewat FK biasa (butuh trigger lintas-tabel), tidak ada
  // di daftar wajib §9, jadi ditegakkan di lapisan aplikasi (CMS Tahap 2).
  frameId: uuid("frame_id")
    .notNull()
    .references(() => frames.id),
  sortOrder: integer("sort_order").notNull(),
});
