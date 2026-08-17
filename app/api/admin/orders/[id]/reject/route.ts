import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireStaff } from "@/lib/adminAuth";
import { rejectOrder } from "@/lib/db/queries/purchaseOrders";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireStaff();
  if (guard instanceof NextResponse) return guard;

  // Jembatan sesi JSON → users.id Postgres, pola sama approve/route.ts.
  const [staffUser] = await db.select().from(users).where(eq(users.email, guard.email));
  if (!staffUser) {
    return NextResponse.json(
      { error: "Akun staf ini belum ada padanannya di tabel users (Postgres) — jalankan migrasi klien dulu." },
      { status: 500 }
    );
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { reason?: string } | null;
  if (!body?.reason?.trim()) {
    return NextResponse.json({ error: "Alasan penolakan wajib diisi." }, { status: 400 });
  }

  const result = await rejectOrder(id, body.reason.trim(), staffUser.id);
  if (!result.ok) {
    if (result.reason === "not_found") return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ error: "Pesanan ini tidak dalam status yang bisa ditolak." }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
