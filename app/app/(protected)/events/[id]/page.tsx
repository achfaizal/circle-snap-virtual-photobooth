import { redirect } from "next/navigation";

/** Kartu acara di dasbor (app/(protected)/page.tsx) menaut ke
    `/app/events/{id}` langsung, tapi tidak pernah ada halaman di sini —
    ditemukan saat membangun Langkah 8 Tahap 4 (halaman Momen), bukan
    bagian 6 butir Tahap 4 sendiri, cuma tautan mati yang kebetulan
    ketahuan waktu menguji navigasi ke halaman baru. Diarahkan ke Detail
    Acara — tab yang selalu ada terlepas dari tahap acara (bingkai/
    builder baru relevan setelah template dipilih). */
export default async function EventHubRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/app/events/${id}/details`);
}
