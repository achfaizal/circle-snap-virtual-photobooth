import { and, desc, eq, gte, lte, SQL } from "drizzle-orm";
import { db } from "../client";
import { accounts, auditLogs, users } from "../schema";

export interface AuditLogFilters {
  actorUserId?: string;
  action?: string;
  entityType?: string;
  accountId?: string;
  from?: Date;
  to?: Date;
}

export interface AuditLogRow {
  id: string;
  createdAt: Date;
  actorUserId: string | null;
  actorEmail: string | null;
  actorIp: string | null;
  accountId: string | null;
  accountName: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before: unknown;
  after: unknown;
  reason: string | null;
}

/** Langkah 12 Tahap 4 — dok 04 §12 "saring: pelaku, tindakan, jenis
    entitas, rentang tanggal, akun". Semua filter OPSIONAL/AND-kan. */
export async function listAuditLogs(filters: AuditLogFilters): Promise<AuditLogRow[]> {
  const conditions: SQL[] = [];
  if (filters.actorUserId) conditions.push(eq(auditLogs.actorUserId, filters.actorUserId));
  if (filters.action) conditions.push(eq(auditLogs.action, filters.action));
  if (filters.entityType) conditions.push(eq(auditLogs.entityType, filters.entityType));
  if (filters.accountId) conditions.push(eq(auditLogs.accountId, filters.accountId));
  if (filters.from) conditions.push(gte(auditLogs.createdAt, filters.from));
  if (filters.to) conditions.push(lte(auditLogs.createdAt, filters.to));

  const rows = await db
    .select({
      id: auditLogs.id,
      createdAt: auditLogs.createdAt,
      actorUserId: auditLogs.actorUserId,
      actorEmail: users.email,
      actorIp: auditLogs.actorIp,
      accountId: auditLogs.accountId,
      accountName: accounts.displayName,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      before: auditLogs.before,
      after: auditLogs.after,
      reason: auditLogs.reason,
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorUserId))
    .leftJoin(accounts, eq(accounts.id, auditLogs.accountId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditLogs.createdAt))
    .limit(500); // dok 04 §12 tidak menyebut batas — 500 dipilih sebagai
    // pagar wajar (halaman baca-saja, bukan ekspor arsip penuh) supaya
    // satu kueri filter longgar tidak menyeret puluhan ribu baris.

  return rows;
}

/** Nilai unik `action`/`entity_type` yang PERNAH tercatat — dipakai
    mengisi opsi dropdown filter (bukan daftar hardcode, karena Langkah
    11 baru menyambungkan sebagian aksi, bukan semua yang mungkin ada
    di masa depan). */
export async function listDistinctAuditActions(): Promise<string[]> {
  const rows = await db.selectDistinct({ action: auditLogs.action }).from(auditLogs);
  return rows.map((r) => r.action).sort();
}

export async function listDistinctAuditEntityTypes(): Promise<string[]> {
  const rows = await db.selectDistinct({ entityType: auditLogs.entityType }).from(auditLogs);
  return rows.map((r) => r.entityType).sort();
}

/** Isi dropdown filter "akun" — cuma akun yang PERNAH punya jejak audit
    (bukan semua akun terdaftar), supaya daftarnya tidak membengkak
    percuma dengan akun yang tidak relevan untuk halaman ini. */
export async function listAccountsWithAuditLogs(): Promise<{ id: string; displayName: string }[]> {
  const rows = await db
    .selectDistinct({ id: accounts.id, displayName: accounts.displayName })
    .from(auditLogs)
    .innerJoin(accounts, eq(accounts.id, auditLogs.accountId))
    .orderBy(accounts.displayName);
  return rows;
}

/** Sama alasan dengan listAccountsWithAuditLogs() — cuma pelaku yang
    PERNAH tercatat, bukan semua users. */
export async function listActorsWithAuditLogs(): Promise<{ id: string; email: string }[]> {
  const rows = await db
    .selectDistinct({ id: users.id, email: users.email })
    .from(auditLogs)
    .innerJoin(users, eq(users.id, auditLogs.actorUserId))
    .orderBy(users.email);
  return rows;
}
