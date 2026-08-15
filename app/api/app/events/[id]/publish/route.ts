import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireAccountRole } from "@/lib/clientAuth";
import { getEventForAccount } from "@/lib/db/queries/events";
import { canPublishEvent } from "@/lib/services/eventPublishGate";
import { computeExpiresAt } from "@/lib/services/eventEditGuard";
import { db } from "@/lib/db/client";
import { events } from "@/lib/db/schema/events";
import { templates, templateVariables, frames } from "@/lib/db/schema/templates";
import { listEventFrames } from "@/lib/db/queries/eventFrames";

/**
 * Terbitkan acara (Langkah 9 Tahap 3) — AB-12: tidak bisa terbit sebelum
 * lolos SELURUH gerbang 11 poin. Sukses → satu transaksi: bekukan
 * `template_snapshot` (AB-14/K9, bentuk JSON persis dok 06 §6),
 * `expires_at` dari `activeDays` ASLI acara (bukan hardcode), status
 * draft→live.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAccountRole("manager");
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const event = await getEventForAccount(id, guard.accountId);
  if (!event) return NextResponse.json({ error: "Acara tidak ditemukan." }, { status: 404 });
  if (event.status !== "draft") {
    return NextResponse.json({ error: "Acara ini sudah diterbitkan atau tidak dalam status draft." }, { status: 400 });
  }

  const gate = await canPublishEvent(id);
  if (!gate.canPublish) {
    return NextResponse.json({ error: "Belum lolos gerbang publikasi.", failed: gate.failed }, { status: 400 });
  }

  // event.templateId dijamin ada (poin 6 gerbang) — TypeScript belum
  // tahu itu, dipertegas di sini.
  const templateId = event.templateId!;
  const [template] = await db.select().from(templates).where(eq(templates.id, templateId));
  const variables = await db.select().from(templateVariables).where(eq(templateVariables.templateId, templateId));
  const eventFrameRows = await listEventFrames(id);
  const activeFrames = eventFrameRows.filter((f) => f.isEnabled);
  const frameDetails = await Promise.all(
    activeFrames.map(async (f) => {
      const [full] = await db.select().from(frames).where(eq(frames.id, f.frameId));
      return { frame_id: f.frameId, slots: full.slots, text_layers: full.textLayers };
    })
  );

  // AB-14/K9 — bentuk PERSIS dok 06 §6.
  const templateSnapshot = {
    template_id: template.id,
    version: template.version,
    theme_colors: template.themeColors,
    font_display_id: template.fontDisplayId,
    theme_effects: template.themeEffects,
    video_card_theme: template.videoCardTheme,
    brand_label: template.brandLabel,
    variables: variables.map((v) => ({ key: v.key, label: v.label, inputType: v.inputType, isRequired: v.isRequired, usedIn: v.usedIn })),
    frames: frameDetails,
  };

  const expiresAt = computeExpiresAt(event.startsAt!, event.activeDays);

  const [published] = await db
    .update(events)
    .set({
      templateVersion: template.version,
      templateSnapshot,
      status: "live",
      publishedAt: new Date(),
      expiresAt,
    })
    .where(eq(events.id, id))
    .returning();

  return NextResponse.json({ ok: true, event: published });
}
