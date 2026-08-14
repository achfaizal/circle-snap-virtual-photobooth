import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireStaff } from "@/lib/adminAuth";
import { db } from "@/lib/db/client";
import { templates } from "@/lib/db/schema";

/** Menandai gerbang penerbitan poin ke-8 (dok 04 §4.4) — "pratinjau
    tamu sudah dijalankan minimal sekali". Dipanggil halaman pratinjau
    statis saat dibuka, TIDAK bikin acara & TIDAK memotong kuota
    (dok 04 §4.3). */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireStaff();
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const [updated] = await db.update(templates).set({ previewedAt: new Date() }).where(eq(templates.id, id)).returning();
  if (!updated) return NextResponse.json({ error: "Template tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ template: updated });
}
