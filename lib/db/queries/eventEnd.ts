import { and, eq, sql } from "drizzle-orm";
import { db } from "../client";
import { accounts, events, quotaLedger } from "../schema";
import { getRetentionDaysAfterEnd } from "./settings";
import { recordAudit } from "../../services/auditLog";

export type EndEventResult =
  | { ok: true; event: typeof events.$inferSelect }
  | { ok: false; reason: "not_found" | "not_live" };

/**
 * Langkah 17 Tahap 4 — "Akhiri Acara" (dok 01 §3.2, AB-11, AB-21).
 *
 * AB-08 poin terakhir ("Setelah `ended`, sisa kuota kembali ke dompet
 * otomatis untuk akun `flexible`. Untuk `single_event`, sisa hangus dan
 * dicatat sebagai jurnal `forfeit`.") DITEMUKAN saat membangun langkah
 * ini — TIDAK ada di deskripsi awal rencana Tahap 4 Langkah 17 ("status
 * live→ended, endedAt=now, retentionUntil dihitung" saja, tanpa
 * menyebut kuota). Ditambahkan di sini karena AB-08 eksplisit dan
 * `quota_ledger_entry_type` sudah punya `return_on_end`/`forfeit` sejak
 * Tahap 1 — dua nilai enum yang sebelum ini TIDAK PERNAH dipakai kode
 * manapun, jelas disiapkan untuk momen ini.
 *
 * "flexible" DI SINI diartikan `accounts.type === 'vendor'` (dompet
 * bersama, dok 02 §3.2), "single_event" diartikan `type === 'personal'`
 * (beli terikat satu acara, tidak punya konsep dompet dipakai ulang) —
 * BRD tidak punya kolom account "allocationMode" terpisah, jadi
 * pemetaan ini mengikuti model bisnis di CLAUDE.md §1, bukan field
 * literal yang ada di skema.
 */
export async function endEvent(eventId: string, accountId: string, actorUserId: string): Promise<EndEventResult> {
  let quotaReturned = 0;
  let ledgerEntryType: "return_on_end" | "forfeit" | null = null;

  const result = await db.transaction(async (tx) => {
    const [event] = await tx.select().from(events).where(eq(events.id, eventId)).for("update");
    if (!event || event.accountId !== accountId) return { ok: false, reason: "not_found" } as const;
    if (event.status !== "live") return { ok: false, reason: "not_live" } as const;

    const [account] = await tx.select().from(accounts).where(eq(accounts.id, accountId)).for("update");

    const [{ balance }] = await tx
      .select({ balance: sql<number>`COALESCE(SUM(${quotaLedger.strips}), 0)::int` })
      .from(quotaLedger)
      .where(eq(quotaLedger.eventId, eventId));

    if (balance > 0) {
      quotaReturned = balance;
      if (account.type === "vendor") {
        ledgerEntryType = "return_on_end";
        const [{ walletBalance }] = await tx
          .select({ walletBalance: sql<number>`COALESCE(SUM(${quotaLedger.strips}), 0)::int` })
          .from(quotaLedger)
          .where(and(eq(quotaLedger.accountId, accountId), sql`${quotaLedger.eventId} IS NULL`));
        await tx.insert(quotaLedger).values([
          {
            accountId,
            eventId,
            entryType: "return_on_end",
            strips: -balance,
            balanceAfter: 0,
            actorUserId,
            reason: "Sisa kuota kembali ke dompet — acara diakhiri (AB-08)",
          },
          {
            accountId,
            eventId: null,
            entryType: "return_on_end",
            strips: balance,
            balanceAfter: walletBalance + balance,
            actorUserId,
            reason: "Sisa kuota kembali ke dompet — acara diakhiri (AB-08)",
          },
        ]);
        await tx.update(accounts).set({ cachedWalletBalance: sql`${accounts.cachedWalletBalance} + ${balance}` }).where(eq(accounts.id, accountId));
      } else {
        ledgerEntryType = "forfeit";
        await tx.insert(quotaLedger).values({
          accountId,
          eventId,
          entryType: "forfeit",
          strips: -balance,
          balanceAfter: 0,
          actorUserId,
          reason: "Sisa kuota hangus — acara diakhiri, paket single_event (AB-08)",
        });
      }
    }

    const retentionDays = await getRetentionDaysAfterEnd();
    const endedAt = new Date();
    const retentionUntil = new Date(endedAt.getTime() + retentionDays * 86400 * 1000);

    const [updated] = await tx
      .update(events)
      .set({ status: "ended", endedAt, retentionUntil })
      .where(eq(events.id, eventId))
      .returning();

    return { ok: true, event: updated } as const;
  });

  if (result.ok) {
    try {
      await recordAudit({
        actorUserId,
        accountId,
        action: "event.end",
        entityType: "event",
        entityId: eventId,
        before: { status: "live" },
        after: {
          status: "ended",
          retentionUntil: result.event.retentionUntil,
          quotaReturned: quotaReturned > 0 ? { amount: quotaReturned, entryType: ledgerEntryType } : null,
        },
      });
    } catch (err) {
      console.error("Gagal mencatat audit event.end:", err);
    }
  }

  return result;
}
