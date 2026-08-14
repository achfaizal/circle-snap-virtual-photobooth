/**
 * Menerapkan efek satu Order yang BARU DITANDAI LUNAS — server-only
 * (menyentuh repo langsung), dipanggil SATU tempat: rute konfirmasi
 * (app/api/admin/orders/[id]/confirm/route.ts).
 *
 * Sengaja dipisah dari lib/services/addons.ts (yang murni katalog,
 * aman diimpor komponen "use client") supaya import server-only ini
 * tidak pernah tidak sengaja ikut ke bundel klien.
 */
import { computeExpiresAt } from "@/lib/services/eventLifecycle";
import type { Order } from "@/lib/models/order";
import type { Repo } from "@/lib/repo";

export async function applyOrderEffect(order: Order, repo: Repo): Promise<void> {
  // "new_plan" murni jejak pembayaran — kuota & Client.planId/
  // eventSlotsTotal SUDAH diterapkan saat event dibuat (event tidak
  // bisa menunggu konfirmasi staff sebelum klien bisa mulai mengatur
  // Visual Builder-nya). Menandai lunas di sini tidak mengubah data
  // apa pun lagi, cuma mencatat "sudah dibayar".
  if (order.kind === "new_plan") return;

  if (order.kind === "add_event_slot") {
    const client = await repo.clients.getById(order.clientId);
    if (!client) return;
    const current = client.eventSlotsTotal ?? 1; // akun lama tanpa field ini dianggap 1 (jatah bawaan)
    await repo.clients.update(client.id, { eventSlotsTotal: current + order.amount });
    return;
  }

  if (!order.eventId) return; // topup_strip/extend_days wajib eventId — jaga-jaga data lama/rusak
  const subscription = await repo.subscriptions.getByEventId(order.eventId);
  if (!subscription) return;

  if (order.kind === "topup_strip") {
    await repo.subscriptions.update(subscription.id, {
      stripQuota: subscription.stripQuota + order.amount,
      // Kuota yang tadinya "habis" (status exhausted) aktif lagi setelah
      // ditambah — tanpa ini klien bayar top-up tapi tamu masih digerbang.
      status: subscription.status === "exhausted" ? "active" : subscription.status,
    });
    return;
  }

  if (order.kind === "extend_days") {
    // Diperpanjang dari expiresAt LAMA (bukan dari "sekarang") supaya
    // klien yang membeli SEBELUM habis tidak kehilangan sisa waktunya —
    // dan yang membeli SETELAH habis tetap dapat penuh jumlah harinya,
    // bukan cuma "sampai hari ini + N" yang memotong durasi janjinya
    // sendiri kalau baru dikonfirmasi staff beberapa hari kemudian.
    const base = subscription.expiresAt ?? new Date().toISOString();
    await repo.subscriptions.update(subscription.id, {
      expiresAt: computeExpiresAt(base, order.amount),
      status: subscription.status === "expired" ? "active" : subscription.status,
    });
  }
}
