/**
 * ADAPTER — model repo (lib/models/*) → bentuk lama (EventConfig/Template)
 * yang masih dipahami semua komponen playground.
 *
 * KENAPA INI ADA (bukan refactor semua komponen sekaligus):
 * Merombak field access di 8 komponen (StepFrame, StepShoot, StepVoice,
 * StepResult, StripCanvas, MomentsGallery, WelcomeScreen, FrameAssembly)
 * sekaligus adalah operasi berisiko tinggi tanpa manfaat langsung —
 * bentuk EventConfig/Template sudah teruji dan dipakai produksi. Adapter
 * ini membiarkan komponen itu TIDAK TERSENTUH, sambil membuat sumber
 * datanya sungguhan berasal dari repository (memenuhi prinsip P2 di
 * docs/blueprint/00-ikhtisar.md: admin menulis ke tempat yang sama yang
 * dibaca playground).
 *
 * Kapan adapter ini bisa dibuang: kalau nanti ada alasan nyata untuk
 * komponen membaca event.identity.names langsung (bukan event.names),
 * bukan sekadar "supaya konsisten". Sampai itu terjadi, biarkan.
 */
import type { Asset } from "../models/asset";
import type { Event } from "../models/event";
import type { Frame } from "../models/frame";
import type { Subscription } from "../models/plan";
import type { Theme } from "../models/theme";
import type { EventConfig, EventTheme } from "../event";
import type { Template } from "../templates";
import { effectiveStatus } from "../services/eventLifecycle";

/**
 * MENAMBAH FONT BARU — 3 langkah yang HARUS sinkron.
 *
 * Kanvas tidak bisa membaca CSS variable berlapis, jadi nama family
 * aslinya wajib diekspos terpisah:
 *
 *   1. Impor font-nya lewat next/font di app/layout.tsx
 *   2. Ekspos --canvas-font-<id> di <html> (app/layout.tsx)
 *   3. Daftarkan di KEDUA peta di bawah: FONT_DISPLAY_CSS (tampilan
 *      layar) dan CANVAS_FONT_CSS (hasil unduhan)
 *
 * Lupa langkah 2/3 = teks di berkas unduhan beda dengan yang di layar.
 * Ini PERNAH terjadi: Playfair benar di layar, tapi kanvas ekspor selalu
 * Jakarta (diperbaiki 2026-08-11).
 */
/** Peta fontDisplayId ke nilai CSS var — SUMBER KEBENARAN font yang tersedia
    yang sudah di-load lewat next/font di app/layout.tsx — dua peta
    PARALEL wajib sinkron 1:1 (satu untuk layar, satu untuk kanvas
    ekspor), lihat catatan panjang di app/layout.tsx & lib/event.ts
    (`canvasFontDisplay`) kenapa dua-duanya perlu ada. "jakarta" sengaja
    tidak dipetakan — itu representasi "tanpa override" (event pakai
    default aplikasi), FONT_DISPLAY_CSS["jakarta"] = undefined = benar. */
export const FONT_DISPLAY_CSS: Record<string, string> = {
  playfair: "var(--font-playfair)",
  cormorant: "var(--font-cormorant)",
  marcellus: "var(--font-marcellus)",
  cinzel: "var(--font-cinzel)",
  libre: "var(--font-libre)",
  greatvibes: "var(--font-greatvibes)",
  parisienne: "var(--font-parisienne)",
  italianno: "var(--font-italianno)",
  poppins: "var(--font-poppins)",
  montserrat: "var(--font-montserrat)",
  lora: "var(--font-lora)",
};

export const CANVAS_FONT_CSS: Record<string, string> = {
  playfair: "var(--canvas-font-playfair)",
  cormorant: "var(--canvas-font-cormorant)",
  marcellus: "var(--canvas-font-marcellus)",
  cinzel: "var(--canvas-font-cinzel)",
  libre: "var(--canvas-font-libre)",
  greatvibes: "var(--canvas-font-greatvibes)",
  parisienne: "var(--canvas-font-parisienne)",
  italianno: "var(--canvas-font-italianno)",
  poppins: "var(--canvas-font-poppins)",
  montserrat: "var(--canvas-font-montserrat)",
  lora: "var(--canvas-font-lora)",
};

function assetUrl(assets: Map<string, Asset>, id: string | undefined): string | undefined {
  if (!id) return undefined;
  return assets.get(id)?.url;
}

/**
 * Diambil terpisah dari `toEventConfig()` (dan diekspor) karena dipakai
 * DUA tempat: di sini server-side (assets datang dari repo), dan
 * client-side oleh Visual Builder untuk pratinjau langsung tanpa simpan
 * (lib/services/livePreview.ts — assets di situ datang dari URL hasil
 * upload yang sudah diketahui browser, bukan dari repo). Fungsi ini murni
 * (tanpa efek samping, tanpa import server-only), jadi aman diimpor ke
 * komponen "use client".
 */
export function toEventTheme(t: Theme, assets: Map<string, Asset>): EventTheme {
  return {
    ink: t.colors.ink,
    film: t.colors.film,
    edge: t.colors.edge,
    smoke: t.colors.smoke,
    paper: t.colors.paper,
    flash: t.colors.flash,
    live: t.colors.live,
    brandPurple: t.colors.brandPurple,
    brandGold: t.colors.brandGold,
    fontDisplay: FONT_DISPLAY_CSS[t.fontDisplayId],
    canvasFontDisplay: CANVAS_FONT_CSS[t.fontDisplayId],
    // Langsung URL file, bukan folder+"/decor-tl.png" lagi — lihat catatan
    // di EventTheme.decorUrl (lib/event.ts) kenapa konvensi lama 404 untuk
    // dekorasi hasil upload klien.
    decorUrl: assetUrl(assets, t.decorAssetId),
    videoBg: assetUrl(assets, t.videoBgAssetId),
    effects: t.effects,
    videoCard: t.videoCard,
    // Id aset monogram diterjemahkan jadi URL siap-pakai di sini —
    // komponen playground tidak tahu apa-apa soal Asset/repo.
    elements: t.elements
      ? {
          ...t.elements,
          monogram: t.elements.monogram
            ? { ...t.elements.monogram, url: assetUrl(assets, t.elements.monogram.assetId) }
            : undefined,
          heroPhoto: t.elements.heroPhoto
            ? { ...t.elements.heroPhoto, url: assetUrl(assets, t.elements.heroPhoto.assetId) }
            : undefined,
        }
      : undefined,
  };
}

/**
 * Event + Subscription + peta Asset → EventConfig lama.
 *
 * `assets` harus sudah memuat semua Asset yang dirujuk `event.theme` DAN
 * seluruh `frames` yang dipakai event ini (dipanggil bersama toTemplates()
 * di bawah, lihat resolveEventForPlayground()).
 */
export function toEventConfig(
  event: Event,
  subscription: Subscription,
  assets: Map<string, Asset>
): EventConfig {
  return {
    id: event.id,
    // Dihitung, bukan diteruskan apa adanya — lihat lib/services/
    // eventLifecycle.ts. Event.status di database TETAP "live" walau
    // masa aktifnya sudah habis (staff tidak perlu melakukan apa-apa);
    // yang berubah cuma apa yang dilihat TAMU.
    status: effectiveStatus(event, subscription),
    code: event.slug,
    names: event.identity.names,
    date: event.identity.dateDisplay,
    venue: event.identity.venue,
    hashtag: event.identity.hashtag,
    quota: subscription.stripQuota,
    allowedTemplates: event.frameIds,
    greeting: event.identity.greeting,
    voiceNoteEnabled: event.session.voice.enabled,
    // Dibatasi plafon paket — klien boleh atur lebih pendek, tidak boleh
    // lebih panjang dari yang dibeli.
    maxVoiceSeconds: Math.min(event.session.voice.maxSeconds, subscription.maxVoiceSeconds),
    theme: toEventTheme(event.theme, assets),
    brandLabel: event.identity.brandLabel,
    session: {
      countdownSeconds: event.session.countdownSeconds,
      autoContinue: event.session.autoContinue,
      mirror: event.session.mirror,
      maxRetakes: event.session.maxRetakes,
      revealMs: event.session.revealMs,
      filterCss: event.session.filterCss,
      cameraAspect: event.session.cameraAspect,
      guestNameRequired: event.session.guestNameRequired,
      moments: event.session.moments,
      share: event.session.share,
    },
    copy: event.copy,
  };
}

function toTemplate(frame: Frame, assets: Map<string, Asset>): Template {
  const overlay = assetUrl(assets, frame.overlayAssetId);
  if (!overlay) {
    // Bingkai tanpa overlay yang bisa di-resolve tidak boleh diam-diam
    // tampil sebagai kanvas hitam ke tamu — gagal jelas saat build/render
    // server, bukan gagal senyap di HP tamu. Lihat prinsip P4.
    throw new Error(
      `Frame "${frame.id}" merujuk overlayAssetId "${frame.overlayAssetId}" yang tidak ditemukan di repository aset.`
    );
  }
  return {
    id: frame.id,
    name: frame.name,
    blurb: frame.blurb,
    width: frame.width,
    height: frame.height,
    printSize: frame.printSize,
    // Slot & TextLayer struktural sama (TextLayer baru cuma menambah
    // field opsional label/lineHeight/hidden/locked yang tidak dipakai
    // compositor) — aman diteruskan apa adanya.
    slots: frame.slots,
    overlay,
    paper: frame.paper,
    textLayers: frame.textLayers,
  };
}

export function toTemplates(frames: Frame[], assets: Map<string, Asset>): Template[] {
  return frames.map((f) => toTemplate(f, assets));
}

/** Bentuk asset-map dari daftar Asset — dipanggil sekali di route.tsx. */
export function assetMap(assets: Asset[]): Map<string, Asset> {
  return new Map(assets.map((a) => [a.id, a]));
}
