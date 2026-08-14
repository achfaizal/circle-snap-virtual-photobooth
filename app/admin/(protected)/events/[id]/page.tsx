import { notFound } from "next/navigation";
import { getRepo } from "@/lib/repo";
import EventSummary from "@/components/admin/EventSummary";

/**
 * RINGKASAN EVENT — halaman utama satu event, padanan "Ringkasan" di
 * referensi Glyka PartyBox.
 *
 * Dulu rute ini menampilkan editor bertab (Info/Tema/Bingkai/Sesi/Publish).
 * Sekarang tiap bagian itu jadi menu tersendiri di sidebar, dan halaman ini
 * murni menjawab "bagaimana keadaan acara saya sekarang" — nama, jadwal,
 * sisa kuota strip, kesiapan publikasi.
 *
 * Jumlah momen SENGAJA belum ditampilkan: daftarnya masih tertanam di
 * dalam handler GET /api/moments (Vercel Blob / berkas lokal), belum ada
 * fungsi server yang bisa dipakai ulang dari sini. Menampilkan angka yang
 * dikarang lebih buruk daripada tidak menampilkannya — menyusul bareng
 * menu Momen.
 *
 * Kepemilikan sudah dijaga layout.tsx di folder yang sama.
 */
export default async function EventSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = getRepo();
  const event = await repo.events.getById(id);
  if (!event) notFound();

  const [subscription, frames] = await Promise.all([
    repo.subscriptions.getByEventId(id),
    repo.frames.getMany(event.frameIds),
  ]);

  return <EventSummary event={event} subscription={subscription} frameCount={frames.length} />;
}
