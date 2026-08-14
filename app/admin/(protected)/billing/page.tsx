import { redirect } from "next/navigation";
import { getSessionClientId } from "@/lib/adminAuth";
import { getRepo } from "@/lib/repo";
import BillingOverview from "@/components/admin/BillingOverview";

export default async function BillingPage() {
  const clientId = await getSessionClientId();
  if (!clientId) redirect("/admin/login");

  const repo = getRepo();
  const client = await repo.clients.getById(clientId);
  if (!client) redirect("/admin/login");

  const events = client.isStaff ? await repo.events.list() : await repo.events.list(client.id);
  const subscriptions = await Promise.all(events.map((e) => repo.subscriptions.getByEventId(e.id)));

  const rows = events.map((event, i) => ({ event, subscription: subscriptions[i] }));

  return (
    <div style={{ padding: "32px 32px 60px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, color: "#0F172A", marginBottom: 4 }}>Paket & Billing</h1>
      <p style={{ fontSize: 14, color: "var(--a-clr-text-muted)", marginBottom: 24 }}>
        Kuota strip dan masa aktif tiap acara.
      </p>
      <BillingOverview
        rows={rows}
        isStaff={Boolean(client.isStaff)}
        clientType={client.type ?? "vendor"}
        eventSlotsTotal={client.eventSlotsTotal}
        eventCount={events.length}
      />
    </div>
  );
}
