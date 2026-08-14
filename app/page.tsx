import { notFound } from "next/navigation";
import EventBooth from "@/components/EventBooth";
import { resolvePlaygroundPrimary } from "@/lib/adapters/resolvePlayground";

/**
 * Akses langsung ke sesi tamu, bukan halaman index playground lagi — situs
 * ini sekarang untuk satu klien (bukan katalog beberapa event contoh), jadi
 * QR di lokasi cukup mengarah ke root domain tanpa kode event di URL.
 * Selalu event LIVE pertama dari repository (lihat
 * lib/adapters/resolvePlayground.ts) — kalau nanti ada event lain lagi,
 * cukup ubah status-nya lewat admin, tidak perlu sentuh file ini.
 * Route `/e/[slug]` tetap ada untuk akses langsung per kode kalau suatu
 * saat ada lebih dari satu event aktif bersamaan.
 */
export default async function Home() {
  const resolved = await resolvePlaygroundPrimary();
  if (!resolved) notFound();

  return (
    <EventBooth event={resolved.event} used={resolved.used} templates={resolved.templates} />
  );
}
