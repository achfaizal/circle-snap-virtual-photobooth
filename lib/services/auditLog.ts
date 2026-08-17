import { db } from "@/lib/db/client";
import { auditLogs } from "@/lib/db/schema/audit";

export interface RecordAuditInput {
  actorUserId?: string | null; // null = tindakan sistem (dok 03 §8.1)
  actorIp?: string | null;
  accountId?: string | null; // null = di luar konteks akun mana pun
  action: string; // "event.publish", "order.verify", "quota.adjust", dst
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
}

/**
 * Langkah 10 Tahap 4 — AB-22 "wajib dicatat: semua perubahan uang, kuota,
 * status acara, peran, penangguhan, impersonasi, penghapusan media."
 * Fungsi murni, TIDAK menelan errornya sendiri (beda dari K14 di titik
 * panggil) — pemanggil yang memutuskan apakah gagal mencatat audit boleh
 * mengganggu aksi utamanya atau tidak (pola sama try/catch di
 * app/api/quota/claim/route.ts untuk fondasi Momen Langkah 5).
 */
export async function recordAudit(input: RecordAuditInput): Promise<void> {
  await db.insert(auditLogs).values({
    actorUserId: input.actorUserId ?? null,
    actorIp: input.actorIp ?? null,
    accountId: input.accountId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    before: input.before ?? null,
    after: input.after ?? null,
    reason: input.reason ?? null,
  });
}

/** `x-forwarded-for` bisa berisi daftar (proxy berantai) — ambil yang
    pertama (klien asli). `null` kalau memang tidak ada (mis. dev lokal
    tanpa proxy di depan) — bukan alasan menggagalkan pencatatan audit. */
export function getActorIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return request.headers.get("x-real-ip");
}
