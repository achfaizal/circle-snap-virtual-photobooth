import { redirect } from "next/navigation";
import { getSessionAccount } from "@/lib/clientAuth";
import { getEventForAccount } from "@/lib/db/queries/events";
import { canPublishEvent } from "@/lib/services/eventPublishGate";
import EventPublishPanel from "@/components/app/EventPublishPanel";

export default async function EventPublishPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionAccount();
  if (!session) redirect("/app/login");

  const { id } = await params;
  const event = await getEventForAccount(id, session.accountId);
  if (!event) redirect("/app");

  const gate = event.status === "draft" ? await canPublishEvent(id) : { canPublish: true, failed: [] };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <h1 style={{ fontSize: 20, fontWeight: 900, color: "#18181B", marginBottom: 4 }}>Terbitkan Acara</h1>
      <p style={{ fontSize: 13, color: "#71717A", marginBottom: 20 }}>
        Semua 11 poin harus lolos sebelum acara bisa dilihat tamu (AB-12).
      </p>
      <EventPublishPanel eventId={event.id} failed={gate.failed} alreadyLive={event.status !== "draft"} />
    </div>
  );
}
