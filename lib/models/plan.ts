/**
 * PAKET & LANGGANAN
 *
 * `Plan` = katalog yang dijual, dikelola Circle Snap.
 * `Subscription` = kesepakatan nyata untuk SATU event, nilainya DISALIN
 * dari Plan saat pembelian — supaya kalau isi paket berubah bulan depan,
 * kesepakatan klien lama tidak ikut berubah.
 *
 * ⚠️ `stripUsed` dan `storageUsedMb` HANYA boleh ditulis server. Ini
 * jawaban atas temuan 06-T1: kuota sekarang dihitung di localStorage
 * perangkat tamu, jadi tidak pernah benar-benar habis. Lihat
 * docs/blueprint/04-arsitektur.md bagian 6 untuk rancangan klaimnya.
 */

export interface PlanFeatures {
  voiceNote: boolean;
  momentsGallery: boolean;
  bulkDownload: boolean;
  removeCircleSnapBranding: boolean;
  /** false = klien hanya boleh pakai pustaka bingkai Circle Snap, tidak upload sendiri. */
  customFrameUpload: boolean;
}

export interface Plan {
  id: string;
  name: string;
  priceIdr: number;
  /** "personal" = untuk akun Acara Sendiri (1 event seumur akun).
      "vendor" = untuk akun Vendor/EO (banyak event, lihat `eventSlots`). */
  audience: "personal" | "vendor";
  /** Jatah event yang didapat SEKALI membeli paket ini — 1 untuk semua
      paket personal (sudah ditegakkan terpisah lewat Client.type), M
      untuk paket Vendor/EO. Disalin ke Client.eventSlotsTotal saat
      paket ini pertama kali dipilih (app/api/admin/events/route.ts). */
  eventSlots: number;

  stripQuota: number;
  maxFrames: number;
  maxVoiceSeconds: number;
  storageMb: number;
  /** Masa hidup event sejak `Event.startAt` (bukan sejak dipublikasikan
      — lihat lib/services/eventLifecycle.ts). */
  activeDays: number;

  features: PlanFeatures;
}

export interface Subscription {
  id: string;
  clientId: string;
  eventId: string;
  /** Jejak asal, bukan sumber kebenaran — lihat nilai yang disalin di bawah. */
  planId: string;

  stripQuota: number;
  maxFrames: number;
  maxVoiceSeconds: number;
  storageMb: number;
  features: PlanFeatures;

  /** ⚠️ HANYA server yang boleh menulis kedua field ini. */
  stripUsed: number;
  storageUsedMb: number;

  status: "active" | "exhausted" | "expired";
  startsAt: string;
  expiresAt: string;
}

export function subscriptionFromPlan(
  plan: Plan,
  clientId: string,
  eventId: string,
  startsAt: string
): Omit<Subscription, "id"> {
  const expires = new Date(startsAt);
  expires.setDate(expires.getDate() + plan.activeDays);

  return {
    clientId,
    eventId,
    planId: plan.id,
    stripQuota: plan.stripQuota,
    maxFrames: plan.maxFrames,
    maxVoiceSeconds: plan.maxVoiceSeconds,
    storageMb: plan.storageMb,
    features: { ...plan.features },
    stripUsed: 0,
    storageUsedMb: 0,
    status: "active",
    startsAt,
    expiresAt: expires.toISOString(),
  };
}
