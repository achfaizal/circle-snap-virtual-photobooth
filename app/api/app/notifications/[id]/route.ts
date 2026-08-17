import { NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/clientAuth";
import { markNotificationRead } from "@/lib/db/queries/notifications";

/** Tandai satu notifikasi dibaca — markNotificationRead() sendiri sudah
    mencocokkan userId (K5-serupa), jadi memaksa id notifikasi user lain
    di sini cuma akan menyentuh 0 baris, bukan bocor. */
export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionAccount();
  if (!session) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });

  const { id } = await params;
  await markNotificationRead(id, session.userId);
  return NextResponse.json({ ok: true });
}
