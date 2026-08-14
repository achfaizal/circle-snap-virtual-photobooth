import { notFound } from "next/navigation";
import EventBooth from "@/components/EventBooth";
import { getSessionClientId } from "@/lib/adminAuth";
import { getRepo } from "@/lib/repo";
import { resolvePlaygroundBySlug } from "@/lib/adapters/resolvePlayground";

const PREVIEW_STEPS = ["bingkai", "potret", "suara", "struk"] as const;
type PreviewStep = (typeof PREVIEW_STEPS)[number];

export default async function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const resolved = await resolvePlaygroundBySlug(decodeURIComponent(slug));
  if (!resolved) notFound();

  /* ?preview=<langkah> dipakai pratinjau Visual Builder untuk melompat ke
     satu layar tertentu. Dua hal yang dilakukannya — melompati layar awal
     DAN melewati gerbang draft/selesai/kuota-habis — keduanya hanya boleh
     untuk pemilik event yang sedang login.

     Gerbangnya harus ikut dilewati, kalau tidak Visual Builder cuma
     menampilkan "Acara ini belum dipublikasikan" di kelima layar; klien
     tidak akan pernah bisa menata acaranya SEBELUM dipublikasikan, padahal
     justru itu urutan yang masuk akal. Tapi membiarkannya publik berarti
     tamu mana pun bisa memaksa masuk ke acara draft cukup dengan menempel
     ?preview= di URL — persis lubang yang gerbang itu tutup. Karena itu
     dicek sesinya di sini, di server. */
  const sp = await searchParams;
  const raw = Array.isArray(sp.preview) ? sp.preview[0] : sp.preview;
  const requested = PREVIEW_STEPS.includes(raw as PreviewStep) ? (raw as PreviewStep) : undefined;

  let previewStep: PreviewStep | undefined;
  if (requested) {
    const clientId = await getSessionClientId();
    if (clientId) {
      const client = await getRepo().clients.getById(clientId);
      if (client && (client.isStaff || client.id === resolved.ownerClientId)) {
        previewStep = requested;
      }
    }
  }

  return (
    <EventBooth
      event={resolved.event}
      used={resolved.used}
      templates={resolved.templates}
      previewStep={previewStep}
    />
  );
}
