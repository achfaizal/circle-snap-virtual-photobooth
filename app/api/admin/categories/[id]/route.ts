import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/adminAuth";
import { deleteCategory, getCategory, updateCategory } from "@/lib/db/queries/categories";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireStaff();
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const existing = await getCategory(id);
  if (!existing) {
    return NextResponse.json({ error: "Kategori tidak ditemukan." }, { status: 404 });
  }

  const patch = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!patch) return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });

  // `code` terkunci setelah dibuat (dok 04 §3) — diabaikan diam-diam
  // kalau ikut terkirim, bukan ditolak (klien lama mengirim field ini
  // apa adanya tidak perlu tahu detail ini, sama pola dengan events).
  const { code: _ignoredCode, id: _ignoredId, ...safePatch } = patch;
  void _ignoredCode;
  void _ignoredId;

  const category = await updateCategory(id, safePatch);
  return NextResponse.json({ category });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireStaff();
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const result = await deleteCategory(id);

  if (!result.ok) {
    if (result.reason === "not_found") {
      return NextResponse.json({ error: "Kategori tidak ditemukan." }, { status: 404 });
    }
    return NextResponse.json(
      {
        error:
          "Kategori ini masih dipakai acara atau template — tidak bisa dihapus. Arsipkan saja lewat status.",
      },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true });
}
