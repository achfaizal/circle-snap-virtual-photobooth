import { notFound } from "next/navigation";
import { getSessionClientId } from "@/lib/adminAuth";
import { getRepo } from "@/lib/repo";
import { buildStaffTables } from "@/lib/services/staffData";
import StaffClientsTable from "@/components/admin/staff/StaffClientsTable";

/**
 * Panel staff — daftar KLIEN.
 *
 * 404 (bukan 403) untuk non-staff, sama seperti gerbang kepemilikan
 * lain di admin ini: tidak membocorkan bahwa halaman ini ada.
 */
export default async function StaffClientsPage() {
  const clientId = await getSessionClientId();
  if (!clientId) notFound();
  const me = await getRepo().clients.getById(clientId);
  if (!me?.isStaff) notFound();

  const { clients } = await buildStaffTables();

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 900, color: "#0F172A", letterSpacing: "-0.03em" }}>
        Klien
      </h1>
      <p style={{ fontSize: 14, color: "var(--a-clr-text-muted)", marginTop: 4, marginBottom: 20 }}>
        Semua akun yang mendaftar di Circle Snap — beserta jumlah acara dan kuota terpakainya.
      </p>
      <StaffClientsTable rows={clients} />
    </div>
  );
}
