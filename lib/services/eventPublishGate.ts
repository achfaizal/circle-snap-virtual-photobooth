/**
 * Gerbang publikasi ACARA — Langkah 9 Tahap 3, 11 poin persis dok 05
 * §5.5. BEDA dari lib/services/templatePublishGate.ts (Tahap 2, 8 poin
 * — itu menggerbangi STAF menerbitkan TEMPLATE; ini menggerbangi KLIEN
 * menerbitkan ACARA). Kutipan riset BRD: "Gerbang 7 dan 11 tidak ada di
 * implementasi sekarang dan wajib ditambahkan."
 *
 * Poin 10 (email terverifikasi) SECARA SENGAJA formalitas — keputusan
 * pemilik produk: tidak ada infrastruktur kirim-email di aplikasi ini,
 * emailVerifiedAt diisi otomatis saat daftar (app/api/app/register).
 * Poin ini tetap DIHITUNG di sini (BRD memang menyebutnya), bukan
 * dihapus diam-diam — kalau nanti verifikasi sungguhan dibangun, gerbang
 * ini langsung ikut berlaku tanpa perlu ditulis ulang.
 */
import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/client";
import { events, eventFrames, eventVariableValues } from "../db/schema/events";
import { templateVariables } from "../db/schema/templates";
import { orders, quotaLedger } from "../db/schema/commercial";
import { users } from "../db/schema/identity";

export interface PublishGateResult {
  canPublish: boolean;
  failed: { point: number; label: string }[];
}

export async function canPublishEvent(eventId: string): Promise<PublishGateResult> {
  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event) return { canPublish: false, failed: [{ point: 0, label: "Acara tidak ditemukan." }] };

  const failed: { point: number; label: string }[] = [];

  // 1. Minimal 1 bingkai aktif (AB-17)
  const [{ activeFrames }] = await db
    .select({ activeFrames: sql<number>`count(*)::int` })
    .from(eventFrames)
    .where(and(eq(eventFrames.eventId, eventId), eq(eventFrames.isEnabled, true)));
  if (activeFrames === 0) failed.push({ point: 1, label: "Minimal 1 bingkai aktif" });

  // 2. Nama yang ditampilkan terisi
  if (!event.displayNames?.trim()) failed.push({ point: 2, label: "Nama yang ditampilkan terisi" });

  // 3. Tanggal tampil terisi
  if (!event.dateDisplay?.trim()) failed.push({ point: 3, label: "Tanggal tampil terisi" });

  // 4. Sambutan terisi
  if (!event.greeting?.trim()) failed.push({ point: 4, label: "Sambutan terisi" });

  // 5. Jadwal mulai terisi
  if (!event.startsAt) failed.push({ point: 5, label: "Jadwal mulai terisi" });

  // 6. Template sudah dipilih
  if (!event.templateId) failed.push({ point: 6, label: "Template sudah dipilih" });

  // 7. Semua variabel wajib template terisi
  let requiredVars: { key: string; label: string }[] = [];
  if (event.templateId) {
    requiredVars = await db
      .select({ key: templateVariables.key, label: templateVariables.label })
      .from(templateVariables)
      .where(and(eq(templateVariables.templateId, event.templateId), eq(templateVariables.isRequired, true)));
  }
  if (requiredVars.length > 0) {
    const values = await db
      .select({ key: eventVariableValues.variableKey, value: eventVariableValues.valueText })
      .from(eventVariableValues)
      .where(eq(eventVariableValues.eventId, eventId));
    const valueMap = new Map(values.map((v) => [v.key, v.value]));
    const missing = requiredVars.filter((v) => !valueMap.get(v.key)?.trim());
    if (missing.length > 0) {
      failed.push({ point: 7, label: `Semua variabel wajib template terisi (kosong: ${missing.map((v) => v.label).join(", ")})` });
    }
  }

  // 8. Kuota acara > 0 — dihitung dari jurnal (bukan cache), sama
  // disiplin dengan claimQuota()/allocation.ts.
  const [{ balance }] = await db
    .select({ balance: sql<number>`COALESCE(SUM(${quotaLedger.strips}), 0)::int` })
    .from(quotaLedger)
    .where(eq(quotaLedger.eventId, eventId));
  if (balance <= 0) failed.push({ point: 8, label: "Kuota acara lebih dari 0" });

  // 9. Pesanan sudah lunas (HANYA relevan kalau acara ini dibiayai
  // Order — paket single_event/Perorangan. Acara vendor dari alokasi
  // dompet TIDAK punya Order sama sekali, poin ini otomatis lolos —
  // bukan "diam-diam dilewati", memang tidak berlaku untuknya.
  const [order] = await db.select().from(orders).where(eq(orders.targetEventId, eventId));
  if (order && order.status !== "fulfilled") {
    failed.push({ point: 9, label: "Pesanan sudah lunas" });
  }

  // 10. Email sudah diverifikasi — lihat catatan berkas: formalitas,
  // selalu terisi otomatis saat daftar (Langkah 9, keputusan produk).
  const [creator] = await db.select({ emailVerifiedAt: users.emailVerifiedAt }).from(users).where(eq(users.id, event.createdByUserId));
  if (!creator?.emailVerifiedAt) failed.push({ point: 10, label: "Email sudah diverifikasi" });

  // 11. Minimal satu tombol unduh menyala
  const share = (event.sessionConfig as { share?: { downloadPng?: boolean; downloadJpg?: boolean; downloadVideo?: boolean } })?.share;
  if (!share?.downloadPng && !share?.downloadJpg && !share?.downloadVideo) {
    failed.push({ point: 11, label: "Minimal satu tombol unduh menyala" });
  }

  return { canPublish: failed.length === 0, failed };
}
