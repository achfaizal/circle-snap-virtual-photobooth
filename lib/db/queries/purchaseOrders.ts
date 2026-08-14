/**
 * Pesanan & buku besar kuota — Langkah 8 rencana Tahap 2 (D-26). Tabel
 * `orders` (dok 02 §4.2) + `quota_ledger` (Tahap 1). Rute API di
 * `/api/admin/purchase-orders` (BUKAN `/api/admin/orders` — itu jalur
 * pembelian klien lama, JSON, lihat catatan tabrakan rute di rencana
 * Tahap 2).
 */
import { and, eq, sql } from "drizzle-orm";
import { db } from "../client";
import { accounts, events, orders, packages, quotaLedger } from "../schema";
import { nextOrderNumber, withUniqueSuffix } from "../../services/orderNumber";

export async function listOrders() {
  return db.select().from(orders).orderBy(sql`${orders.createdAt} DESC`);
}

export async function getOrder(id: string) {
  const [row] = await db.select().from(orders).where(eq(orders.id, id));
  return row ?? null;
}

export interface CreateOrderInput {
  accountId: string;
  createdByUserId: string;
  packageId: string;
  targetEventId?: string | null;
  paymentMethod: "manual_transfer" | "qris" | "va" | "card";
}

/** dok 02 §4.3 Rilis 1: klien pilih paket → sistem tampilkan nominal
    unik → (di luar Langkah 8: unggah bukti) → admin verifikasi. Order
    dibuat langsung di `awaiting_payment` — tidak ada tahap `draft`
    terpisah di Tahap 2 (belum ada keranjang/multi-item, satu order =
    satu paket, langsung "siap dibayar" begitu dibuat). */
export async function createOrder(input: CreateOrderInput) {
  const [pkg] = await db.select().from(packages).where(eq(packages.id, input.packageId));
  if (!pkg) throw new Error("Paket tidak ditemukan.");
  if (pkg.allocationMode === "single_event" && !input.targetEventId) {
    throw new Error("target_event_id wajib untuk paket single_event (dok 02 §4.2).");
  }

  const subtotalIdr = pkg.priceIdr;
  const discountIdr = 0; // voucher (D-22) di luar cakupan Tahap 2
  const totalIdr = withUniqueSuffix(subtotalIdr - discountIdr);
  const number = await nextOrderNumber();

  const [order] = await db
    .insert(orders)
    .values({
      number,
      accountId: input.accountId,
      createdByUserId: input.createdByUserId,
      packageId: pkg.id,
      // P-02: seluruh nilai paket DIBEKUKAN saat dibeli.
      packageSnapshot: pkg,
      targetEventId: input.targetEventId ?? null,
      strips: pkg.strips,
      subtotalIdr,
      discountIdr,
      totalIdr,
      status: "awaiting_payment",
      paymentMethod: input.paymentMethod,
    })
    .returning();
  return order;
}

export type ApproveOrderResult =
  | { ok: true; order: typeof orders.$inferSelect }
  | { ok: false; reason: "not_found" | "wrong_status" };

/**
 * dok 04 §7.2 alur menyetujui — DUA LANGKAH TERPISAH, bukan satu
 * transaksi besar, sesuai dok 04 baris 250-253: "kalau salah satu gagal,
 * semuanya dibatalkan dan pesanan TETAP paid dengan tanda pemenuhan
 * tertunda" — `paid` harus SUDAH KOMIT sebelum jurnal ditulis, supaya
 * kalau langkah jurnal gagal, statusnya tidak ikut hilang balik ke
 * `awaiting_payment`. Retry aman: pemanggilan ulang pada order yang
 * sudah `paid` melewati langkah 1, langsung coba langkah 2 lagi.
 *
 *   Langkah 1 (commit sendiri): awaiting_payment → paid
 *   Langkah 2 (satu transaksi): jurnal purchase [+ allocation] → fulfilled
 */
export async function approveOrder(orderId: string, verifiedByUserId: string): Promise<ApproveOrderResult> {
  const [current] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!current) return { ok: false, reason: "not_found" };
  if (current.status !== "awaiting_payment" && current.status !== "paid") {
    return { ok: false, reason: "wrong_status" };
  }

  // Langkah 1 — commit terpisah, SEBELUM transaksi jurnal dimulai.
  if (current.status === "awaiting_payment") {
    await db.update(orders).set({ status: "paid", paidAt: new Date(), verifiedByUserId }).where(eq(orders.id, orderId));
  }

  // Langkah 2 — satu transaksi; gagal di sini TIDAK menyentuh status
  // `paid` yang sudah komit di langkah 1.
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    if (!order) return { ok: false, reason: "not_found" };

    const pkg = order.packageSnapshot as { allocationMode: "single_event" | "flexible" };

    if (pkg.allocationMode === "single_event" && order.targetEventId) {
      // Langsung ke acara — tidak pernah singgah di dompet (paket
      // single_event memang cuma untuk satu acara itu).
      const [{ balance }] = await tx
        .select({ balance: sql<number>`COALESCE(SUM(${quotaLedger.strips}), 0)::int` })
        .from(quotaLedger)
        .where(eq(quotaLedger.eventId, order.targetEventId));
      const newBalance = balance + order.strips;
      await tx.insert(quotaLedger).values({
        accountId: order.accountId,
        eventId: order.targetEventId,
        entryType: "purchase",
        strips: order.strips,
        balanceAfter: newBalance,
        orderId: order.id,
        reason: `Pesanan ${order.number} disetujui`,
      });
      await tx.update(events).set({ cachedQuota: sql`${events.cachedQuota} + ${order.strips}` }).where(eq(events.id, order.targetEventId));
    } else {
      // flexible (vendor) — masuk dompet dulu.
      const [{ balance }] = await tx
        .select({ balance: sql<number>`COALESCE(SUM(${quotaLedger.strips}), 0)::int` })
        .from(quotaLedger)
        .where(and(eq(quotaLedger.accountId, order.accountId), sql`${quotaLedger.eventId} IS NULL`));
      const newBalance = balance + order.strips;
      await tx.insert(quotaLedger).values({
        accountId: order.accountId,
        eventId: null,
        entryType: "purchase",
        strips: order.strips,
        balanceAfter: newBalance,
        orderId: order.id,
        reason: `Pesanan ${order.number} disetujui`,
      });
      await tx.update(accounts).set({ cachedWalletBalance: sql`${accounts.cachedWalletBalance} + ${order.strips}` }).where(eq(accounts.id, order.accountId));

      // Kalau paket flexible SEKALIGUS punya target acara (vendor
      // langsung mengalokasikan saat beli) — pasangan baris dompet(-)/
      // acara(+), sesuai jenis jurnal `allocation` dok 02 §3.2.
      if (order.targetEventId) {
        const [{ eventBalance }] = await tx
          .select({ eventBalance: sql<number>`COALESCE(SUM(${quotaLedger.strips}), 0)::int` })
          .from(quotaLedger)
          .where(eq(quotaLedger.eventId, order.targetEventId));
        await tx.insert(quotaLedger).values([
          {
            accountId: order.accountId,
            eventId: null,
            entryType: "allocation",
            strips: -order.strips,
            balanceAfter: newBalance - order.strips,
            orderId: order.id,
            reason: `Pesanan ${order.number} — dialokasikan ke acara`,
          },
          {
            accountId: order.accountId,
            eventId: order.targetEventId,
            entryType: "allocation",
            strips: order.strips,
            balanceAfter: eventBalance + order.strips,
            orderId: order.id,
            reason: `Pesanan ${order.number} — dialokasikan dari dompet`,
          },
        ]);
        await tx.update(accounts).set({ cachedWalletBalance: sql`${accounts.cachedWalletBalance} - ${order.strips}` }).where(eq(accounts.id, order.accountId));
        await tx.update(events).set({ cachedQuota: sql`${events.cachedQuota} + ${order.strips}` }).where(eq(events.id, order.targetEventId));
      }
    }

    const [fulfilled] = await tx.update(orders).set({ status: "fulfilled" }).where(eq(orders.id, orderId)).returning();
    return { ok: true, order: fulfilled };
  });
}

export async function rejectOrder(orderId: string, reason: string): Promise<{ ok: true } | { ok: false; reason: "not_found" | "wrong_status" }> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) return { ok: false, reason: "not_found" };
  if (order.status !== "awaiting_payment") return { ok: false, reason: "wrong_status" };

  await db.update(orders).set({ status: "cancelled", notesInternal: reason }).where(eq(orders.id, orderId));
  return { ok: true };
}
