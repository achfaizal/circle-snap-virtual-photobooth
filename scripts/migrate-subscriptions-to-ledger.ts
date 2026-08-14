/**
 * Langkah 12 rencana Tahap 1 — pindahkan data/subscriptions.json (lama,
 * penghitung `stripUsed`) ke baris awal `quota_ledger` (buku besar).
 * Bukan sekali pakai (dipanggil ulang di Langkah 13).
 *
 * Jalan:
 *   npx tsx --env-file=.env.local scripts/migrate-subscriptions-to-ledger.ts --source=seed --dry-run
 *   npx tsx --env-file=.env.local scripts/migrate-subscriptions-to-ledger.ts --source=seed
 *
 * ⚠️ SYARAT: scripts/migrate-clients-events.ts (Langkah 7) sudah jalan
 * lebih dulu untuk sumber yang sama — acara dicari lewat SLUG (dijaga
 * identik 1:1 sejak Langkah 7), bukan id lama.
 *
 * Ditulis sebagai DUA baris terpisah per langganan (purchase lalu
 * consumption), BUKAN satu angka bersih — supaya riwayatnya jujur
 * menggambarkan yang benar-benar terjadi (dok 09 §5 Tahap 1 poin 5),
 * konsisten dengan larangan K2 "koreksi = baris baru, bukan edit".
 * Baris consumption CUMA ditulis kalau stripUsed > 0 — tidak ada
 * gunanya menulis baris jurnal senilai nol.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../lib/db/client";
import { events, quotaLedger } from "../lib/db/schema";

const PROJECT_ROOT = join(__dirname, "..");

interface OldSubscription {
  id: string;
  clientId: string;
  eventId: string;
  planId: string;
  stripQuota: number;
  stripUsed: number;
  status: string;
}
interface OldEventRef {
  id: string;
  slug: string;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const source = args.includes("--source=live") ? "live" : "seed";
  const dryRun = args.includes("--dry-run");
  return { source, dryRun } as const;
}
function loadJson<T>(relPath: string): T {
  return JSON.parse(readFileSync(join(PROJECT_ROOT, relPath), "utf-8")) as T;
}

async function main() {
  const { source, dryRun } = parseArgs();
  const subsPath = source === "seed" ? "data/seed/subscriptions.seed.json" : "data/subscriptions.json";
  const eventsPath = source === "seed" ? "data/seed/events.seed.json" : "data/events.json";

  const oldSubs = loadJson<OldSubscription[]>(subsPath);
  const oldEvents = loadJson<OldEventRef[]>(eventsPath);
  const slugByOldEventId = new Map(oldEvents.map((e) => [e.id, e.slug]));

  console.log(`Sumber: ${source}`);
  console.log(`  ${subsPath}: ${oldSubs.length} langganan`);

  if (dryRun) {
    console.log("\n--dry-run: tidak menulis apa pun ke DB.");
    process.exit(0);
  }

  let purchaseCount = 0;
  let consumptionCount = 0;
  for (const sub of oldSubs) {
    const slug = slugByOldEventId.get(sub.eventId);
    if (!slug) {
      throw new Error(`Langganan ${sub.id} merujuk eventId lama "${sub.eventId}" yang tidak ada di ${eventsPath}.`);
    }
    const [event] = await db.select().from(events).where(eq(events.slug, slug));
    if (!event) {
      throw new Error(
        `Langganan ${sub.id}: acara dengan slug "${slug}" tidak ketemu di DB. ` +
          `Pastikan Langkah 7 sudah dijalankan untuk sumber "${source}" ini.`
      );
    }

    await db.insert(quotaLedger).values({
      accountId: event.accountId,
      eventId: event.id,
      entryType: "purchase",
      strips: sub.stripQuota,
      balanceAfter: sub.stripQuota,
      reason: `Migrasi Tahap 1 dari Subscription lama (${sub.id}, plan ${sub.planId})`,
    });
    purchaseCount++;

    if (sub.stripUsed > 0) {
      await db.insert(quotaLedger).values({
        accountId: event.accountId,
        eventId: event.id,
        entryType: "consumption",
        strips: -sub.stripUsed,
        balanceAfter: sub.stripQuota - sub.stripUsed,
        reason: `Migrasi Tahap 1 — pemakaian sudah tercatat sebelum buku besar ada (${sub.id})`,
      });
      consumptionCount++;
    }

    // Sinkronkan cache tampilan (Langkah 7 sengaja menulis 0/0, dicatat
    // "diperbarui Langkah 12 setelah quota_ledger ada" — ini janjinya).
    await db
      .update(events)
      .set({ cachedQuota: sub.stripQuota, cachedConsumed: sub.stripUsed })
      .where(eq(events.id, event.id));
  }
  console.log(`\nquota_ledger 'purchase': ${purchaseCount} baris dimasukkan`);
  console.log(`quota_ledger 'consumption': ${consumptionCount} baris dimasukkan`);

  // --- verifikasi: stripQuota - stripUsed (sumber) == SUM(strips) hasil migrasi ---
  console.log("\n--- verifikasi ---");
  let mismatches = 0;
  for (const sub of oldSubs) {
    const slug = slugByOldEventId.get(sub.eventId)!;
    const [event] = await db.select().from(events).where(eq(events.slug, slug));
    const rows = await db.select().from(quotaLedger).where(eq(quotaLedger.eventId, event!.id));
    const dbSum = rows.reduce((acc, r) => acc + r.strips, 0);
    const expected = sub.stripQuota - sub.stripUsed;
    if (dbSum !== expected) {
      console.error(`SELISIH langganan ${sub.id}: DB sum=${dbSum} vs sumber (quota-used)=${expected}`);
      mismatches++;
    }
  }
  console.log(
    mismatches === 0
      ? `COCOK — 0 selisih (${oldSubs.length} langganan)`
      : `${mismatches} SELISIH DITEMUKAN`
  );
  process.exit(mismatches === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("GAGAL:", e);
  process.exit(1);
});
