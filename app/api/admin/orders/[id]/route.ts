import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { requireStaff } from "@/lib/adminAuth";
import { getOrder } from "@/lib/db/queries/purchaseOrders";
import { db } from "@/lib/db/client";
import { accounts, assets, orders } from "@/lib/db/schema";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireStaff();
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });

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

  return NextResponse.json({ order, account, proofAsset, history });
}
