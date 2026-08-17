import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client";
import { events } from "../db/schema/events";
import { quotaLedger } from "../db/schema/commercial";
import { accountMembers } from "../db/schema/identity";
import { notifications } from "../db/schema/notifications";
import { createNotification } from "../db/queries/notifications";

export interface QuotaThreshold {
  target: "quota.low" | "quota.empty" | null;
  percentRemaining: number;
}

/** Fungsi murni (dok 03 §8.3: "quota.low" sisa ≤20%, "quota.empty" sisa
    0) — dites langsung tanpa DB di scripts/test-quota-notify.ts. */
export function computeQuotaThreshold(remaining: number, totalQuota: number): QuotaThreshold {
  if (totalQuota <= 0) return { target: null, percentRemaining: 0 };
  const percentRemaining = (remaining / totalQuota) * 100;
  if (remaining <= 0) return { target: "quota.empty", percentRemaining };
  if (percentRemaining <= 20) return { target: "quota.low", percentRemaining };
  return { target: null, percentRemaining };
}

/**
 * Langkah 14 Tahap 4 — dipanggil SETELAH claimQuota()/allocateWalletToEvent()/
 * deallocateEventToWallet() commit (transaksi K1/alokasi sendiri, TIDAK
 * disentuh sama sekali di sini). Idempoten: tidak menulis notifikasi
 * dobel untuk ambang yang sama sampai kuota sempat naik lagi di atas
 * ambang (dicek dari histori `quota_ledger` sejak notifikasi terakhir —
 * pendekatan wajar, BUKAN persis karena `cachedQuota` bisa berubah di
 * antaranya kalau ada alokasi tambahan; cukup akurat untuk pemberitahuan
 * "heads up", bukan angka finansial).
 */
export async function maybeNotifyQuotaThreshold(eventId: string): Promise<void> {
  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event) return;

  const [{ balance }] = await db
    .select({ balance: sql<number>`COALESCE(SUM(${quotaLedger.strips}), 0)::int` })
    .from(quotaLedger)
    .where(eq(quotaLedger.eventId, eventId));

  const { target, percentRemaining } = computeQuotaThreshold(balance, event.cachedQuota);
  if (!target) return;

  const [lastNotif] = await db
    .select()
    .from(notifications)
    .where(
      and(
        inArray(notifications.type, ["quota.low", "quota.empty"]),
        sql`${notifications.meta}->>'eventId' = ${eventId}`
      )
    )
    .orderBy(desc(notifications.createdAt))
    .limit(1);

  if (lastNotif && lastNotif.type === target) {
    // Ambang sama persis dengan notifikasi terakhir — cuma kirim lagi
    // kalau sempat pulih di atas 20% sejak itu (dicek dari histori
    // jurnal, bukan cache).
    const [recovered] = await db
      .select({ id: quotaLedger.id })
      .from(quotaLedger)
      .where(
        and(
          eq(quotaLedger.eventId, eventId),
          sql`${quotaLedger.createdAt} > ${lastNotif.createdAt}`,
          sql`(${quotaLedger.balanceAfter}::numeric / NULLIF(${event.cachedQuota}, 0)::numeric) * 100 > 20`
        )
      )
      .limit(1);
    if (!recovered) return;
  }

  // dok 03 §8.3 — ke owner+manager, bukan operator (operator tidak
  // punya akses billing/kuota, dok 01 §3.2).
  const recipients = await db
    .select({ userId: accountMembers.userId })
    .from(accountMembers)
    .where(
      and(
        eq(accountMembers.accountId, event.accountId),
        inArray(accountMembers.role, ["owner", "manager"]),
        eq(accountMembers.status, "active")
      )
    );

  const title = target === "quota.empty" ? "Kuota acara habis" : "Kuota acara tinggal sedikit";
  const body =
    target === "quota.empty"
      ? `Kuota "${event.internalName}" sudah habis. Tamu tidak bisa lagi berfoto sampai kuota ditambah.`
      : `Sisa kuota "${event.internalName}" tinggal ${Math.round(percentRemaining)}% (${balance} strip).`;

  for (const r of recipients) {
    await createNotification({
      userId: r.userId,
      accountId: event.accountId,
      type: target,
      title,
      body,
      linkUrl: `/app/events/${event.id}/details`,
      // email/whatsapp TIDAK benar-benar terkirim (tidak ada infrastruktur
      // SMTP/WA di proyek ini, sama gap dengan verifikasi email) — cuma
      // in_app yang dicatat sebagai saluran supaya tidak berbohong "sudah
      // dikirim" untuk saluran yang sebenarnya tidak jalan.
      channel: ["in_app"],
      meta: { eventId: event.id },
    });
  }
}
