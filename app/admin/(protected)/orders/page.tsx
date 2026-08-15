import { notFound } from "next/navigation";
import { getSessionClientId } from "@/lib/adminAuth";
import { getRepo } from "@/lib/repo";
import { listOrders } from "@/lib/db/queries/purchaseOrders";
import PurchaseOrdersList from "@/components/admin/t2/PurchaseOrdersList";

/**
 * Pesanan & verifikasi pembayaran — Langkah 9 rencana Tahap 2 (D-26).
 * Direname dari `/admin/purchase-orders` ke nama BRD asli `/admin/orders`
 * di Langkah 11 Tahap 3 — jalur JSON lama yang dulu memakai URL ini
 * (portal klien) sudah dipensiunkan, tabrakan rutenya sudah tidak ada.
 */
export default async function PurchaseOrdersPage() {
  const clientId = await getSessionClientId();
  if (!clientId) notFound();
  const me = await getRepo().clients.getById(clientId);
  if (!me?.isStaff) notFound();

  const orders = await listOrders();

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--a-clr-text)" }}>
        Pesanan
      </h1>
      <p style={{ fontSize: 14, color: "var(--a-clr-text-muted)", marginTop: 4, marginBottom: 24 }}>
        Verifikasi pembayaran manual transfer — setuju langsung mengalirkan strip ke buku besar kuota.
      </p>
      <PurchaseOrdersList
        initial={orders.map((o) => ({
          id: o.id,
          number: o.number,
          status: o.status,
          strips: o.strips,
          totalIdr: o.totalIdr,
          paymentMethod: o.paymentMethod,
          createdAt: o.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
