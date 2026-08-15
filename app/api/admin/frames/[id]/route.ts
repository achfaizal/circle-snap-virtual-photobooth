import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/adminAuth";
import { getSystemFrame, setSystemFrameStatus, systemFrameInUse } from "@/lib/db/queries/systemFrames";

/**
 * dok 04 §5.4: bingkai yang dipakai template TIDAK BOLEH dihapus, hanya
 * diarsipkan — makanya tidak ada handler DELETE sama sekali di sini,
 * cuma PATCH status.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireStaff();
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const existing = await getSystemFrame(id);
  if (!existing) return NextResponse.json({ error: "Bingkai tidak ditemukan." }, { status: 404 });

  const body = (await request.json().catch(() => null)) as { status?: "active" | "archived" } | null;
  if (body?.status !== "active" && body?.status !== "archived") {
    return NextResponse.json({ error: "status wajib 'active' atau 'archived'." }, { status: 400 });
  }

  if (body.status === "archived" && (await systemFrameInUse(id))) {
    return NextResponse.json(
      { error: "Bingkai ini masih dipasang di sebuah template — lepaskan dari template dulu sebelum diarsipkan." },
      { status: 409 }
    );
  }

  const frame = await setSystemFrameStatus(id, body.status);
  return NextResponse.json({ frame });
}
