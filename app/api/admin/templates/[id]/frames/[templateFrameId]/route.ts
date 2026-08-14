import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/adminAuth";
import { detachFrame } from "@/lib/db/queries/templateFrames";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; templateFrameId: string }> }) {
  const guard = await requireStaff();
  if (guard instanceof NextResponse) return guard;

  const { templateFrameId } = await params;
  await detachFrame(templateFrameId);
  return NextResponse.json({ ok: true });
}
