import { notFound } from "next/navigation";
import { getSessionClientId } from "@/lib/adminAuth";
import { getRepo } from "@/lib/repo";
import { listPackages } from "@/lib/db/queries/packages";
import PackagesManager from "@/components/admin/t2/PackagesManager";

export default async function PackagesPage() {
  const clientId = await getSessionClientId();
  if (!clientId) notFound();
  const me = await getRepo().clients.getById(clientId);
  if (!me?.isStaff) notFound();

  const packages = await listPackages();

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--a-clr-text)" }}>
        Paket
      </h1>
      <p style={{ fontSize: 14, color: "var(--a-clr-text-muted)", marginTop: 4, marginBottom: 24 }}>
        Katalog paket strip. Harga di sini yang sebenarnya dijual — bukan
        lagi konstanta di kode.
      </p>
      <PackagesManager initial={packages} />
    </div>
  );
}
