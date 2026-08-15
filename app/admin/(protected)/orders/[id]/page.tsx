import { notFound } from "next/navigation";
import { eq, and, ne } from "drizzle-orm";
import { getSessionClientId } from "@/lib/adminAuth";
import { getRepo } from "@/lib/repo";
import { getOrder } from "@/lib/db/queries/purchaseOrders";
import { db } from "@/lib/db/client";
import { accounts, assets, orders } from "@/lib/db/schema";
import PurchaseOrderDetail from "@/components/admin/t2/PurchaseOrderDetail";

export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const clientId = await getSessionClientId();
  if (!clientId) notFound();
  const me = await getRepo().clients.getById(clientId);
  if (!me?.isStaff) notFound();

  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  const [account, proofAsset, history] = await Promise.all([
    db.select().from(accounts).where(eq(accounts.id, order.accountId)).then((r) => r[0] ?? null),
    order.proofAssetId
      ? db.select().from(assets).where(eq(assets.id, order.proofAssetId)).then((r) => r[0] ?? null)
      : Promise.resolve(null),
    db
      .select()
      .from(orders)
      .where(and(eq(orders.accountId, order.accountId), ne(orders.id, order.id)))
      .orderBy(orders.createdAt),
  ]);

  return (
    <PurchaseOrderDetail
      order={{
        id: order.id,
        number: order.number,
        status: order.status,
        strips: order.strips,
        subtotalIdr: order.subtotalIdr,
        totalIdr: order.totalIdr,
        paymentMethod: order.paymentMethod,
        createdAt: order.createdAt.toISOString(),
        expiresAt: order.expiresAt.toISOString(),
        notesInternal: order.notesInternal,
      }}
      account={account ? { id: account.id, displayName: account.displayName, type: account.type } : null}
      proofUrl={proofAsset?.storageKey ?? null}
      history={history.map((h) => ({ id: h.id, number: h.number, status: h.status, totalIdr: h.totalIdr }))}
    />
  );
}
