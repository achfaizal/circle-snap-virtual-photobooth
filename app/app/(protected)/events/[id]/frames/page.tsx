import { redirect } from "next/navigation";
import { getSessionAccount } from "@/lib/clientAuth";
import { getEventForAccount } from "@/lib/db/queries/events";
import { listEventFrames } from "@/lib/db/queries/eventFrames";
import EventFramesEditor from "@/components/app/EventFramesEditor";

export default async function EventFramesPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionAccount();
  if (!session) redirect("/app/login");

  const { id } = await params;
  const event = await getEventForAccount(id, session.accountId);
  if (!event) redirect("/app");
  if (!event.templateId) redirect(`/app/events/${id}/template`);

  const frames = await listEventFrames(id);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <h1 style={{ fontSize: 20, fontWeight: 900, color: "#18181B", marginBottom: 4 }}>Bingkai</h1>
      <p style={{ fontSize: 13, color: "#71717A", marginBottom: 20 }}>
        Urutan di sini = urutan yang dilihat tamu. Bingkai bawaan template bisa dinonaktifkan, bukan dihapus (AB-16).
      </p>
      <EventFramesEditor eventId={event.id} initialFrames={frames} />
    </div>
  );
}
