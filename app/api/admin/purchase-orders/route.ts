import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/adminAuth";
import { listOrders } from "@/lib/db/queries/purchaseOrders";

export async function GET() {
  const guard = await requireStaff();
  if (guard instanceof NextResponse) return guard;

  const items = await listOrders();
  return NextResponse.json({ orders: items });
}
