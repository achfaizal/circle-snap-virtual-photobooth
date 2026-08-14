import { notFound } from "next/navigation";
import { getRepo } from "@/lib/repo";
import MomentsAdmin from "@/components/admin/MomentsAdmin";
import EventPageShell from "@/components/admin/EventPageShell";

export default async function EventMomentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getRepo().events.getById(id);
  if (!event) notFound();

  return (
    <EventPageShell
      event={event}
      title="Momen"
      subtitle="Semua foto & video hasil sesi tamu, dengan unduhan satu-per-satu atau sekaligus."
    >
      <MomentsAdmin event={event} />
    </EventPageShell>
  );
}
