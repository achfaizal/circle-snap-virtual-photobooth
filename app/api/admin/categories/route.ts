import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/adminAuth";
import { createCategory, listCategories } from "@/lib/db/queries/categories";

/**
 * Kategori acara — Langkah 1 rencana Tahap 2. Baca-tulis tabel
 * `event_categories` (Postgres), BUKAN lib/services/eventKind.ts
 * (masih dipakai wizard event JSON, sengaja tidak disentuh).
 */
export async function GET() {
  const guard = await requireStaff();
  if (guard instanceof NextResponse) return guard;

  const categories = await listCategories();
  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const guard = await requireStaff();
  if (guard instanceof NextResponse) return guard;

  const body = (await request.json().catch(() => null)) as {
    code?: string;
    name?: string;
    description?: string;
    icon?: string;
    defaultGreeting?: string;
    defaultBrandLabel?: string;
    sortOrder?: number;
  } | null;

  const code = body?.code?.trim().toLowerCase();
  const name = body?.name?.trim();
  if (!code || code.length < 1 || code.length > 32) {
    return NextResponse.json({ error: "Kode kategori wajib diisi, maksimal 32 karakter." }, { status: 400 });
  }
  if (!name || name.length < 2 || name.length > 60) {
    return NextResponse.json({ error: "Nama kategori wajib diisi, 2–60 karakter." }, { status: 400 });
  }

  const category = await createCategory({
    code,
    name,
    description: body?.description?.trim() || null,
    icon: body?.icon?.trim() || null,
    defaultGreeting: body?.defaultGreeting?.trim() || null,
    defaultBrandLabel: body?.defaultBrandLabel?.trim() || null,
    sortOrder: body?.sortOrder ?? 0,
  }).catch((e) => {
    // Kode dobel -> constraint unik Postgres, bukan dibiarkan 500 mentah.
    if (e instanceof Error && e.message.includes("event_categories_code_unique")) {
      return null;
    }
    throw e;
  });

  if (!category) {
    return NextResponse.json({ error: "Kode kategori ini sudah dipakai." }, { status: 409 });
  }

  return NextResponse.json({ category }, { status: 201 });
}
