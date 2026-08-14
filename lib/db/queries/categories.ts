/**
 * Kategori acara — Langkah 1 rencana Tahap 2. Tabel `event_categories`
 * (dok 03 §3.1). Dua sumber kebenaran kategori sengaja hidup
 * berdampingan sampai Tahap 3: `lib/services/eventKind.ts` (dipakai
 * wizard event JSON, tidak disentuh di sini) dan tabel ini (dipakai
 * CMS admin baru). Jangan menyatukan keduanya sekarang.
 */
import { asc, eq } from "drizzle-orm";
import { db } from "../client";
import { eventCategories, events, templateCategories } from "../schema";

export async function listCategories() {
  return db.select().from(eventCategories).orderBy(asc(eventCategories.sortOrder));
}

export async function getCategory(id: string) {
  const [row] = await db.select().from(eventCategories).where(eq(eventCategories.id, id));
  return row ?? null;
}

export interface CategoryInput {
  code: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  defaultGreeting?: string | null;
  defaultBrandLabel?: string | null;
  sortOrder: number;
}

export async function createCategory(input: CategoryInput) {
  const [row] = await db.insert(eventCategories).values(input).returning();
  return row;
}

export async function updateCategory(id: string, patch: Partial<CategoryInput & { status: "active" | "archived" }>) {
  const [row] = await db
    .update(eventCategories)
    .set(patch)
    .where(eq(eventCategories.id, id))
    .returning();
  return row ?? null;
}

/** dok 03 §3.1: "Kategori tidak boleh dihapus keras kalau masih dipakai
    acara atau template. Arsipkan saja." Dicek di sini (bukan cuma
    diserahkan ke FK Postgres — kolom event_categories.id di events/
    template_categories memang punya FK, tapi FK cuma menolak dengan
    error database mentah, bukan pesan yang bisa dibaca staf). */
export async function categoryInUse(id: string): Promise<boolean> {
  const [inEvents] = await db.select({ id: events.id }).from(events).where(eq(events.categoryId, id)).limit(1);
  if (inEvents) return true;
  const [inTemplates] = await db
    .select({ id: templateCategories.id })
    .from(templateCategories)
    .where(eq(templateCategories.categoryId, id))
    .limit(1);
  return !!inTemplates;
}

export async function deleteCategory(id: string): Promise<{ ok: true } | { ok: false; reason: "in_use" | "not_found" }> {
  const existing = await getCategory(id);
  if (!existing) return { ok: false, reason: "not_found" };
  if (await categoryInUse(id)) return { ok: false, reason: "in_use" };
  await db.delete(eventCategories).where(eq(eventCategories.id, id));
  return { ok: true };
}
