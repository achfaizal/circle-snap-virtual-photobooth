import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/adminAuth";
import { deleteTemplateVariable, updateTemplateVariable, type TemplateVariableInput } from "@/lib/db/queries/templateVariables";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; varId: string }> }) {
  const guard = await requireStaff();
  if (guard instanceof NextResponse) return guard;

  const { varId } = await params;
  const patch = (await request.json().catch(() => null)) as Partial<TemplateVariableInput> | null;
  if (!patch) return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });

  if (patch.inputType === "select" && !patch.options) {
    return NextResponse.json({ error: "options wajib diisi kalau input_type='select'." }, { status: 400 });
  }

  const updated = await updateTemplateVariable(varId, patch);
  if (!updated) return NextResponse.json({ error: "Variabel tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ variable: updated });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; varId: string }> }) {
  const guard = await requireStaff();
  if (guard instanceof NextResponse) return guard;

  const { varId } = await params;
  await deleteTemplateVariable(varId);
  return NextResponse.json({ ok: true });
}
