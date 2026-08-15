/**
 * Kueri `events` Postgres milik satu akun — dipakai dashboard /app (Langkah
 * 2) dan diperluas Langkah 4+ (buat acara, wizard). Terpisah dari
 * lib/repo (JSON, portal klien lama) — TIDAK ada tulisan silang antara
 * keduanya.
 */
import { and, desc, eq } from "drizzle-orm";
import { db } from "../client";
import { events, eventVariableValues } from "../schema/events";

export async function listEventsByAccountId(accountId: string) {
  return db.select().from(events).where(eq(events.accountId, accountId)).orderBy(desc(events.createdAt));
}

/** K5 — kepemilikan objek, bukan cuma "id ada". Dipakai SEMUA rute
    /app/events/[id]/* (details, builder, frames, publish) supaya satu
    akun tidak pernah bisa membaca/mengubah acara akun lain lewat id
    yang ditebak. null kalau tidak ada ATAU bukan milik akun ini —
    pemanggil TIDAK boleh membedakan keduanya (sama seperti 404 generik). */
export async function getEventForAccount(eventId: string, accountId: string) {
  const [row] = await db.select().from(events).where(eq(events.id, eventId));
  if (!row || row.accountId !== accountId) return null;
  return row;
}

export type EventPatch = Partial<{
  internalName: string;
  categoryId: string;
  venue: string | null;
  timezone: string;
  startsAt: Date;
  displayNames: string | null;
  dateDisplay: string | null;
  hashtag: string | null;
  greeting: string | null;
  guestNameRequired: boolean;
  templateId: string | null;
  sessionConfig: unknown;
}>;

export async function updateEvent(eventId: string, patch: EventPatch) {
  const [row] = await db.update(events).set(patch).where(eq(events.id, eventId)).returning();
  return row ?? null;
}

export async function listEventVariableValues(eventId: string) {
  return db.select().from(eventVariableValues).where(eq(eventVariableValues.eventId, eventId));
}

/** dok 03 §5.4: kunci unik (event_id, variable_key) — upsert manual
    (bukan onConflictDoUpdate) karena tabel ini TIDAK punya constraint
    bernama yang bisa dirujuk lewat drizzle di sini secara rapi; cek-lalu-
    tulis cukup aman (nilai per key ditulis klien sendiri, bukan jalur
    konkuren seperti quota_ledger — K1 tidak relevan di sini). */
export async function upsertEventVariableValue(
  eventId: string,
  accountId: string,
  variableKey: string,
  valueText: string | null
) {
  const [existing] = await db
    .select()
    .from(eventVariableValues)
    .where(and(eq(eventVariableValues.eventId, eventId), eq(eventVariableValues.variableKey, variableKey)));

  if (existing) {
    const [row] = await db
      .update(eventVariableValues)
      .set({ valueText })
      .where(eq(eventVariableValues.id, existing.id))
      .returning();
    return row;
  }
  const [row] = await db.insert(eventVariableValues).values({ eventId, accountId, variableKey, valueText }).returning();
  return row;
}
