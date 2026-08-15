import { redirect } from "next/navigation";
import { getSessionClientId } from "@/lib/adminAuth";
import { getRepo } from "@/lib/repo";

/**
 * Portal klien pindah ke /app/* (D-25, Tahap 3, Langkah 11) — redirect,
 * bukan 404 langsung, supaya tab/bookmark lama tidak mendarat di
 * halaman kosong. Staf (masih pakai /admin/*) diarahkan ke panelnya
 * sendiri — perilaku ini SUDAH ada sebelumnya di halaman ini, tetap
 * dipertahankan, bukan ikut hilang.
 */
export default async function LegacyAdminDashboardRedirect() {
  const clientId = await getSessionClientId();
  if (clientId) {
    const client = await getRepo().clients.getById(clientId);
    if (client?.isStaff) redirect("/admin/staff/clients");
  }
  redirect("/app");
}
