import { redirect } from "next/navigation";
import { getSessionAccount } from "@/lib/clientAuth";
import { getEventForAccount } from "@/lib/db/queries/events";
import MomentsPanel from "@/components/app/MomentsPanel";

/** Langkah 8 Tahap 4 — dok 05 §5.6. Ganti stub lama (yang dulu ada di
    /admin/events/[id]/moments, sebelum D-25 pindah portal klien ke
    /app/*) dengan halaman sungguhan, dibaca dari `strips` Postgres
    (Langkah 5-7). */
export default async function EventMomentsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionAccount();
  if (!session) redirect("/app/login");

  const { id } = await params;
  const event = await getEventForAccount(id, session.accountId);
  if (!event) redirect("/app");

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <h1 style={{ fontSize: 20, fontWeight: 900, color: "#18181B", marginBottom: 4 }}>Momen</h1>
      <p style={{ fontSize: 13, color: "#71717A", marginBottom: 20 }}>
        Galeri hasil tamu — strip terbaru di depan. Menyembunyikan bisa dibatalkan; menghapus permanen tidak.
      </p>
      {/* dok 05 §5.6 tabel peran — hapus permanen cuma owner/manager,
          ditegakkan juga di server (DELETE minRole="manager"), ini cuma
          menyembunyikan tombolnya dari operator supaya tidak menekan
          lalu ditolak. */}
      <MomentsPanel eventId={event.id} canDeletePermanently={session.role !== "operator"} />
    </div>
  );
}
