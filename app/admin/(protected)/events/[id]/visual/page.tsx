import { notFound } from "next/navigation";
import { getRepo } from "@/lib/repo";
import VisualBuilder from "@/components/admin/VisualBuilder";
import { PLAYGROUND_TEMPLATES } from "@/lib/services/playgroundTemplates";

export default async function EventVisualPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = getRepo();
  const event = await repo.events.getById(id);
  if (!event) notFound();
  const subscription = await repo.subscriptions.getByEventId(id);

  // Pratinjau langsung (lib/services/livePreview.ts) butuh URL aset yang
  // SUDAH dirujuk theme SEKARANG (monogram/dekorasi/latar video) — kalau
  // klien belum mengganti-ganti upload sama sekali, VisualBuilder tidak
  // pernah tahu URL-nya sendiri (cuma menyimpan assetId). Diresolusi
  // sekali di sini, sama seperti FrameLibrary meresolusi assetUrls-nya.
  // Aset dekorasi/latar-video tiap TEMPLATE katalog ikut diresolusi juga
  // — Langkah 1 (Pilih Template) bisa menampilkan template yang belum
  // pernah dipasang event ini sama sekali.
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

  return <VisualBuilder event={event} subscription={subscription} initialAssetUrls={initialAssetUrls} />;
}
