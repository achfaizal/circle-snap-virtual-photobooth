import { notFound } from "next/navigation";
import { getRepo } from "@/lib/repo";
import EventPublishEditor from "@/components/admin/EventPublishEditor";
import EventPageShell from "@/components/admin/EventPageShell";

export default async function EventPublishPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = getRepo();
  const event = await repo.events.getById(id);
  if (!event) notFound();
  const subscription = await repo.subscriptions.getByEventId(id);

  return (
    <EventPageShell
      event={event}
      title="Publish"
      subtitle="Status acara, QR code, dan link untuk tamu."
    >
      <EventPublishEditor event={event} subscription={subscription} />
    </EventPageShell>
  );
}
