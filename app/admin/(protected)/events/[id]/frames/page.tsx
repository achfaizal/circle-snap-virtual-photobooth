import { notFound } from "next/navigation";
import { getSessionClientId } from "@/lib/adminAuth";
import { getRepo } from "@/lib/repo";
import EventFramesEditor from "@/components/admin/EventFramesEditor";
import EventPageShell from "@/components/admin/EventPageShell";
import { allTemplateFrameIds, frameIdsForTemplate, templateNameForFrame } from "@/lib/services/playgroundTemplates";

export default async function EventFramesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clientId = await getSessionClientId();
  const repo = getRepo();
  const event = await repo.events.getById(id);
  if (!event || !clientId) notFound();

  const client = await repo.clients.getById(clientId);
  // Pustaka bawaan Circle Snap + bingkai milik klien ini sendiri.
  const [sharedAll, own, sharedAssets, ownAssets] = await Promise.all([
    repo.frames.list(null),
    client?.isStaff ? Promise.resolve([]) : repo.frames.list(event.clientId),
    repo.assets.list(null),
    client?.isStaff ? Promise.resolve([]) : repo.assets.list(event.clientId),
  ]);

  // Saring bingkai bersama menurut template event — klien cuma melihat
  // bingkai yang memang dirancang selaras dengan tampilan playground-nya.
  //
  // Event yang BELUM memilih template jatuh balik ke allTemplateFrameIds()
  // (union SEMUA template), BUKAN "tampilkan seluruh database" seperti
  // sebelumnya — pustaka bersama sekarang cuma berisi bingkai yang benar
  // berpasangan dengan template mana pun; bingkai lama yang tidak
  // berpasangan (Sal&Sal, Sirkus, Bola, Polos) tetap ada di data, cuma
  // tidak ditawarkan lagi (lihat komentar allTemplateFrameIds()).
  //
  // Bingkai UNGGAHAN KLIEN SENDIRI (`own`) sengaja TIDAK ikut disaring:
  // itu desain miliknya, bukan kurasi kami — tidak masuk akal
  // menyembunyikannya karena "tidak cocok template".
  const allowed = frameIdsForTemplate(event.templateId) ?? allTemplateFrameIds();
  const shared = sharedAll.filter((f) => allowed.includes(f.id));

  const assetUrls: Record<string, string> = {};
  for (const a of [...sharedAssets, ...ownAssets]) assetUrls[a.id] = a.url;

  // Label "Bagian dari template X" — cuma berguna kalau kolamnya berisi
  // bingkai dari LEBIH dari satu template sekaligus (event belum
  // memilih, jadi semuanya tampil rata); kalau cuma ada 1 template di
  // katalog, badge-nya jadi berlebihan tapi tetap benar, jadi dibiarkan.
  const frameTemplates: Record<string, string> = {};
  if (!frameIdsForTemplate(event.templateId)) {
    for (const f of shared) {
      const name = templateNameForFrame(f.id);
      if (name) frameTemplates[f.id] = name;
    }
  }

  return (
    <EventPageShell
      event={event}
      title="Bingkai Acara"
      subtitle="Pilih bingkai yang boleh dipakai tamu — urutannya = urutan pilihan mereka."
      withPreview
    >
      <EventFramesEditor
        event={event}
        frames={[...shared, ...own]}
        assetUrls={assetUrls}
        frameTemplates={frameTemplates}
      />
    </EventPageShell>
  );
}
