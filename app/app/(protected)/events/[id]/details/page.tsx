import { redirect } from "next/navigation";
import { getSessionAccount } from "@/lib/clientAuth";
import { getEventForAccount } from "@/lib/db/queries/events";
import { listCategories } from "@/lib/db/queries/categories";
import { canEditStartsAt } from "@/lib/services/eventEditGuard";
import { toLocalInputValue } from "@/lib/services/indonesiaTimezone";
import EventDetailsForm from "@/components/app/EventDetailsForm";
import EndEventPanel from "@/components/app/EndEventPanel";

export default async function EventDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionAccount();
  if (!session) redirect("/app/login");

  const { id } = await params;
  const event = await getEventForAccount(id, session.accountId);
  if (!event) redirect("/app");

  const categories = await listCategories();
  const startsAtLocked = !canEditStartsAt(event);

  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      <h1 style={{ fontSize: 20, fontWeight: 900, color: "#18181B", marginBottom: 4 }}>Detail Acara</h1>
      <p style={{ fontSize: 13, color: "#71717A", marginBottom: 20 }}>
        Kuota acara sekarang: <strong>{event.cachedQuota - event.cachedConsumed}</strong> strip tersisa dari{" "}
        {event.cachedQuota} yang dialokasikan.
      </p>

      <EventDetailsForm
        eventId={event.id}
        categories={categories.filter((c) => c.status === "active").map((c) => ({ id: c.id, name: c.name }))}
        initial={{
          internalName: event.internalName,
          categoryId: event.categoryId,
          venue: event.venue ?? "",
          timezone: event.timezone,
          startsAtLocal: event.startsAt ? toLocalInputValue(event.startsAt, event.timezone) : "",
        }}
        startsAtLocked={startsAtLocked}
      />

      {/* dok 01 §3.2 — owner/manager selalu boleh; operator cuma kalau
          diizinkan per-acara (operatorCanEnd). Cuma relevan untuk acara
          yang sedang berjalan. */}
      {event.status === "live" && (session.role !== "operator" || event.operatorCanEnd) && (
        <EndEventPanel eventId={event.id} />
      )}
    </div>
  );
}
