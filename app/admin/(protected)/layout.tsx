import { redirect } from "next/navigation";
import { getSessionClientId } from "@/lib/adminAuth";
import { getRepo } from "@/lib/repo";
import AdminShell from "@/components/admin/AdminShell";

/**
 * Penjaga halaman untuk seluruh /admin/* KECUALI /admin/login &
 * /admin/register (di luar route group ini — kalau ikut dibungkus
 * layout ini, redirect-nya akan bolak-balik tanpa henti).
 *
 * Ini hanya melindungi HALAMAN. Route /api/admin/* menjaga dirinya
 * sendiri lewat requireAdminSession()/getSessionClientId() — lihat
 * lib/adminAuth.ts.
 */
export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const clientId = await getSessionClientId();
  // clientId null = sesi tidak valid ATAU token lama pra-multi-klien
  // (lihat catatan getSessionClientId) — dua-duanya diperlakukan sama:
  // suruh login ulang, lebih aman daripada menebak klien mana.
  if (!clientId) redirect("/admin/login");

  const repo = getRepo();
  const client = await repo.clients.getById(clientId);
  if (!client) redirect("/admin/login");

  // Staff (akun internal Circle Snap) & klien "vendor" melihat SEMUA
  // event mereka boleh kelola; klien "personal" (Acara Sendiri) cuma
  // event miliknya sendiri — dan itu maksimal 1 (ditegakkan di
  // app/api/admin/events/route.ts, bukan cuma dibatasi tampilannya).
  // Klien LAMA tanpa `type` (dibuat sebelum field ini ada) diperlakukan
  // setara "vendor" — lihat catatan Client.type di lib/models/client.ts.
  // Staff TIDAK punya acara sendiri, jadi panel "Event Aktif" (pilih/
  // ganti event yang sedang dikelola) tidak relevan untuknya — dulu
  // staff justru diperlakukan setara vendor di sini.
  const isVendorLike = !client.isStaff && client.type !== "personal";
  const rawEvents = await repo.events.list(client.isStaff ? undefined : client.id);
  const subscriptions = await Promise.all(rawEvents.map((e) => repo.subscriptions.getByEventId(e.id)));
  const events = rawEvents.map((e, i) => {
    const sub = subscriptions[i];
    const quota = sub?.stripQuota ?? 0;
    const used = sub?.stripUsed ?? 0;
    return {
      id: e.id,
      name: e.identity.internalName,
      kind: e.identity.kind,
      status: e.status,
      // Sinyal notifikasi NYATA (bukan data bikinan) — sama ambang batas
      // dengan badge kuning di kartu Dashboard (AdminDashboard.tsx):
      // sisa <= 20% dari kuota.
      quotaLow: quota > 0 && quota - used <= quota * 0.2,
      quotaLeft: Math.max(0, quota - used),
    };
  });

  return (
    <AdminShell
      events={events}
      clientName={client.name}
      showEventSwitcher={isVendorLike}
      isStaff={Boolean(client.isStaff)}
    >
      {children}
    </AdminShell>
  );
}
