/**
 * KATALOG PAKET — docs/blueprint/09-brd-model-bisnis.md §5.5.
 *
 * Hardcode di sini, sama pola dengan ADDON_CATALOG (lib/services/
 * addons.ts) — belum ada admin katalog Plan yang bisa diatur staff
 * (itu bagian panel Staff, sengaja belum dikerjakan). Kalau nanti ada,
 * pindahkan isinya ke sana, jangan dobel sumber kebenaran harga.
 *
 * Perbedaan fitur antar tier mengikuti struktur "makin mahal, makin
 * lengkap" di BRD §6, dengan DUA penyimpangan yang disengaja:
 *
 * 1. `voiceNote` TETAP menyala di Basic (bukan dikunci total) tapi
 *    durasinya pendek (5 detik vs 15 detik) — alternatif yang disebut
 *    BRD sendiri, supaya paket termurah tidak "cuma photobooth biasa"
 *    tanpa pembeda utama produk.
 *
 * 2. ⚠️ `customFrameUpload` MENYALA DI SEMUA TIER, menyimpang dari
 *    tabel BRD §6 yang menguncinya ke Pro/EO Growth. Alasannya
 *    keputusan produk, bukan teknis: membangun bingkai sendiri adalah
 *    ALASAN UTAMA produk ini ada ("klien beli strip → build bingkai
 *    sendiri → build playground sendiri"), bukan hiasan tier atas.
 *    Menguncinya membuat klien Basic/Plus/EO Starter tidak punya cara
 *    APA PUN menaruh namanya sendiri di strip — bingkai pustaka
 *    bersama sengaja read-only bagi klien (lihat
 *    app/admin/(protected)/frames/[id]/page.tsx). Pembeda antar tier
 *    sekarang: kuota strip, masa aktif, durasi suara, jumlah bingkai
 *    (`maxFrames`), bulk download, dan branding.
 */
import type { Plan } from "@/lib/models/plan";

const PLAN_CATALOG: Plan[] = [
  {
    id: "basic",
    name: "Basic",
    audience: "personal",
    eventSlots: 1,
    priceIdr: 249_000,
    stripQuota: 100,
    maxFrames: 10,
    maxVoiceSeconds: 5,
    storageMb: 500,
    activeDays: 7,
    features: {
      voiceNote: true,
      momentsGallery: true,
      bulkDownload: false,
      removeCircleSnapBranding: false,
      customFrameUpload: true,
    },
  },
  {
    id: "plus",
    name: "Plus",
    audience: "personal",
    eventSlots: 1,
    priceIdr: 449_000,
    stripQuota: 200,
    maxFrames: 15,
    maxVoiceSeconds: 15,
    storageMb: 1000,
    activeDays: 7,
    features: {
      voiceNote: true,
      momentsGallery: true,
      bulkDownload: true,
      removeCircleSnapBranding: false,
      customFrameUpload: true,
    },
  },
  {
    id: "pro",
    name: "Pro",
    audience: "personal",
    eventSlots: 1,
    priceIdr: 799_000,
    stripQuota: 400,
    maxFrames: 30,
    maxVoiceSeconds: 15,
    storageMb: 2000,
    activeDays: 7,
    features: {
      voiceNote: true,
      momentsGallery: true,
      bulkDownload: true,
      removeCircleSnapBranding: true,
      customFrameUpload: true,
    },
  },
  {
    id: "eo-starter",
    name: "EO Starter",
    audience: "vendor",
    eventSlots: 3,
    priceIdr: 1_149_000,
    stripQuota: 200,
    maxFrames: 15,
    maxVoiceSeconds: 15,
    storageMb: 1000,
    activeDays: 7,
    features: {
      voiceNote: true,
      momentsGallery: true,
      bulkDownload: true,
      removeCircleSnapBranding: false,
      customFrameUpload: true,
    },
  },
  {
    id: "eo-growth",
    name: "EO Growth",
    audience: "vendor",
    eventSlots: 10,
    priceIdr: 3_299_000,
    stripQuota: 200,
    maxFrames: 30,
    maxVoiceSeconds: 15,
    storageMb: 2000,
    // 14 hari, bukan 7 — BRD §5.5 & §10 poin 9: EO menangani acara milik
    // KLIEN-nya, bukan acaranya sendiri; kalau lewat 7 hari, yang
    // dimarahi bukan Circle Snap, tapi EO oleh kliennya sendiri.
    activeDays: 14,
    features: {
      voiceNote: true,
      momentsGallery: true,
      bulkDownload: true,
      removeCircleSnapBranding: true,
      customFrameUpload: true,
    },
  },
];

export function planById(id: string): Plan | undefined {
  return PLAN_CATALOG.find((p) => p.id === id);
}

export function plansFor(audience: "personal" | "vendor"): Plan[] {
  return PLAN_CATALOG.filter((p) => p.audience === audience);
}
