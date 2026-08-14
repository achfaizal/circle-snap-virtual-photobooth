/**
 * Gerbang penerbitan template — Langkah 7 rencana Tahap 2, 8 poin persis
 * dok 04 §4.4 (sama dengan "kontrak minimum" dok 06 §2.1). Dipanggil
 * SEBELUM status boleh berubah ke 'published', bukan cuma dicek di UI.
 */
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { templateCategories, templateFrames, templateVariables, templates, frames } from "../db/schema";
import { FONT_CATALOG } from "./fontCatalog";

const COLOR_TOKENS = ["ink", "film", "edge", "smoke", "paper", "flash", "live", "brandPurple", "brandGold"];

function extractTokens(textLayers: unknown): string[] {
  if (!Array.isArray(textLayers)) return [];
  const tokens = new Set<string>();
  for (const layer of textLayers) {
    const text = typeof layer === "object" && layer && "text" in layer ? String((layer as { text: unknown }).text) : "";
    for (const match of text.matchAll(/\{\{(\w+)\}\}/g)) tokens.add(match[1]);
  }
  return [...tokens];
}

export interface PublishGateResult {
  canPublish: boolean;
  failed: { point: number; label: string }[];
}

export async function canPublishTemplate(templateId: string): Promise<PublishGateResult> {
  const [template] = await db.select().from(templates).where(eq(templates.id, templateId));
  if (!template) {
    return { canPublish: false, failed: [{ point: 0, label: "Template tidak ditemukan." }] };
  }

  const [categories, attachedFrames, variables] = await Promise.all([
    db.select().from(templateCategories).where(eq(templateCategories.templateId, templateId)),
    db
      .select({ frameId: templateFrames.frameId, textLayers: frames.textLayers })
      .from(templateFrames)
      .innerJoin(frames, eq(templateFrames.frameId, frames.id))
      .where(eq(templateFrames.templateId, templateId)),
    db.select().from(templateVariables).where(eq(templateVariables.templateId, templateId)),
  ]);

  const failed: { point: number; label: string }[] = [];

  // 1. Minimal 1 kategori
  if (categories.length === 0) failed.push({ point: 1, label: "Minimal 1 kategori" });

  // 2. Sampul terisi
  if (!template.coverAssetId) failed.push({ point: 2, label: "Sampul terisi" });

  // 3. Sembilan token warna terisi
  const colors = (template.themeColors as Record<string, string>) ?? {};
  const missingColors = COLOR_TOKENS.filter((t) => !colors[t]);
  if (missingColors.length > 0) {
    failed.push({ point: 3, label: `Sembilan token warna terisi (kosong: ${missingColors.join(", ")})` });
  }

  // 4. Font terdaftar
  if (!FONT_CATALOG.includes(template.fontDisplayId as (typeof FONT_CATALOG)[number])) {
    failed.push({ point: 4, label: "Font terdaftar di katalog" });
  }

  // 5. Minimal 1 bingkai
  if (attachedFrames.length === 0) failed.push({ point: 5, label: "Minimal 1 bingkai" });

  // 6. Semua token di bingkai punya variabel padanan
  const standardTokens = ["names", "date", "venue", "hashtag", "code"];
  const variableKeys = new Set(variables.map((v) => v.key));
  const unmatchedTokens = [...new Set(attachedFrames.flatMap((f) => extractTokens(f.textLayers)))].filter(
    (t) => !standardTokens.includes(t) && !variableKeys.has(t)
  );
  if (unmatchedTokens.length > 0) {
    failed.push({ point: 6, label: `Semua token bingkai punya variabel padanan (belum ada: ${unmatchedTokens.map((t) => `{{${t}}}`).join(", ")})` });
  }

  // 7. sample_data lengkap untuk semua variabel WAJIB
  const sampleData = (template.sampleData as Record<string, unknown>) ?? {};
  const missingRequired = variables.filter((v) => v.isRequired && !sampleData[v.key]);
  if (missingRequired.length > 0) {
    failed.push({
      point: 7,
      label: `sample_data lengkap untuk variabel wajib (kosong: ${missingRequired.map((v) => v.key).join(", ")})`,
    });
  }

  // 8. Pratinjau tamu sudah dijalankan minimal sekali
  if (!template.previewedAt) failed.push({ point: 8, label: "Pratinjau sebagai tamu sudah dijalankan minimal sekali" });

  return { canPublish: failed.length === 0, failed };
}
