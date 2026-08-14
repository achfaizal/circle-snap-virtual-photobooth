import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/adminAuth";
import { createTemplate, listTemplates, FONT_CATALOG, type TemplateInput } from "@/lib/db/queries/templates";

export async function GET() {
  const guard = await requireStaff();
  if (guard instanceof NextResponse) return guard;

  const items = await listTemplates();
  return NextResponse.json({ templates: items });
}

export async function POST(request: Request) {
  const guard = await requireStaff();
  if (guard instanceof NextResponse) return guard;

  const body = (await request.json().catch(() => null)) as Partial<TemplateInput> | null;
  if (!body?.code || !body?.name || !body?.folder || !body?.brandLabel) {
    return NextResponse.json({ error: "Kode, nama, folder, dan sapaan besar wajib diisi." }, { status: 400 });
  }
  const fontDisplayId = body.fontDisplayId ?? "jakarta";
  if (!FONT_CATALOG.includes(fontDisplayId as (typeof FONT_CATALOG)[number])) {
    return NextResponse.json(
      { error: `Font "${fontDisplayId}" tidak ada di katalog terdaftar.` },
      { status: 400 }
    );
  }

  const template = await createTemplate({
    code: body.code.trim(),
    name: body.name.trim(),
    tagline: body.tagline?.trim() || null,
    description: body.description?.trim() || null,
    folder: body.folder.trim(),
    coverAssetId: body.coverAssetId ?? null,
    brandLabel: body.brandLabel.trim(),
    themeColors: body.themeColors ?? {},
    fontDisplayId,
    themeEffects: body.themeEffects ?? null,
    themeElements: body.themeElements ?? null,
    videoCardTheme: body.videoCardTheme ?? {},
    categoryIds: body.categoryIds ?? [],
    primaryCategoryId: body.primaryCategoryId ?? null,
  }).catch((e) => {
    if (e instanceof Error && e.message.includes("templates_code_unique")) return null;
    throw e;
  });

  if (!template) {
    return NextResponse.json({ error: "Kode template ini sudah dipakai." }, { status: 409 });
  }
  return NextResponse.json({ template }, { status: 201 });
}
