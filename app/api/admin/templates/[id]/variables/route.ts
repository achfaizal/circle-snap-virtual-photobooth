import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/adminAuth";
import { createTemplateVariable, listTemplateVariables, type TemplateVariableInput } from "@/lib/db/queries/templateVariables";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireStaff();
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const rows = await listTemplateVariables(id);
  return NextResponse.json({ variables: rows });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireStaff();
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Partial<TemplateVariableInput> | null;
  if (!body?.key || !body?.label || !body?.inputType) {
    return NextResponse.json({ error: "key, label, dan input_type wajib diisi." }, { status: 400 });
  }
  // dok 03 §3.4: options WAJIB bila input_type='select'.
  if (body.inputType === "select" && !body.options) {
    return NextResponse.json({ error: "options wajib diisi kalau input_type='select'." }, { status: 400 });
  }

  const created = await createTemplateVariable(id, {
    key: body.key.trim(),
    label: body.label.trim(),
    helpText: body.helpText?.trim() || null,
    inputType: body.inputType,
    options: body.options ?? null,
    sampleValue: body.sampleValue?.trim() || null,
    defaultValue: body.defaultValue?.trim() || null,
    isRequired: body.isRequired ?? false,
    maxLength: body.maxLength ?? null,
    usedIn: body.usedIn ?? [],
    sortOrder: body.sortOrder ?? 0,
  }).catch((e) => {
    if (e instanceof Error && e.message.includes("template_variables_template_key_uq")) return null;
    throw e;
  });

  if (!created) {
    return NextResponse.json({ error: `Variabel dengan key "${body.key}" sudah ada di template ini.` }, { status: 409 });
  }
  return NextResponse.json({ variable: created }, { status: 201 });
}
