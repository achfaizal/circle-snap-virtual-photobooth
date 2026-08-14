/**
 * Langkah 11 rencana Tahap 1 — uji properti buku besar (dok 08 §6.1
 * poin 2, AB-03): "saldo tidak disimpan, saldo dihitung." Disimpan
 * PERMANEN sebagai regresi, sama pola dengan test-quota-concurrency.ts.
 *
 * Invarian yang diuji, untuk SETIAP baris jurnal satu acara, bukan cuma
 * keadaan akhir: `balance_after` baris itu HARUS SAMA dengan jumlah
 * `strips` semua baris acara ini sampai & termasuk baris itu (diurutkan
 * `created_at`). Kalau ini pernah meleset di satu baris pun — bahkan
 * kalau keadaan akhirnya "kebetulan" benar — jurnalnya sudah tidak bisa
 * dipercaya sebagai sumber kebenaran.
 *
 * Operasi acak (≥200) mencampur klaim sungguhan lewat HTTP (lib/db/
 * queries/claimQuota.ts, kadang gagal karena saldo habis — itu wajar,
 * bukan kegagalan uji) dengan penyesuaian admin simulasi langsung ke
 * jurnal (Tahap 1 belum punya endpoint admin untuk itu — CMS Tahap 2).
 *
 * Syarat: server `next dev` sudah jalan.
 * Jalan: npx tsx --env-file=.env.local scripts/test-ledger-properties.ts
 */
import { randomUUID } from "node:crypto";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "../lib/db/client";
import { accounts, users, events, quotaLedger } from "../lib/db/schema";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3008";
const OPERATIONS = 200;
const INITIAL_ALLOCATION = 60;

async function main() {
  const [category] = await db.query.eventCategories.findMany({ limit: 1 });
  if (!category) throw new Error("event_categories kosong — jalankan Langkah 3 dulu.");

  const [user] = await db
    .insert(users)
    .values({
      email: `k2-ledger-${randomUUID()}@test.local`,
      passwordHash: "UJI_LEDGER_TIDAK_DIPAKAI_LOGIN",
      fullName: "Uji Properti Buku Besar",
      phoneWa: "+62000000LEDGERTEST",
    })
    .returning();

  const [account] = await db
    .insert(accounts)
    .values({
      type: "personal",
      displayName: "[UJI LEDGER] Jangan hapus manual — regresi permanen",
      slug: `uji-ledger-${randomUUID().slice(0, 8)}`,
    })
    .returning();

  const [event] = await db
    .insert(events)
    .values({
      accountId: account.id,
      createdByUserId: user.id,
      categoryId: category.id,
      internalName: "[UJI LEDGER] Acara properti buku besar",
      slug: `uji-ledger-${randomUUID().slice(0, 8)}`,
      activeDays: 7,
      status: "live",
      startsAt: new Date(Date.now() - 60_000),
      expiresAt: new Date(Date.now() + 7 * 86_400_000),
      sessionConfig: {},
    })
    .returning();

  await db.insert(quotaLedger).values({
    accountId: account.id,
    eventId: event.id,
    entryType: "allocation",
    strips: INITIAL_ALLOCATION,
    balanceAfter: INITIAL_ALLOCATION,
  });

  console.log(`Acara uji: ${event.id} (alokasi awal ${INITIAL_ALLOCATION})`);
  console.log(`Menjalankan ${OPERATIONS} operasi acak berurutan (klaim + penyesuaian)...`);

  let claimAttempts = 0;
  let claimSuccesses = 0;
  let adjustments = 0;

  for (let i = 0; i < OPERATIONS; i++) {
    const isAdjustment = Math.random() < 0.3;

    if (isAdjustment) {
      // Simulasi penyesuaian admin — baca saldo SEKARANG (query fresh,
      // bukan variabel yang dijaga sendiri) lalu tulis baris baru.
      const [{ balance }] = await db
        .select({ balance: sql<number>`COALESCE(SUM(${quotaLedger.strips}), 0)::int` })
        .from(quotaLedger)
        .where(eq(quotaLedger.eventId, event.id));
      const delta = Math.floor(Math.random() * 8) - 3; // -3..+4
      await db.insert(quotaLedger).values({
        accountId: account.id,
        eventId: event.id,
        entryType: "adjustment",
        strips: delta,
        balanceAfter: balance + delta,
        reason: "Uji properti buku besar — penyesuaian acak",
      });
      adjustments++;
    } else {
      claimAttempts++;
      const res = await fetch(`${BASE_URL}/api/quota/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, sessionId: randomUUID() }),
      });
      if (res.status === 200) claimSuccesses++;
    }
  }

  console.log(`Klaim dicoba: ${claimAttempts} (berhasil: ${claimSuccesses}), penyesuaian: ${adjustments}`);

  // --- replay historis: cek SETIAP baris, bukan cuma keadaan akhir ---
  const rows = await db
    .select()
    .from(quotaLedger)
    .where(eq(quotaLedger.eventId, event.id))
    .orderBy(asc(quotaLedger.createdAt));

  let running = 0;
  let mismatches = 0;
  for (const [index, row] of rows.entries()) {
    running += row.strips;
    if (running !== row.balanceAfter) {
      console.error(
        `SELISIH baris #${index} (${row.entryType}, id=${row.id}): kumulatif=${running} balance_after=${row.balanceAfter}`
      );
      mismatches++;
    }
  }

  console.log(`\nTotal baris jurnal diperiksa: ${rows.length}`);
  console.log(
    mismatches === 0
      ? "✔ LULUS — 0 penyimpangan. Saldo di setiap baris cocok dengan penjumlahan jurnal sampai baris itu."
      : `✘ GAGAL — ${mismatches} baris menyimpang dari penjumlahan jurnal.`
  );
  process.exit(mismatches === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("GAGAL menjalankan uji:", e);
  process.exit(1);
});
