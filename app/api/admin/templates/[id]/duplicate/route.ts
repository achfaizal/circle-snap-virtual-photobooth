import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireStaff } from "@/lib/adminAuth";
import { db } from "@/lib/db/client";
import { templateCategories, templateFrames, templateVariables, templates } from "@/lib/db/schema";

/** dok 04 §4.5: "jalur utama membuat template baru" — salinan selalu
    draft, code bersufiks, kepakaian (usageCount)/riwayat terbit tidak
    ikut (template baru, belum pernah dipakai acara mana pun). */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireStaff();
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const [source] = await db.select().from(templates).where(eq(templates.id, id));
  if (!source) return NextResponse.json({ error: "Template tidak ditemukan." }, { status: 404 });

  let suffix = 2;
  let newCode = `${source.code}-copy`;
  while ((await db.select({ id: templates.id }).from(templates).where(eq(templates.code, newCode))).length > 0) {
    newCode = `${source.code}-copy-${suffix++}`;
  }

  const [copy] = await db
    .insert(templates)
    .values({
      code: newCode,
      name: `${source.name} (salinan)`,
      tagline: source.tagline,
      description: source.description,
      folder: source.folder,
      coverAssetId: source.coverAssetId,
      previewAssetIds: source.previewAssetIds,
      brandLabel: source.brandLabel,
      themeColors: source.themeColors,
      fontDisplayId: source.fontDisplayId,
      themeEffects: source.themeEffects,
      themeElements: source.themeElements,
      videoCardTheme: source.videoCardTheme,
      decorAssetId: source.decorAssetId,
      videoBgAssetId: source.videoBgAssetId,
      sampleData: source.sampleData,
      defaultSessionConfig: source.defaultSessionConfig,
      status: "draft",
    })
    .returning();

  const [sourceCategories, sourceVariables, sourceFrames] = await Promise.all([
    db.select().from(templateCategories).where(eq(templateCategories.templateId, id)),
    db.select().from(templateVariables).where(eq(templateVariables.templateId, id)),
    db.select().from(templateFrames).where(eq(templateFrames.templateId, id)),
  ]);

  if (sourceCategories.length > 0) {
    await db.insert(templateCategories).values(
      sourceCategories.map((c) => ({ templateId: copy.id, categoryId: c.categoryId, isPrimary: c.isPrimary }))
    );
  }
  if (sourceVariables.length > 0) {
    await db.insert(templateVariables).values(
      sourceVariables.map((v) => ({
        templateId: copy.id,
        key: v.key,
        label: v.label,
        helpText: v.helpText,
        inputType: v.inputType,
        options: v.options,
        sampleValue: v.sampleValue,
        defaultValue: v.defaultValue,
        isRequired: v.isRequired,
        maxLength: v.maxLength,
        usedIn: v.usedIn,
        sortOrder: v.sortOrder,
      }))
    );
  }
  if (sourceFrames.length > 0) {
    await db.insert(templateFrames).values(
      sourceFrames.map((f) => ({ templateId: copy.id, frameId: f.frameId, sortOrder: f.sortOrder }))
    );
  }

  return NextResponse.json({ template: copy }, { status: 201 });
}
