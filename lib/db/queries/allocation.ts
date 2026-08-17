/**
 * Alokasi dompet↔acara — Langkah 4 rencana Tahap 3, dok 02 §3.2 (jurnal
 * `allocation`/`deallocation`), AB-08. Terpisah dari
 * lib/db/queries/purchaseOrders.ts (yang menangani alokasi SAAT beli
 * paket baru) — di sini murni memindah strip yang SUDAH ada di dompet,
 * tanpa Order sama sekali.
 */
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../client";
import { accounts, events, orders, quotaLedger } from "../schema";
import { recordAudit } from "../../services/auditLog";

export type AllocateResult =
  | { ok: true; walletBalance: number; eventQuota: number }
  | { ok: false; reason: "insufficient_balance" | "event_not_found" };

/**
 * dok 02 §3.2 — sepasang baris jurnal `allocation` (dompet -X, acara +X).
 * Kunci baris `accounts` (FOR UPDATE) supaya dua alokasi bersamaan dari
 * dompet yang sama tidak bisa berdua lolos melebihi saldo — pola sama
 * claimQuota() (K1) diterapkan di sini karena Owner DAN Manager
 * (dok 01 §3.2) bisa memicu aksi ini bersamaan.
 *
 * SENGAJA tidak menolak acara `live` (beda dari deallocateEventToWallet
 * di bawah) — AB-08 cuma mengunci arah TARIK ("sisa kuota terkunci DI
 * ACARA itu") begitu live, tidak menyebut menambah. Menambah kuota ke
 * acara yang sedang berjalan (kehabisan strip di tengah acara) masuk
 * akal secara bisnis dan tidak merugikan tamu yang sedang berfoto,
 * beda dari menarik yang bisa membuat tamu berikutnya mendadak buntu.
 */
export async function allocateWalletToEvent(
  accountId: string,
  eventId: string,
  strips: number,
  actorUserId: string
): Promise<AllocateResult> {
  let quotaBefore = 0;

  const result = await db.transaction(async (tx) => {
    await tx.select({ id: accounts.id }).from(accounts).where(eq(accounts.id, accountId)).for("update");

    const [event] = await tx.select().from(events).where(eq(events.id, eventId));
    if (!event || event.accountId !== accountId) return { ok: false, reason: "event_not_found" } as const;

    const [{ walletBalance }] = await tx
      .select({ walletBalance: sql<number>`COALESCE(SUM(${quotaLedger.strips}), 0)::int` })
      .from(quotaLedger)
      .where(and(eq(quotaLedger.accountId, accountId), sql`${quotaLedger.eventId} IS NULL`));
    if (walletBalance < strips) return { ok: false, reason: "insufficient_balance" } as const;

    const [{ eventBalance }] = await tx
      .select({ eventBalance: sql<number>`COALESCE(SUM(${quotaLedger.strips}), 0)::int` })
      .from(quotaLedger)
      .where(eq(quotaLedger.eventId, eventId));

    const newWalletBalance = walletBalance - strips;
    const newEventBalance = eventBalance + strips;

    await tx.insert(quotaLedger).values([
      {
        accountId,
        eventId: null,
        entryType: "allocation",
        strips: -strips,
        balanceAfter: newWalletBalance,
        actorUserId,
        reason: "Alokasi manual dompet → acara",
      },
      {
        accountId,
        eventId,
        entryType: "allocation",
        strips,
        balanceAfter: newEventBalance,
        actorUserId,
        reason: "Alokasi manual dompet → acara",
      },
    ]);

    await tx.update(accounts).set({ cachedWalletBalance: newWalletBalance }).where(eq(accounts.id, accountId));
    await tx.update(events).set({ cachedQuota: sql`${events.cachedQuota} + ${strips}` }).where(eq(events.id, eventId));

    quotaBefore = event.cachedQuota;
    return { ok: true, walletBalance: newWalletBalance, eventQuota: newEventBalance } as const;
  });

  // Langkah 11 Tahap 4 (AB-22) — DI LUAR transaksi K1-serupa di atas
  // dengan sengaja: jurnal quota_ledger sudah jadi bukti utama uang
  // berpindah, audit_logs cuma jejak kedua untuk halaman staf (dok 04
  // §12). Gagal mencatat jejak TIDAK boleh membatalkan alokasi yang
  // sudah sukses (K14).
  if (result.ok) {
    try {
      await recordAudit({
        actorUserId,
        accountId,
        action: "quota.allocate",
        entityType: "event",
        entityId: eventId,
        before: { eventQuota: quotaBefore },
        after: { eventQuota: result.eventQuota },
        reason: "Alokasi manual dompet → acara",
      });
    } catch (err) {
      console.error("Gagal mencatat audit quota.allocate:", err);
    }
  }

  return result;
}

export type DeallocateResult =
  | { ok: true; walletBalance: number; eventQuota: number }
  | { ok: false; reason: "insufficient_quota" | "event_not_found" | "event_live" };

/**
 * AB-08 — "Alokasi bisa ditarik kembali selama acara belum `live`.
 * Setelah acara `live`, sisa kuota terkunci di acara itu sampai acara
 * `ended`." Pengembalian OTOMATIS saat `ended` (akun `flexible`) BUKAN
 * cakupan Tahap 3 (belum ada aksi "akhiri acara" di 8 butir dok 09 §5) —
 * fungsi ini CUMA jalur manual pra-`live`, ditolak keras kalau sudah
 * `live`/`ended`/status lain, bukan didiamkan lolos.
 */
export async function deallocateEventToWallet(
  accountId: string,
  eventId: string,
  strips: number,
  actorUserId: string
): Promise<DeallocateResult> {
  let quotaBefore = 0;

  const result = await db.transaction(async (tx) => {
    await tx.select({ id: accounts.id }).from(accounts).where(eq(accounts.id, accountId)).for("update");

    const [event] = await tx.select().from(events).where(eq(events.id, eventId)).for("update");
    if (!event || event.accountId !== accountId) return { ok: false, reason: "event_not_found" } as const;
    if (event.status !== "draft") return { ok: false, reason: "event_live" } as const;

    const [{ eventBalance }] = await tx
      .select({ eventBalance: sql<number>`COALESCE(SUM(${quotaLedger.strips}), 0)::int` })
      .from(quotaLedger)
      .where(eq(quotaLedger.eventId, eventId));
    if (eventBalance < strips) return { ok: false, reason: "insufficient_quota" } as const;

    const [{ walletBalance }] = await tx
      .select({ walletBalance: sql<number>`COALESCE(SUM(${quotaLedger.strips}), 0)::int` })
      .from(quotaLedger)
      .where(and(eq(quotaLedger.accountId, accountId), sql`${quotaLedger.eventId} IS NULL`));

    const newEventBalance = eventBalance - strips;
    const newWalletBalance = walletBalance + strips;

    await tx.insert(quotaLedger).values([
      {
        accountId,
        eventId,
        entryType: "deallocation",
        strips: -strips,
        balanceAfter: newEventBalance,
        actorUserId,
        reason: "Tarik kembali alokasi manual — acara belum live (AB-08)",
      },
      {
        accountId,
        eventId: null,
        entryType: "deallocation",
        strips,
        balanceAfter: newWalletBalance,
        actorUserId,
        reason: "Tarik kembali alokasi manual — acara belum live (AB-08)",
      },
    ]);

    await tx.update(accounts).set({ cachedWalletBalance: newWalletBalance }).where(eq(accounts.id, accountId));
    await tx.update(events).set({ cachedQuota: sql`${events.cachedQuota} - ${strips}` }).where(eq(events.id, eventId));

    quotaBefore = event.cachedQuota;
    return { ok: true, walletBalance: newWalletBalance, eventQuota: newEventBalance } as const;
  });

  // Langkah 11 Tahap 4 — lihat catatan K14 di allocateWalletToEvent().
  if (result.ok) {
    try {
      await recordAudit({
        actorUserId,
        accountId,
        action: "quota.deallocate",
        entityType: "event",
        entityId: eventId,
        before: { eventQuota: quotaBefore },
        after: { eventQuota: result.eventQuota },
        reason: "Tarik kembali alokasi manual — acara belum live (AB-08)",
      });
    } catch (err) {
      console.error("Gagal mencatat audit quota.deallocate:", err);
    }
  }

  return result;
}

/** Saldo dompet SEKARANG, dihitung dari jurnal (bukan cache) — dipakai
    validasi sisi server sebelum menampilkan slider/menerima alokasi. */
export async function getWalletBalance(accountId: string): Promise<number> {
  const [{ balance }] = await db
    .select({ balance: sql<number>`COALESCE(SUM(${quotaLedger.strips}), 0)::int` })
    .from(quotaLedger)
    .where(and(eq(quotaLedger.accountId, accountId), sql`${quotaLedger.eventId} IS NULL`));
  return balance;
}

export interface ActiveDaysOption {
  activeDays: number;
  packageName: string;
}

/**
 * Pilihan masa aktif untuk acara vendor BARU dibuat lewat alokasi dompet
 * (bukan beli paket baru) — keputusan pemilik produk: TIDAK ditebak dari
 * "paket terakhir dibeli" (dompet bisa campuran beberapa pembelian beda
 * masa aktif), klien yang pilih sendiri di wizard dari daftar paket yang
 * PERNAH benar-benar dibeli & lunas akun ini. Dedupe by activeDays —
 * kalau 2 paket kebetulan activeDays sama, cuma tampil sekali.
 */
export async function getActiveDaysOptionsForAccount(accountId: string): Promise<ActiveDaysOption[]> {
  const rows = await db
    .select({ packageSnapshot: orders.packageSnapshot })
    .from(orders)
    .where(and(eq(orders.accountId, accountId), eq(orders.status, "fulfilled")))
    .orderBy(desc(orders.createdAt));

  const seen = new Map<number, string>();
  for (const row of rows) {
    const snap = row.packageSnapshot as { activeDays?: number; name?: string };
    if (typeof snap.activeDays === "number" && !seen.has(snap.activeDays)) {
      seen.set(snap.activeDays, snap.name ?? `${snap.activeDays} hari`);
    }
  }
  return [...seen.entries()]
    .map(([activeDays, packageName]) => ({ activeDays, packageName }))
    .sort((a, b) => a.activeDays - b.activeDays);
}
