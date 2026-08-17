import { NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/clientAuth";
import { listNotificationsForUser, countUnreadNotifications } from "@/lib/db/queries/notifications";

/** Langkah 15 Tahap 4 — daftar notifikasi in-app (lonceng di
    AppShell.tsx). Semua peran boleh (K5-serupa: cuma lihat notifikasi
    MILIK userId sesi sendiri, ditegakkan di lapisan kueri, bukan di
    sini). */
export async function GET() {
  const session = await getSessionAccount();
  if (!session) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });

  const [notifications, unreadCount] = await Promise.all([
    listNotificationsForUser(session.userId),
    countUnreadNotifications(session.userId),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}
