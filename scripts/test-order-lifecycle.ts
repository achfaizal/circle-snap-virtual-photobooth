/**
 * Langkah 8 rencana Tahap 2 — uji siklus hidup pesanan. Disimpan
 * PERMANEN sebagai regresi (pola sama dengan skrip uji Tahap 1).
 *
 * Jalan: npx tsx --env-file=.env.local scripts/test-order-lifecycle.ts
 */
import { randomUUID } from "node:crypto";
import { eq, and } from "drizzle-orm";
import { db } from "../lib/db/client";
import { accounts, users, events, packages, orders, quotaLedger } from "../lib/db/schema";
import { createOrder, approveOrder } from "../lib/db/queries/purchaseOrders";

let failures = 0;
function assert(condition: boolean, label: string) {
  if (condition) console.log(`  ✔ ${label}`);
  else {
    console.error(`  ✘ ${label}`);
    failures++;
  }
}

async function main() {
  const [category] = await db.query.eventCategories.findMany({ limit: 1 });
  // PLUS, bukan PERSONAL-200 — codenya BRD dok 02 §2.3 cuma contoh
  // katalog, yang benar-benar termigrasi Tahap 1 dari planCatalog.ts
  // lama adalah BASIC/PLUS/PRO/EO-STARTER/EO-GROWTH.
  const [personalPkg] = await db.select().from(packages).where(eq(packages.code, "PLUS"));
  if (!category || !personalPkg) throw new Error("Perlu event_categories & paket PLUS — jalankan Tahap 1 dulu.");

  const [user] = await db
    .insert(users)
    .values({
      email: `uji-order-${randomUUID()}@test.local`,
      passwordHash: "UJI_ORDER_TIDAK_DIPAKAI_LOGIN",
      fullName: "Uji Siklus Pesanan",
      phoneWa: "+62000000ORDERTEST",
    })
    .returning();
  const [account] = await db
    .insert(accounts)
    .values({ type: "personal", displayName: "[UJI ORDER] Jangan hapus manual", slug: `uji-order-${randomUUID().slice(0, 8)}` })
    .returning();
  const [event] = await db
    .insert(events)
    .values({
      accountId: account.id,
      createdByUserId: user.id,
      categoryId: category.id,
      internalName: "[UJI ORDER] Acara",
      slug: `uji-order-${randomUUID().slice(0, 8)}`,
      activeDays: 7,
      status: "draft",
      sessionConfig: {},
    })
    .returning();

  console.log(`Akun: ${account.id}, Acara: ${event.id}, Paket: ${personalPkg.code} (${personalPkg.strips} strip)`);

  // --- [1] Buat order ---
  console.log("\n[1] Buat order (single_event, wajib target_event_id)");
  const order = await createOrder({
    accountId: account.id,
    createdByUserId: user.id,
    packageId: personalPkg.id,
    targetEventId: event.id,
    paymentMethod: "manual_transfer",
  });
  assert(order.status === "awaiting_payment", `status=${order.status}`);
  assert(order.totalIdr !== order.subtotalIdr, `nominal unik (${order.totalIdr}) ≠ subtotal polos (${order.subtotalIdr})`);
  assert(order.totalIdr > order.subtotalIdr && order.totalIdr < order.subtotalIdr + 1000, "selisih nominal unik dalam rentang 3 digit (100-999)");
  assert((order.packageSnapshot as { code: string }).code === personalPkg.code, "package_snapshot membekukan kode paket");

  // --- [2] Setujui ---
  console.log("\n[2] approveOrder() — harus tulis jurnal purchase & jadi fulfilled");
  const approved = await approveOrder(order.id, user.id);
  assert(approved.ok, `approveOrder ok=${approved.ok}`);
  if (approved.ok) assert(approved.order.status === "fulfilled", `status akhir=${approved.order.status}`);

  const ledgerRows = await db.select().from(quotaLedger).where(eq(quotaLedger.orderId, order.id));
  assert(ledgerRows.length === 1 && ledgerRows[0].entryType === "purchase", `1 baris ledger 'purchase' (dapat ${ledgerRows.length})`);
  assert(ledgerRows[0]?.strips === personalPkg.strips, `strips ledger = ${personalPkg.strips}`);

  const [eventAfter] = await db.select().from(events).where(eq(events.id, event.id));
  assert(eventAfter.cachedQuota === personalPkg.strips, `events.cached_quota=${eventAfter.cachedQuota}`);

  // --- [3] Verifikasi properti pemisahan komit (dok 04 baris 250-253) ---
  //
  // `orders.target_event_id` dan `quota_ledger.event_id` sama-sama
  // punya FK ke `events` — jadi TIDAK ADA cara "wajar" membuat Langkah 2
  // (tulis jurnal) gagal lewat createOrder()/approveOrder() apa adanya;
  // integritas referensial menolaknya duluan di titik yang lebih awal
  // (bukti bagus, bukan celah uji). Yang benar-benar perlu dibuktikan:
  // status 'paid' hasil Langkah 1 SELALU berupa commit sendiri, bukan
  // bagian dari transaksi Langkah 2 — diuji di sini dengan menjalankan
  // pola yang SAMA PERSIS (update status terpisah, lalu transaksi
  // terpisah yang sengaja gagal) terhadap order sungguhan.
  console.log("\n[3] Pola pemisahan komit: Langkah 1 (paid) harus bertahan walau Langkah 2 gagal total");
  const order3 = await createOrder({
    accountId: account.id,
    createdByUserId: user.id,
    packageId: personalPkg.id,
    targetEventId: event.id,
    paymentMethod: "manual_transfer",
  });
  // Langkah 1 — persis kode approveOrder(): commit sendiri.
  await db.update(orders).set({ status: "paid", paidAt: new Date(), verifiedByUserId: user.id }).where(eq(orders.id, order3.id));

  // Langkah 2 — transaksi yang SENGAJA gagal (FK ke akun yang tidak
  // ada), meniru "sesuatu gagal di tengah jalan tulis jurnal".
  await db
    .transaction(async (tx) => {
      await tx.insert(quotaLedger).values({
        accountId: randomUUID(), // sengaja tidak ada -> FK gagal
        eventId: event.id,
        entryType: "purchase",
        strips: order3.strips,
        balanceAfter: 999,
        orderId: order3.id,
      });
      await tx.update(orders).set({ status: "fulfilled" }).where(eq(orders.id, order3.id));
    })
    .catch(() => {
      /* diharapkan gagal — itu intinya */
    });

  const [afterFail] = await db.select().from(orders).where(eq(orders.id, order3.id));
  assert(afterFail.status === "paid", `status TETAP 'paid' setelah Langkah 2 gagal total (dapat: ${afterFail.status})`);
  const brokenLedgerRows = await db.select().from(quotaLedger).where(eq(quotaLedger.orderId, order3.id));
  assert(brokenLedgerRows.length === 0, `0 baris ledger nyangkut dari transaksi yang gagal (dapat ${brokenLedgerRows.length})`);

  // Retry sungguhan lewat approveOrder() — order sudah 'paid', harus
  // lanjut dari Langkah 2 dan berhasil normal kali ini.
  const retried = await approveOrder(order3.id, user.id);
  assert(retried.ok && retried.order.status === "fulfilled", "retry approveOrder() dari status 'paid' berhasil sampai fulfilled");

  // --- [4] Paket flexible tanpa target event -> masuk dompet ---
  console.log("\n[4] Paket flexible tanpa target_event_id — masuk dompet (event_id NULL)");
  const [vendorPkg] = await db.select().from(packages).where(eq(packages.code, "EO-STARTER"));
  const [vendorAccount] = await db
    .insert(accounts)
    .values({ type: "vendor", displayName: "[UJI ORDER] Akun Vendor", slug: `uji-order-vendor-${randomUUID().slice(0, 8)}` })
    .returning();
  const vendorOrder = await createOrder({
    accountId: vendorAccount.id,
    createdByUserId: user.id,
    packageId: vendorPkg.id,
    paymentMethod: "manual_transfer",
  });
  await approveOrder(vendorOrder.id, user.id);
  const [vendorAccAfter] = await db.select().from(accounts).where(eq(accounts.id, vendorAccount.id));
  assert(vendorAccAfter.cachedWalletBalance === vendorPkg.strips, `accounts.cached_wallet_balance=${vendorAccAfter.cachedWalletBalance}`);
  const dompetLedger = await db
    .select()
    .from(quotaLedger)
    .where(and(eq(quotaLedger.accountId, vendorAccount.id), eq(quotaLedger.entryType, "purchase")));
  assert(dompetLedger.length === 1 && dompetLedger[0].eventId === null, "1 baris purchase dgn event_id NULL (dompet)");

  console.log(failures === 0 ? "\n✔ LULUS — semua skenario sesuai." : `\n✘ GAGAL — ${failures} pemeriksaan meleset.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("GAGAL menjalankan uji:", e);
  process.exit(1);
});
