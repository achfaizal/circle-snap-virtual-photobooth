import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "../client";
import { notifications, type notificationTypeEnum, type notificationChannelEnum } from "../schema/notifications";

type NotificationType = (typeof notificationTypeEnum.enumValues)[number];
type NotificationChannel = (typeof notificationChannelEnum.enumValues)[number];

export interface CreateNotificationInput {
  userId: string;
  accountId?: string | null;
  type: NotificationType;
  title: string;
  body?: string | null;
  linkUrl?: string | null;
  channel: NotificationChannel[];
  meta?: unknown;
}

/**
 * Langkah 13 Tahap 4 — `sent_at` cuma diisi untuk `in_app` (satu-satunya
 * saluran yang BENAR-BENAR jalan, lihat catatan rencana Tahap 4
 * Context) — email/whatsapp tetap tercatat di `channel` (niatnya jujur)
 * tapi `sent_at` dibiarkan kosong untuk baris yang cuma dituju ke
 * saluran itu tanpa in_app, supaya tidak berbohong "sudah terkirim".
 */
export async function createNotification(input: CreateNotificationInput) {
  const [row] = await db
    .insert(notifications)
    .values({
      userId: input.userId,
      accountId: input.accountId ?? null,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      linkUrl: input.linkUrl ?? null,
      channel: input.channel,
      meta: input.meta ?? null,
      sentAt: input.channel.includes("in_app") ? new Date() : null,
    })
    .returning();
  return row;
}

export async function listNotificationsForUser(userId: string, limit = 20) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return rows.length;
}

/** K5-serupa: `userId` WAJIB dicocokkan juga, bukan cuma `id` — supaya
    satu user tidak bisa menandai notifikasi user lain lewat id tebakan. */
export async function markNotificationRead(id: string, userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}
