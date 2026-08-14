import { notFound } from "next/navigation";
import { getRepo } from "@/lib/repo";
import EventPageShell from "@/components/admin/EventPageShell";
import EventTemplatePicker from "@/components/admin/EventTemplatePicker";
import { PLAYGROUND_TEMPLATES } from "@/lib/services/playgroundTemplates";

export default async function EventTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = getRepo();
  const event = await repo.events.getById(id);
  if (!event) notFound();

  // Sama seperti visual/page.tsx PLUS aset dekorasi/latar-video milik
  // SETIAP template katalog (bukan cuma yang dipakai event sekarang) —
  // pop-up "coba" bisa menampilkan template yang BELUM pernah dipasang
  // event ini sama sekali, jadi assetId-nya belum ada di theme event.
  const el = event.theme.elements;
  const templateAssetIds = PLAYGROUND_TEMPLATES.flatMap((t) => [t.decorAssetId, t.videoBgAssetId]);
  const assetIds = [
    ...new Set(
      [event.theme.decorAssetId, event.theme.videoBgAssetId, el?.monogram?.assetId, ...templateAssetIds].filter(
        (v): v is string => Boolean(v)
      )
    ),
  ];
  const assetEntries = await Promise.all(
    assetIds.map(async (assetId) => [assetId, (await repo.assets.getById(assetId))?.url] as const)
  );
  const initialAssetUrls: Record<string, string> = {};
  for (const [assetId, url] of assetEntries) {
    if (url) initialAssetUrls[assetId] = url;
  }

  return (
    <EventPageShell
      event={event}
      title="Template Playground"
      subtitle="Pilih atau ganti template kapan saja — bingkai selaras ikut menyesuaikan."
    >
      <EventTemplatePicker event={event} initialAssetUrls={initialAssetUrls} />
    </EventPageShell>
  );
}
