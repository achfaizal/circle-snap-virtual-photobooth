/**
 * Template — Langkah 5-7 rencana Tahap 2. Tabel `templates` (dok 03
 * §3.2) + `template_categories` (§3.3). K8: tidak ada tulisan klien ke
 * tabel ini — semua penulis di sini staf (requireStaff di route).
 */
import { asc, eq } from "drizzle-orm";
import { db } from "../client";
import { templateCategories, templates } from "../schema";
import type { ThemeColors, ThemeEffects, ThemeElements, VideoCardTheme } from "../../models/theme";

// Diekspor ulang dari lib/services/fontCatalog.ts (bukan didefinisikan
// di sini) — itu berkas client-safe (tanpa impor lib/db/client.ts),
// dipisah supaya TemplateEditor.tsx ("use client") bisa memakai daftar
// yang sama tanpa ikut menyeret driver `pg` ke bundle browser.
export { FONT_CATALOG } from "../../services/fontCatalog";

export interface TemplateInput {
  code: string;
  name: string;
  tagline?: string | null;
  description?: string | null;
  folder: string;
  coverAssetId: string | null; // nullable di form draft — wajib baru saat terbit (Langkah 7)
  brandLabel: string;
  themeColors: Partial<ThemeColors>;
  fontDisplayId: string;
  themeEffects?: ThemeEffects | null;
  themeElements?: ThemeElements | null;
  videoCardTheme: Partial<VideoCardTheme>;
  categoryIds: string[];
  primaryCategoryId?: string | null;
}

export async function listTemplates() {
  return db.select().from(templates).orderBy(asc(templates.createdAt));
}

export async function getTemplate(id: string) {
  const [row] = await db.select().from(templates).where(eq(templates.id, id));
  return row ?? null;
}

export async function getTemplateCategories(templateId: string) {
  return db.select().from(templateCategories).where(eq(templateCategories.templateId, templateId));
}

async function syncCategories(templateId: string, categoryIds: string[], primaryCategoryId?: string | null) {
  await db.delete(templateCategories).where(eq(templateCategories.templateId, templateId));
  if (categoryIds.length === 0) return;
  await db.insert(templateCategories).values(
    categoryIds.map((categoryId) => ({
      templateId,
      categoryId,
      isPrimary: categoryId === primaryCategoryId || (!primaryCategoryId && categoryId === categoryIds[0]),
    }))
  );
}

export async function createTemplate(input: TemplateInput) {
  const [row] = await db
    .insert(templates)
    .values({
      code: input.code,
      name: input.name,
      tagline: input.tagline ?? null,
      description: input.description ?? null,
      folder: input.folder,
      coverAssetId: input.coverAssetId,
      brandLabel: input.brandLabel,
      themeColors: input.themeColors,
      fontDisplayId: input.fontDisplayId,
      themeEffects: input.themeEffects ?? null,
      themeElements: input.themeElements ?? null,
      videoCardTheme: input.videoCardTheme,
      sampleData: {},
      defaultSessionConfig: {},
      status: "draft",
    })
    .returning();

  await syncCategories(row.id, input.categoryIds, input.primaryCategoryId);
  return row;
}

export async function updateTemplate(id: string, input: Partial<TemplateInput>) {
  const { categoryIds, primaryCategoryId, ...columns } = input;
  const [row] = await db.update(templates).set(columns).where(eq(templates.id, id)).returning();
  if (categoryIds) await syncCategories(id, categoryIds, primaryCategoryId);
  return row ?? null;
}
