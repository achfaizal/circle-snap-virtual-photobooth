import { getRepo } from "@/lib/repo";
import { planById } from "@/lib/services/planCatalog";
import type { StaffClientRow } from "@/components/admin/staff/StaffClientsTable";
import type { StaffEventRow } from "@/components/admin/staff/StaffEventsTable";

/**
 * Penyusun data panel staff — SERVER-ONLY (menyentuh repo langsung),
 * mengikuti pola lib/services/orderEffects.ts. Jangan diimpor dari
 * komponen klien.
 *
 * Dikumpulkan di satu tempat karena kedua tabel butuh gabungan yang
 * sama (klien × acara × langganan) dan menyalinnya di dua page.tsx
 * berarti dua rumus kuota yang bisa bergeser diam-diam.
 *
 * Kuota strip klien dijumlahkan dari SEMUA langganannya, bukan diambil
 * dari satu langganan: satu klien vendor bisa punya beberapa acara yang
 * masing-masing punya kuota sendiri.
 */
export async function buildStaffTables(): Promise<{
  clients: StaffClientRow[];
  events: StaffEventRow[];
}> {
  const repo = getRepo();
  const all = await repo.clients.list();
  // Akun staff sendiri tidak ditampilkan sebagai "klien" — dia bukan
  // pelanggan, dan barisnya cuma bikin hitungan klien salah.
  const clients = all.filter((c) => !c.isStaff);

  const perClient = await Promise.all(
    clients.map(async (c) => ({
      client: c,
      events: await repo.events.list(c.id),
    }))
  );

  const subsByEvent = new Map<string, { stripQuota: number; stripUsed: number }>();
  for (const { events } of perClient) {
    for (const e of events) {
      const s = await repo.subscriptions.getByEventId(e.id);
      if (s) subsByEvent.set(e.id, { stripQuota: s.stripQuota, stripUsed: s.stripUsed });
    }
  }

  const clientRows: StaffClientRow[] = perClient.map(({ client: c, events }) => {
    let stripQuota = 0;
    let stripUsed = 0;
    for (const e of events) {
      const s = subsByEvent.get(e.id);
      if (!s) continue;
      stripQuota += s.stripQuota;
      stripUsed += s.stripUsed;
    }
    return {
      id: c.id,
      name: c.name,
      businessName: c.businessName,
      email: c.email,
      whatsapp: c.whatsapp,
      // Client.type opsional demi akun lama; diperlakukan vendor kalau
      // kosong, sama seperti di AdminShell.
      type: c.type === "personal" ? "personal" : "vendor",
      createdAt: c.createdAt,
      eventCount: events.length,
      eventSlotsTotal: c.eventSlotsTotal,
      planName: c.planId ? planById(c.planId)?.name : undefined,
      stripQuota,
      stripUsed,
    };
  });

  const eventRows: StaffEventRow[] = perClient.flatMap(({ client: c, events }) =>
    events.map((e) => {
      const s = subsByEvent.get(e.id);
      return {
        id: e.id,
        slug: e.slug,
        internalName: e.identity.internalName,
        names: e.identity.names,
        dateDisplay: e.identity.dateDisplay || e.identity.date,
        date: e.identity.date,
        status: e.status,
        ownerLabel: c.businessName ?? c.name,
        ownerEmail: c.email,
        stripQuota: s?.stripQuota ?? 0,
        stripUsed: s?.stripUsed ?? 0,
        frameCount: e.frameIds.length,
        createdAt: e.createdAt,
      };
    })
  );

  // Terbaru dulu — staff hampir selalu mencari yang baru masuk.
  clientRows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  eventRows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return { clients: clientRows, events: eventRows };
}
