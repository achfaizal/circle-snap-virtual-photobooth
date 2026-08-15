/**
 * Tabel identitas — BRD dok 03 §2. Dua sumbu (dok 01 §1): `accounts.type`
 * (personal/vendor = SIAPA pembelinya) dan `account_members.role`
 * (owner/manager/operator = APA yang boleh dilakukan orang itu di akun
 * tsb). `users.platform_role` sumbu terpisah lagi — staf platform, bukan
 * anggota akun klien mana pun.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/** Postgres `citext` — case-insensitive, dipakai BRD utk semua kolom
    email. Drizzle tidak punya tipe bawaan untuk ini. */
const citext = customType<{ data: string }>({
  dataType() {
    return "citext";
  },
});

export const platformRoleEnum = pgEnum("platform_role", ["super_admin", "admin", "support"]);
export const userStatusEnum = pgEnum("user_status", ["active", "suspended", "deleted"]);
export const accountTypeEnum = pgEnum("account_type", ["personal", "vendor"]);
export const accountStatusEnum = pgEnum("account_status", ["active", "suspended", "deleted"]);
export const accountMemberRoleEnum = pgEnum("account_member_role", [
  "owner",
  "manager",
  "operator",
]);
export const accountMemberStatusEnum = pgEnum("account_member_status", [
  "invited",
  "active",
  "disabled",
]);
export const accountInviteRoleEnum = pgEnum("account_invite_role", ["manager", "operator"]);

/** Kolom bersama semua tabel — dok 03 baris 4-6: "Semua tabel memakai id
    uuid primary key, created_at timestamptz not null default now(),
    updated_at timestamptz. ... tidak diulang di setiap tabel di bawah." */
const baseColumns = {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
};

// users.status dan accounts.status sudah mencakup nilai 'deleted' sebagai
// bagian enum-nya sendiri — itu mekanisme hapus-lunak keduanya, jadi
// TIDAK ditambah kolom deleted_at terpisah (akan jadi dua sumber
// kebenaran yang bisa saling bertentangan).

export const users = pgTable(
  "users",
  {
    ...baseColumns,
    email: citext("email").notNull().unique(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    // Verifikasi email minimal (Tahap 3, koreksi 15 Agu 2026 — dijawab
    // sebelumnya "anggap otomatis terverifikasi", DIBATALKAN pemilik
    // produk, diganti alur token sungguhan). Hash SHA-256 disimpan
    // (bukan token mentah) — pola sama account_invites.tokenHash.
    // NULL kalau belum pernah minta verifikasi atau sudah terverifikasi.
    emailVerificationTokenHash: text("email_verification_token_hash"),
    emailVerificationExpiresAt: timestamp("email_verification_expires_at", { withTimezone: true }),
    passwordHash: text("password_hash").notNull(),
    fullName: varchar("full_name", { length: 100 }).notNull(),
    phoneWa: varchar("phone_wa", { length: 20 }).notNull(),
    phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
    avatarAssetId: uuid("avatar_asset_id"),
    platformRole: platformRoleEnum("platform_role"),
    // Wajib terisi bila platformRole ≠ null (dok 03 §2.1) — kombinasi
    // dua kolom, tidak diekspresikan lewat CHECK sederhana; ditegakkan
    // di lapisan aplikasi, dicatat di sini supaya tidak lupa saat CRUD
    // staf dibangun (Tahap 2).
    twoFactorSecret: text("two_factor_secret"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    failedLoginCount: integer("failed_login_count").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    status: userStatusEnum("status").notNull().default("active"),
    marketingOptIn: boolean("marketing_opt_in").notNull().default(false),
  },
  (table) => [
    index("users_phone_wa_idx").on(table.phoneWa),
    index("users_platform_role_idx").on(table.platformRole),
  ]
);

export const accounts = pgTable("accounts", {
  ...baseColumns,
  type: accountTypeEnum("type").notNull(),
  displayName: varchar("display_name", { length: 120 }).notNull(),
  // "unik, huruf kecil" (dok 03 §2.2) — huruf kecil dijaga di lapisan
  // aplikasi (normalisasi sebelum insert), bukan CHECK: dok 03 §9 (daftar
  // aturan WAJIB di level database) tidak menyebutkan constraint ini.
  slug: varchar("slug", { length: 60 }).notNull().unique(),
  businessName: varchar("business_name", { length: 120 }),
  businessCity: varchar("business_city", { length: 80 }),
  logoAssetId: uuid("logo_asset_id"),
  billingName: varchar("billing_name", { length: 120 }),
  billingEmail: citext("billing_email"),
  billingNpwp: varchar("billing_npwp", { length: 25 }),
  billingAddress: text("billing_address"),
  // Cache — sumber kebenaran tetap quota_ledger/wallet ledger (Langkah 8).
  cachedWalletBalance: integer("cached_wallet_balance").notNull().default(0),
  walletExpiresAt: timestamp("wallet_expires_at", { withTimezone: true }),
  trialUsed: boolean("trial_used").notNull().default(false),
  status: accountStatusEnum("status").notNull().default("active"),
  suspendedReason: text("suspended_reason"),
});

export const accountMembers = pgTable(
  "account_members",
  {
    ...baseColumns,
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    role: accountMemberRoleEnum("role").notNull(),
    invitedByUserId: uuid("invited_by_user_id").references(() => users.id),
    invitedAt: timestamp("invited_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    status: accountMemberStatusEnum("status").notNull(),
  },
  (table) => [
    // dok 03 §9 poin 4 — unik (account_id, user_id), wajib di level DB.
    uniqueIndex("account_members_account_user_uq").on(table.accountId, table.userId),
  ]
);

export const accountInvites = pgTable("account_invites", {
  ...baseColumns,
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id),
  email: citext("email").notNull(),
  role: accountInviteRoleEnum("role").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true })
    .notNull()
    .default(sql`(now() + interval '7 days')`),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
});
