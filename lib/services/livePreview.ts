/**
 * PRATINJAU LANGSUNG (tanpa simpan)
 *
 * Menyusun draft Visual Builder (Theme/SessionConfig/CopyOverrides — model
 * admin) jadi Partial<EventConfig> (bentuk yang dipahami playground tamu),
 * PERSIS logika yang dipakai server saat menyimpan (toEventTheme di
 * lib/adapters/legacy.ts) — supaya pratinjau tidak pernah menunjukkan
 * sesuatu yang berbeda dari hasil setelah Simpan ditekan.
 *
 * Berjalan di BROWSER admin (bukan server): asset di sini datang dari URL
 * yang sudah diketahui browser (baru saja diunggah, atau sudah diresolusi
 * sekali oleh server saat halaman /admin/events/[id]/visual dimuat) —
 * bukan query ke repository seperti di server.
 */
import type { Asset } from "@/lib/models/asset";
import type { CopyOverrides, SessionConfig } from "@/lib/models/event";
import type { Theme } from "@/lib/models/theme";
import type { EventConfig } from "@/lib/event";
import { toEventTheme } from "@/lib/adapters/legacy";

export function buildPreviewPatch(
  theme: Theme,
  session: SessionConfig,
  copy: CopyOverrides,
  assetUrls: Record<string, string>
): Partial<EventConfig> {
  const assets = new Map<string, Asset>(
    Object.entries(assetUrls).map(([id, url]) => [id, { url } as Asset])
  );

  return {
    theme: toEventTheme(theme, assets),
    copy,
    voiceNoteEnabled: session.voice.enabled,
    maxVoiceSeconds: session.voice.maxSeconds,
    session: {
      countdownSeconds: session.countdownSeconds,
      autoContinue: session.autoContinue,
      mirror: session.mirror,
      maxRetakes: session.maxRetakes,
      revealMs: session.revealMs,
      filterCss: session.filterCss,
      cameraAspect: session.cameraAspect,
      guestNameRequired: session.guestNameRequired,
      moments: session.moments,
      share: session.share,
    },
  };
}

/** Nama tipe pesan window.postMessage antara VisualBuilder (induk) dan
    playground (iframe) — dipakai kedua sisi supaya kalau salah satu
    berubah, TypeScript menandai sisi lain yang lupa disesuaikan. */
export const PREVIEW_MESSAGE = "csnap:preview-draft";
export const PREVIEW_READY_MESSAGE = "csnap:preview-ready";

export interface PreviewDraftMessage {
  type: typeof PREVIEW_MESSAGE;
  payload: Partial<EventConfig>;
}

export interface PreviewReadyMessage {
  type: typeof PREVIEW_READY_MESSAGE;
}
