import { notFound } from "next/navigation";
import { getSessionClientId } from "@/lib/adminAuth";
import { getRepo } from "@/lib/repo";
import { buildStaffTables } from "@/lib/services/staffData";
import StaffEventsTable from "@/components/admin/staff/StaffEventsTable";

/** Panel staff — daftar ACARA milik semua klien. Lihat catatan gerbang
    404 di ../clients/page.tsx. */
export default async function StaffEventsPage() {
  const clientId = await getSessionClientId();
  if (!clientId) notFound();
  const me = await getRepo().clients.getById(clientId);
  if (!me?.isStaff) notFound();

  const { events } = await buildStaffTables();

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 900, color: "#0F172A", letterSpacing: "-0.03em" }}>
        Acara
      </h1>
      <p style={{ fontSize: 14, color: "var(--a-clr-text-muted)", marginTop: 4, marginBottom: 20 }}>
        Seluruh acara yang dibuat klien. Staff memantau dan membantu — acara selalu milik klien,
        bukan milik staff.
      </p>
      <StaffEventsTable rows={events} />
    </div>
  );
}
