import { notFound } from "next/navigation";
import { getRepo } from "@/lib/repo";
import EventInfoEditor from "@/components/admin/EventInfoEditor";
import EventPageShell from "@/components/admin/EventPageShell";

export default async function EventInfoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getRepo().events.getById(id);
  if (!event) notFound();

  return (
    <EventPageShell
      event={event}
      title="Detail Acara"
      subtitle="Nama, jadwal, lokasi, dan sambutan yang dilihat tamu."
      withPreview
    >
      <EventInfoEditor event={event} />
    </EventPageShell>
  );
}
