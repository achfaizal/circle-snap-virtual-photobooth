/**
 * Booth tamu baca Postgres (Langkah 10 Tahap 3, D-13/K9) — cabang BARU
 * di resolvePlaygroundBySlug() (lib/adapters/resolvePlayground.ts).
 * Acara yang sudah PERNAH terbit (template_snapshot terisi) dibangun
 * DARI SNAPSHOT beku, BUKAN dari tabel `templates`/`template_frames`
 * hidup — itulah inti K9/AB-14: perbaikan template setelah publikasi
 * tidak boleh mengubah tampilan acara yang sedang berjalan.
 *
 * ⚠️ Keterbatasan jujur: `lib/event.ts` tokensFor()/lib/compositor.ts
 * cuma mengenal 5 token tetap ({{names}} {{date}} {{venue}} {{hashtag}}
 * {{code}}) — bukan variabel dinamis sembarang (mis. {{student_name}}).
 * Cocok untuk field TETAP events (displayNames/dateDisplay/venue/
 * hashtag, dok 03 §5.1), tapi bingkai yang text_layers-nya memuat token
 * template_variables SELAIN lima itu TIDAK akan tersubstitusi compositor
 * sekarang — di luar cakupan 8 butir Tahap 3 (bukan diam-diam
 * disembunyikan, dicatat di sini eksplisit sebagai gap).
 */
import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/client";
import { events } from "../db/schema/events";
import { frames, assets } from "../db/schema/templates";
import { quotaLedger } from "../db/schema/commercial";
import type { EventConfig, EventTheme } from "../event";
import type { Template } from "../templates";
import { FONT_DISPLAY_CSS, CANVAS_FONT_CSS } from "./legacy";
import { FILTER_PRESETS } from "../services/filters";
import type { SessionConfig } from "../services/defaultSessionConfig";
import type { ResolvedPlayground } from "./resolvePlayground";

interface TemplateSnapshot {
  template_id: string;
  version: number;
  theme_colors: Record<string, string>;
  font_display_id: string;
  theme_effects: unknown;
  video_card_theme: Record<string, unknown>;
  brand_label: string;
  variables: { key: string; label: string; inputType: string; isRequired: boolean; usedIn: string[] }[];
  frames: { frame_id: string; slots: unknown; text_layers: unknown }[];
}

export async function resolvePostgresPlaygroundBySlug(slug: string): Promise<ResolvedPlayground | null> {
  const [event] = await db.select().from(events).where(eq(events.slug, slug));
  // Belum pernah terbit sama sekali (draft murni) — tidak ada snapshot
  // untuk dibangun. QR/link memang baru aktif SETELAH publikasi (dok 05
  // §5.5), jadi tamu praktis tidak pernah sampai ke slug semacam ini.
  if (!event || !event.templateSnapshot) return null;

  const snapshot = event.templateSnapshot as unknown as TemplateSnapshot;

  const [{ balance }] = await db
    .select({ balance: sql<number>`COALESCE(SUM(${quotaLedger.strips}), 0)::int` })
    .from(quotaLedger)
    .where(eq(quotaLedger.eventId, event.id));

  const frameRows = await Promise.all(
    snapshot.frames.map(async (f) => {
      const [frameRow] = await db.select().from(frames).where(eq(frames.id, f.frame_id));
      if (!frameRow) return null;
      const [assetRow] = await db.select().from(assets).where(eq(assets.id, frameRow.assetId));
      if (!assetRow) return null;
      const template: Template = {
        id: frameRow.id,
        name: frameRow.name,
        blurb: frameRow.blurb ?? "",
        width: frameRow.width,
        height: frameRow.height,
        printSize: frameRow.printSize ?? "",
        // Slot/textLayers DIBEKUKAN di snapshot (K9) — bukan dibaca ulang
        // dari `frames` hidup, biarpun baris frame itu sendiri masih ada.
        slots: f.slots as Template["slots"],
        overlay: assetRow.storageKey,
        paper: frameRow.paper,
        textLayers: f.text_layers as Template["textLayers"],
      };
      return template;
    })
  );
  const templates = frameRows.filter((t): t is Template => t !== null);

  const theme: EventTheme = {
    ink: snapshot.theme_colors.ink,
    film: snapshot.theme_colors.film,
    edge: snapshot.theme_colors.edge,
    smoke: snapshot.theme_colors.smoke,
    paper: snapshot.theme_colors.paper,
    flash: snapshot.theme_colors.flash,
    live: snapshot.theme_colors.live,
    brandPurple: snapshot.theme_colors.brandPurple,
    brandGold: snapshot.theme_colors.brandGold,
    fontDisplay: FONT_DISPLAY_CSS[snapshot.font_display_id],
    canvasFontDisplay: CANVAS_FONT_CSS[snapshot.font_display_id],
    effects: snapshot.theme_effects as EventTheme["effects"],
    videoCard: snapshot.video_card_theme as EventTheme["videoCard"],
    // decorUrl/videoBg/elements TIDAK ADA di bentuk snapshot resmi (dok
    // 06 §6) — kosong di sini bukan bug, K14 "gagal pelan": booth tampil
    // tanpa dekorasi sudut/monogram alih-alih pecah.
  };

  const session = event.sessionConfig as SessionConfig;
  const filterCss = FILTER_PRESETS.find((p) => p.id === session.filterId)?.css ?? "none";

  const now = Date.now();
  let status: EventConfig["status"] = event.status === "live" || event.status === "ended" ? event.status : "draft";
  if (status === "live" && event.expiresAt && now > event.expiresAt.getTime()) {
    status = "expired"; // K15/AB-11 — dihitung dari waktu, tidak pernah disimpan sebagai baris status.
  }

  const eventConfig: EventConfig = {
    id: event.id,
    status,
    code: event.slug,
    names: event.displayNames ?? "",
    date: event.dateDisplay ?? "",
    venue: event.venue ?? "",
    hashtag: event.hashtag ?? "",
    quota: balance,
    allowedTemplates: snapshot.frames.map((f) => f.frame_id),
    greeting: event.greeting ?? "",
    voiceNoteEnabled: session.voice?.enabled ?? false,
    maxVoiceSeconds: session.voice?.maxSeconds ?? 15,
    theme,
    brandLabel: snapshot.brand_label,
    session: {
      countdownSeconds: session.countdownSeconds,
      autoContinue: session.autoContinue,
      mirror: session.mirror,
      maxRetakes: session.maxRetakes,
      revealMs: session.revealMs,
      filterCss,
      cameraAspect: session.cameraAspect,
      guestNameRequired: event.guestNameRequired,
      moments: { enabled: event.galleryEnabled },
      share: session.share,
    },
  };

  return {
    event: eventConfig,
    templates,
    used: event.cachedConsumed,
    ownerClientId: event.accountId,
  };
}
