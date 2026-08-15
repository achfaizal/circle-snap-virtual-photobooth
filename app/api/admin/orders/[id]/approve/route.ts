import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireStaff } from "@/lib/adminAuth";
import { approveOrder } from "@/lib/db/queries/purchaseOrders";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireStaff();
  if (guard instanceof NextResponse) return guard;

  // guard.id itu Client.id SESI JSON (mis. "cli_demo"), BUKAN
  // users.id Postgres (uuid) yang dibutuhkan orders.verified_by_user_id
  // — dicari lewat email, sama jembatan yang dipakai migrasi Tahap 1
  // (scripts/migrate-clients-events.ts, staf → users.platform_role).
  const [staffUser] = await db.select().from(users).where(eq(users.email, guard.email));
  if (!staffUser) {
    return NextResponse.json(
      { error: "Akun staf ini belum ada padanannya di tabel users (Postgres) — jalankan migrasi klien dulu." },
      { status: 500 }
    );
  }

  const { id } = await params;
  const result = await approveOrder(id, staffUser.id);

  if (!result.ok) {
    if (result.reason === "not_found") return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ error: "Pesanan ini tidak dalam status yang bisa disetujui." }, { status: 409 });
  }
  return NextResponse.json({ order: result.order });
}
