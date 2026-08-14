/**
 * Dipakai kedua route playground (app/page.tsx & app/e/[slug]/page.tsx)
 * untuk menyelesaikan Event dari repository jadi bentuk siap-pakai
 * EventBooth — server-only (menyentuh lib/repo/ langsung).
 */
import { getRepo } from "../repo";
import type { EventConfig } from "../event";
import type { Template } from "../templates";
import { assetMap, toEventConfig, toTemplates } from "./legacy";
import type { Event } from "../models/event";

export interface ResolvedPlayground {
  event: EventConfig;
  templates: Template[];
  used: number;
  /** Pemilik event — dipakai rute /e/{slug} untuk memutuskan apakah
      pemanggil berhak memakai ?preview= (lihat catatan di sana). Tidak
      pernah sampai ke komponen tamu. */
  ownerClientId: string;
}

async function buildResolved(event: Event): Promise<ResolvedPlayground | null> {
  const repo = getRepo();
  const subscription = await repo.subscriptions.getByEventId(event.id);
  if (!subscription) return null; // event tanpa langganan tidak bisa dipakai

  const frames = await repo.frames.getMany(event.frameIds);
  const [globalAssets, clientAssets] = await Promise.all([
    repo.assets.list(null),
    repo.assets.list(event.clientId),
  ]);
  const assets = assetMap([...globalAssets, ...clientAssets]);

  return {
    event: toEventConfig(event, subscription, assets),
    templates: toTemplates(frames, assets),
    used: subscription.stripUsed,
    ownerClientId: event.clientId,
  };
}

/** Untuk /e/{slug} — akses langsung per kode event.

    Status "draft" SENGAJA tidak ditolak di sini lagi (beda dari
    perilaku lama) — dibiarkan resolve seperti "ended", supaya
    EventBooth.tsx yang menggerbang dengan pesan ramah "Acara ini belum
    dipublikasikan", bukan 404 Next.js polos yang membingungkan tamu.
    Ketemu nyata saat membangun tab Publish admin (docs/blueprint/05
    Fase 4): kode lama di sini membuat gerbang draft di EventBooth jadi
    tidak pernah tercapai sama sekali untuk rute ini. */
export async function resolvePlaygroundBySlug(
  slug: string
): Promise<ResolvedPlayground | null> {
  const repo = getRepo();
  const event = await repo.events.getBySlug(slug);
  if (!event) return null;
  return buildResolved(event);
}

/**
 * Untuk root "/" — situs sekarang untuk satu klien (bukan katalog
 * beberapa event contoh), jadi root langsung menampilkan event LIVE
 * pertama, bukan halaman index. Lihat docs/blueprint/04 & keputusan di
 * app/page.tsx versi lama (EVENTS[0]).
 */
export async function resolvePlaygroundPrimary(): Promise<ResolvedPlayground | null> {
  const repo = getRepo();
  const events = await repo.events.list();
  const primary = events.find((e) => e.status === "live");
  if (!primary) return null;
  return buildResolved(primary);
}
