import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/adminAuth";
import { attachFrame, listAvailableSystemFrames, listTemplateFrames } from "@/lib/db/queries/templateFrames";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireStaff();
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const [attached, available] = await Promise.all([listTemplateFrames(id), listAvailableSystemFrames()]);
  return NextResponse.json({ attached, available });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireStaff();
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { frameId?: string; sortOrder?: number } | null;
  if (!body?.frameId) return NextResponse.json({ error: "frameId wajib diisi." }, { status: 400 });

  const result = await attachFrame(id, body.frameId, body.sortOrder ?? 0);
  if (!result.ok) {
    return NextResponse.json(
      { error: "Cuma bingkai SISTEM (Bingkai Sistem, account_id kosong) yang boleh dipasang ke template — dok 06 §5.4." },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
