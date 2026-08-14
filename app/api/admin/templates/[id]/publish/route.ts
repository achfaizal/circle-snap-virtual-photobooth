import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireStaff } from "@/lib/adminAuth";
import { canPublishTemplate } from "@/lib/services/templatePublishGate";
import { db } from "@/lib/db/client";
import { templates } from "@/lib/db/schema";

/** dok 04 §4.4: 8 gerbang, semua wajib lolos. AB-14: menerbitkan ULANG
    template yang sudah pernah terbit menaikkan version — acara `live`
    yang sudah membekukan template_snapshot TIDAK terpengaruh. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireStaff();
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const gate = await canPublishTemplate(id);
  if (!gate.canPublish) {
    return NextResponse.json(
      { error: "Belum bisa diterbitkan — masih ada gerbang yang belum lolos.", failed: gate.failed },
      { status: 400 }
    );
  }

  const [existing] = await db.select().from(templates).where(eq(templates.id, id));
  const alreadyPublishedBefore = existing?.publishedAt != null;

  const [updated] = await db
    .update(templates)
    .set({
      status: "published",
      publishedAt: new Date(),
      version: alreadyPublishedBefore ? (existing.version ?? 1) + 1 : existing?.version ?? 1,
    })
    .where(eq(templates.id, id))
    .returning();

  return NextResponse.json({ template: updated });
}
