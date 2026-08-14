/**
 * GERBANG WAJIB Langkah 10 rencana Tahap 1 — K1 (AB-02): "Dua tamu
 * menekan bersamaan saat sisa 1 harus menghasilkan tepat 1 sukses."
 * Tahap 1 TIDAK dianggap selesai sampai skrip ini lulus. Disimpan
 * PERMANEN sebagai regresi (bukan dibuang setelah dipakai) — jalankan
 * ulang kapan saja ada perubahan di lib/db/queries/claimQuota.ts.
 *
 * Syarat: server `next dev` sudah jalan (`npm run dev`, port 3008).
 * Jalan: npx tsx --env-file=.env.local scripts/test-quota-concurrency.ts
 */
import { randomUUID } from "node:crypto";
import { eq, and } from "drizzle-orm";
import { db } from "../lib/db/client";
import { accounts, users, events, quotaLedger } from "../lib/db/schema";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3008";
const CONCURRENCY = 50;

async function main() {
  // --- siapkan 1 acara live bersaldo TEPAT 1 ---
  const [category] = await db.query.eventCategories.findMany({ limit: 1 });
  if (!category) throw new Error("event_categories kosong — jalankan Langkah 3 dulu.");

  const [user] = await db
    .insert(users)
    .values({
      email: `k1-gerbang-${randomUUID()}@test.local`,
      passwordHash: "GERBANG_K1_TIDAK_DIPAKAI_LOGIN",
      fullName: "Gerbang K1 — Uji Serentak",
      phoneWa: "+62000000K1TEST",
    })
    .returning();

  const [account] = await db
    .insert(accounts)
    .values({
      type: "personal",
      displayName: "[UJI GERBANG K1] Jangan hapus manual — regresi permanen",
      slug: `uji-gerbang-k1-${randomUUID().slice(0, 8)}`,
    })
    .returning();

  const [event] = await db
    .insert(events)
    .values({
      accountId: account.id,
      createdByUserId: user.id,
      categoryId: category.id,
      internalName: "[UJI GERBANG K1] Acara serentak",
      slug: `uji-gerbang-k1-${randomUUID().slice(0, 8)}`,
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
    strips: 1,
    balanceAfter: 1,
  });

  console.log(`Acara uji: ${event.id} (saldo awal 1)`);
  console.log(`Menembak ${CONCURRENCY} permintaan BENAR-BENAR bersamaan (Promise.all, ${CONCURRENCY} sessionId berbeda)...`);

  // --- tembak 50 permintaan bersamaan, sessionId BEDA semua ---
  const sessionIds = Array.from({ length: CONCURRENCY }, () => randomUUID());
  const results = await Promise.all(
    sessionIds.map((sessionId) =>
      fetch(`${BASE_URL}/api/quota/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, sessionId }),
      }).then((res) => res.status)
    )
  );

  const successes = results.filter((s) => s === 200).length;
  const conflicts = results.filter((s) => s === 409).length;
  const others = results.filter((s) => s !== 200 && s !== 409);

  console.log(`Sukses (200): ${successes}`);
  console.log(`Ditolak (409): ${conflicts}`);
  if (others.length > 0) console.log(`Status LAIN (tidak diharapkan): ${JSON.stringify(others)}`);

  const consumptionRows = await db.$count(
    quotaLedger,
    and(eq(quotaLedger.eventId, event.id), eq(quotaLedger.entryType, "consumption"))
  );

  console.log(`Baris quota_ledger entry_type='consumption' untuk acara ini: ${consumptionRows}`);

  const pass = successes === 1 && conflicts === CONCURRENCY - 1 && others.length === 0 && consumptionRows === 1;

  console.log(
    pass
      ? "\n✔ LULUS — tepat 1 sukses dari 50 permintaan bersamaan saat sisa kuota 1 (K1 tegak)."
      : "\n✘ GAGAL — K1 TIDAK tegak. Tahap 1 belum boleh dianggap selesai."
  );
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error("GAGAL menjalankan uji:", e);
  process.exit(1);
});
