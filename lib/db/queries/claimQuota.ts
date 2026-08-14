/**
 * Klaim SATU strip kuota — jantung K1/K2 (AB-01, AB-02, AB-03). Alur
 * persis dok 02 §3.5 / dok 07 §5.1 langkah 1-6:
 *
 *   1. Tamu selesai sesi → sessionId sebagai kunci idempoten
 *   2. Buka transaksi, kunci baris acara (`SELECT ... FOR UPDATE`)
 *   3. Cek: acara live, belum expired, sisa kuota > 0
 *   4. Tulis jurnal consumption -1
 *   5. Perbarui cached_consumed
 *   6. Commit; kembalikan sisa kuota terbaru
 *
 * Kunci baris di langkah 2 itu yang menjawab K1: dua klaim untuk EVENT
 * YANG SAMA yang datang bersamaan tidak bisa lolos berdua — transaksi
 * kedua menunggu transaksi pertama commit/rollback dulu sebelum baris
 * event-nya bisa dibaca, jadi pengecekan "sisa kuota > 0" di langkah 3
 * TIDAK PERNAH melihat data basi.
 */
import { sql, eq, and } from "drizzle-orm";
import { db } from "../client";
import { events, quotaLedger } from "../schema";

export type ClaimQuotaResult =
  | { ok: true; alreadyClaimed: boolean; remaining: number }
  | { ok: false; reason: "not_found" | "not_live" | "expired" | "empty" };

export async function claimQuota(eventId: string, sessionId: string): Promise<ClaimQuotaResult> {
  return db.transaction(async (tx) => {
    // Langkah 2: kunci baris acara — dua transaksi bersamaan untuk event
    // yang sama otomatis diserialkan Postgres di baris ini.
    const [event] = await tx.select().from(events).where(eq(events.id, eventId)).for("update");

    if (!event) return { ok: false, reason: "not_found" };

    // Langkah 3a: idempoten — kalau sessionId ini SUDAH pernah menulis
    // jurnal untuk acara ini, kembalikan hasil LAMA tanpa insert baru.
    // Dicek SEBELUM validasi status/expired supaya permintaan ulang
    // (retry jaringan) yang sudah sukses tetap dapat jawaban sukses
    // walau status acara berubah setelahnya (mis. baru saja `ended`).
    const [existing] = await tx
      .select()
      .from(quotaLedger)
      .where(and(eq(quotaLedger.eventId, eventId), eq(quotaLedger.idempotencyKey, sessionId)));
    if (existing) {
      return { ok: true, alreadyClaimed: true, remaining: existing.balanceAfter };
    }

    // Langkah 3b: acara live, belum expired (K15 — dicek waktu SUNGGUHAN,
    // bukan cuma percaya status cache yang bisa lag dari cron).
    if (event.status !== "live") return { ok: false, reason: "not_live" };
    if (event.expiresAt && event.expiresAt.getTime() <= Date.now()) {
      return { ok: false, reason: "expired" };
    }

    // Langkah 3c: sisa kuota — dihitung dari jurnal (dok 02 §3.4), bukan
    // dari cached_consumed (cache cuma untuk tampilan cepat).
    const [{ balance }] = await tx
      .select({ balance: sql<number>`COALESCE(SUM(${quotaLedger.strips}), 0)::int` })
      .from(quotaLedger)
      .where(eq(quotaLedger.eventId, eventId));
    if (balance <= 0) return { ok: false, reason: "empty" };

    // Langkah 4: tulis jurnal. balance_after = balance lama - 1, karena
    // strip baru ini SUDAH bernilai -1 (dok 02 §3.4: "konsumsi sudah
    // bernilai negatif di dalamnya").
    const newBalance = balance - 1;
    await tx.insert(quotaLedger).values({
      accountId: event.accountId,
      eventId,
      entryType: "consumption",
      strips: -1,
      balanceAfter: newBalance,
      sessionId,
      idempotencyKey: sessionId,
    });

    // Langkah 5: cache tampilan — SELALU dihitung ulang dari jurnal saat
    // dibutuhkan (Langkah 11), ini cuma percepatan baca.
    await tx
      .update(events)
      .set({ cachedConsumed: sql`${events.cachedConsumed} + 1` })
      .where(eq(events.id, eventId));

    // Langkah 6: commit terjadi otomatis saat callback ini selesai tanpa
    // error (drizzle transaction wrapper).
    return { ok: true, alreadyClaimed: false, remaining: newBalance };
  });
}
