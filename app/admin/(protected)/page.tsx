import { redirect } from "next/navigation";
import { getSessionClientId } from "@/lib/adminAuth";
import { getRepo } from "@/lib/repo";
import AdminDashboard from "@/components/admin/AdminDashboard";

export default async function AdminDashboardPage() {
  const clientId = await getSessionClientId();
  if (!clientId) redirect("/admin/login");

  const repo = getRepo();
  const client = await repo.clients.getById(clientId);
  if (!client) redirect("/admin/login");

  // Halaman ini adalah dashboard KLIEN (daftar event miliknya + tombol
  // "Buat Event"). Staff tidak punya acara sendiri dan ditolak API kalau
  // menekan tombol itu, jadi dialihkan ke panelnya sendiri daripada
  // disodori layar yang tombol utamanya pasti gagal.
  if (client.isStaff) redirect("/admin/staff/clients");

  const events = await repo.events.list(client.id);
  const subscriptions = await Promise.all(events.map((e) => repo.subscriptions.getByEventId(e.id)));

  const clientType = client.type === "personal" ? "personal" : "vendor";
  // Belum pernah pilih paket = wizard WAJIB menanyakan dulu (lihat
  // catatan panjang di app/api/admin/events/route.ts).
  const needsPlan = !client.planId;

  // "Boleh buat event baru?" — dua alasan berbeda bisa membuatnya false:
  // Acara Sendiri yang 1 event-nya sudah terpakai, ATAU Vendor/EO yang
  // eventSlotsTotal-nya (dari paket/add-on) sudah habis. Penegakan
  // SUNGGUHAN ada di app/api/admin/events/route.ts — ini cuma
  // menampilkan-atau-tidak tombolnya.
  const canCreateMore =
    needsPlan || // belum pernah pilih paket -> wizard yang akan menanyakan, jangan diblokir dulu
    (clientType === "personal"
      ? events.length === 0
      : client.eventSlotsTotal === undefined || events.length < client.eventSlotsTotal);

  return (
    <AdminDashboard
      events={events}
      subscriptions={subscriptions}
      canCreateMore={canCreateMore}
      needsPlan={needsPlan}
      clientType={clientType}
    />
  );
}
