/**
 * Langkah 18 Tahap 4 — retensi & penghapusan media (AB-21, dok 08 §2.3).
 * DUA mode terpisah (dijadwalkan beda jadwal — bukan satu cron sama):
 *
 *   npx tsx --env-file=.env.local scripts/run-retention-cleanup.ts
 *     → dry-run (BAWAAN, tidak menghapus apa pun, cuma laporan)
 *   npx tsx --env-file=.env.local scripts/run-retention-cleanup.ts --confirm
 *     → HAPUS SUNGGUHAN (objek storage + baris `assets`), pola sama
 *       migrate-clients-events.ts (dry-run wajib default)
 *   npx tsx --env-file=.env.local scripts/run-retention-cleanup.ts --warn
 *     → kirim notifikasi retention.warning H-14 (dok 03 §8.3), TIDAK
 *       menghapus apa pun — dijadwalkan LEBIH SERING/independen dari
 *       dua mode di atas (mis. harian), sesuai rencana Tahap 4.
 *
 * AB-21: "metadata dan jumlah strip tetap disimpan" — baris `strips`
 * TIDAK PERNAH dihapus di sini, cuma `image_asset_id`/`video_asset_id`
 * dikosongkan + baris `assets` & objek storage sungguhan dihapus.
 * Penjadwalan cron SUNGGUHAN (Vercel Cron/Task Scheduler) di luar
 * cakupan — skrip ini cuma perlu SIAP dipanggil skedul apa pun.
 */
import { unlink } from "node:fs/promises";
import path from "node:path";
import { del as blobDel } from "@vercel/blob";
import { and, eq, inArray, isNotNull, lte, or, sql } from "drizzle-orm";
import { db } from "../lib/db/client";
import { events } from "../lib/db/schema/events";
import { strips, voiceNotes } from "../lib/db/schema/sessions";
import { assets } from "../lib/db/schema/templates";
import { notifications } from "../lib/db/schema/notifications";
import { accountMembers } from "../lib/db/schema/identity";
import { recordAudit } from "../lib/services/auditLog";
import { createNotification } from "../lib/db/queries/notifications";

const args = process.argv.slice(2);
const isConfirm = args.includes("--confirm");
const isWarnOnly = args.includes("--warn");
const isDryRun = !isConfirm && !isWarnOnly;

/** `storage_key` sudah URL siap pakai (lihat lib/db/queries/sessions.ts)
    — path relatif `/moments-local/...` di dev (di bawah public/), URL
    Blob penuh di produksi. ENOENT (file sudah hilang duluan, mis.
    dihapus manual) diperlakukan sebagai sukses, bukan error — tujuan
    akhirnya "objek tidak ada lagi" sudah tercapai. */
async function deleteStorageObject(storageKey: string): Promise<void> {
  if (storageKey.startsWith("http")) {
    await blobDel(storageKey);
    return;
  }
  try {
    await unlink(path.join(process.cwd(), "public", storageKey));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}

/** H-14 (dok 03 §8.3) — idempoten lewat `notifications.meta->>eventId`,
    sama pola dengan maybeNotifyQuotaThreshold(). Cuma events yang
    retention_until-nya masih 1-14 hari lagi (belum lewat — yang sudah
    lewat itu tugas runCleanup(), bukan diberi peringatan lagi). */
async function runWarnings(): Promise<void> {
  const now = new Date();
  const in14Days = new Date(now.getTime() + 14 * 86400 * 1000);

  const dueEvents = await db
    .select()
    .from(events)
    .where(and(eq(events.status, "ended"), isNotNull(events.retentionUntil), lte(events.retentionUntil, in14Days)));

  let sent = 0;
  for (const event of dueEvents) {
    if (!event.retentionUntil || event.retentionUntil.getTime() <= now.getTime()) continue; // sudah lewat — bukan lagi "akan"

    const [already] = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.type, "retention.warning"), sql`${notifications.meta}->>'eventId' = ${event.id}`))
      .limit(1);
    if (already) continue;

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

    const tanggal = event.retentionUntil.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
    for (const r of recipients) {
      await createNotification({
        userId: r.userId,
        accountId: event.accountId,
        type: "retention.warning",
        title: "Media acara akan dihapus permanen",
        body: `Foto & video "${event.internalName}" akan dihapus pada ${tanggal} (AB-21, 90 hari sejak acara diakhiri). Unduh sekarang kalau belum.`,
        linkUrl: `/app/events/${event.id}/moments`,
        channel: ["in_app"],
        meta: { eventId: event.id },
      });
    }
    if (recipients.length > 0) sent++;
    console.log(`  peringatan H-14: "${event.internalName}" (${event.id}) → ${recipients.length} penerima`);
  }
  console.log(`\n${sent} acara diberi peringatan retensi.`);
}

async function runCleanup(): Promise<void> {
  const now = new Date();
  const dueEvents = await db
    .select()
    .from(events)
    .where(and(eq(events.status, "ended"), isNotNull(events.retentionUntil), lte(events.retentionUntil, now)));

  console.log(`${dueEvents.length} acara sudah lewat masa retensi.\n`);

  for (const event of dueEvents) {
    const dueStrips = await db
      .select()
      .from(strips)
      .where(and(eq(strips.eventId, event.id), or(isNotNull(strips.imageAssetId), isNotNull(strips.videoAssetId))));

    if (dueStrips.length === 0) {
      console.log(`  "${event.internalName}" — sudah bersih, dilewati.`);
      continue;
    }
    console.log(`  "${event.internalName}" (${event.id}) — ${dueStrips.length} strip punya media.`);

    let deletedCount = 0;
    for (const strip of dueStrips) {
      const assetIds = [strip.imageAssetId, strip.videoAssetId].filter((x): x is string => !!x);
      const assetRows = assetIds.length > 0 ? await db.select().from(assets).where(inArray(assets.id, assetIds)) : [];

      if (isDryRun) {
        console.log(`    [dry-run] ${strip.receiptNo}: akan hapus ${assetRows.length} objek storage.`);
        deletedCount++;
        continue;
      }

      for (const asset of assetRows) {
        try {
          await deleteStorageObject(asset.storageKey);
        } catch (err) {
          console.error(`    gagal hapus objek storage ${asset.storageKey}:`, err);
        }
      }
      // Baris `strips` TETAP ADA (AB-21 "metadata tetap disimpan") —
      // cuma referensi asetnya dikosongkan.
      await db.update(strips).set({ imageAssetId: null, videoAssetId: null }).where(eq(strips.id, strip.id));
      if (assetIds.length > 0) await db.delete(assets).where(inArray(assets.id, assetIds));

      const voiceRows = await db.select().from(voiceNotes).where(eq(voiceNotes.stripId, strip.id));
      for (const vn of voiceRows) {
        const [voiceAsset] = await db.select().from(assets).where(eq(assets.id, vn.assetId));
        if (voiceAsset) {
          try {
            await deleteStorageObject(voiceAsset.storageKey);
          } catch (err) {
            console.error(`    gagal hapus pesan suara ${voiceAsset.storageKey}:`, err);
          }
          await db.delete(assets).where(eq(assets.id, voiceAsset.id));
        }
      }
      if (voiceRows.length > 0) await db.delete(voiceNotes).where(eq(voiceNotes.stripId, strip.id));

      deletedCount++;
    }

    console.log(`    ${isDryRun ? "akan diproses" : "diproses"}: ${deletedCount} strip.`);

    if (!isDryRun) {
      try {
        await recordAudit({
          actorUserId: null, // dipicu skrip terjadwal, bukan staf — dok 03 §8.1 "null = sistem"
          accountId: event.accountId,
          action: "media.retention_delete",
          entityType: "event",
          entityId: event.id,
          after: { deletedStripsCount: deletedCount },
          reason: "Retensi 90 hari sejak acara diakhiri lewat (AB-21)",
        });
      } catch (err) {
        console.error("    gagal mencatat audit media.retention_delete:", err);
      }
    }
  }
}

async function main() {
  if (isWarnOnly) {
    console.log("=== Peringatan retensi H-14 ===\n");
    await runWarnings();
    return;
  }
  console.log(isDryRun ? "=== DRY-RUN — tidak ada yang benar-benar dihapus ===\n" : "=== KONFIRMASI — objek storage akan DIHAPUS PERMANEN ===\n");
  await runCleanup();
}

main().then(() => process.exit(0));
