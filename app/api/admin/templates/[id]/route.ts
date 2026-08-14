import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/adminAuth";
import { FONT_CATALOG, getTemplate, getTemplateCategories, updateTemplate, type TemplateInput } from "@/lib/db/queries/templates";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireStaff();
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const template = await getTemplate(id);
  if (!template) return NextResponse.json({ error: "Template tidak ditemukan." }, { status: 404 });

  const categories = await getTemplateCategories(id);
  return NextResponse.json({ template, categories });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireStaff();
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const existing = await getTemplate(id);
  if (!existing) return NextResponse.json({ error: "Template tidak ditemukan." }, { status: 404 });

  const patch = (await request.json().catch(() => null)) as Partial<TemplateInput> | null;
  if (!patch) return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });

  const { code: _ignoredCode, ...safePatch } = patch;
  void _ignoredCode; // code terkunci setelah dibuat (dok 04 §4.2 tab 1)

  if (safePatch.fontDisplayId && !FONT_CATALOG.includes(safePatch.fontDisplayId as (typeof FONT_CATALOG)[number])) {
    return NextResponse.json(
      { error: `Font "${safePatch.fontDisplayId}" tidak ada di katalog terdaftar.` },
      { status: 400 }
    );
  }

  const updated = await updateTemplate(id, safePatch);
  return NextResponse.json({ template: updated });
}
