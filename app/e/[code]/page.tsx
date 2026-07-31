import { notFound } from "next/navigation";
import EventBooth from "@/components/EventBooth";
import { getEvent } from "@/lib/event";

export default async function EventPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const ev = getEvent(decodeURIComponent(code));
  if (!ev) notFound();

  return <EventBooth code={ev.code} />;
}
