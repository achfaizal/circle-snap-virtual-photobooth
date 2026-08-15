import { NextResponse } from "next/server";
import { requireAccountRole } from "@/lib/clientAuth";
import { getEventForAccount, updateEvent } from "@/lib/db/queries/events";
import { getTemplate } from "@/lib/db/queries/templates";
import { syncTemplateFramesForEvent } from "@/lib/db/queries/eventFrames";

/**
 * Pilih template untuk acara (K8: acara cuma MERUJUK template, tidak
 * pernah menulis ke tabel `templates`/`template_*`). Cuma template
 * `published` yang boleh dipasang — draft/archived milik staf, belum
 * siap dipakai klien. `templateVersion` SENGAJA tidak diisi di sini —
 * itu dibekukan saat publikasi acara (AB-14, Langkah 9), bukan saat
 * memilih (klien boleh ganti-ganti template berkali-kali sebelum live).
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAccountRole("manager");
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const event = await getEventForAccount(id, guard.accountId);
  if (!event) return NextResponse.json({ error: "Acara tidak ditemukan." }, { status: 404 });

  const body = (await request.json().catch(() => null)) as { templateId?: string } | null;
  if (!body?.templateId) return NextResponse.json({ error: "Pilih template dulu." }, { status: 400 });

  const template = await getTemplate(body.templateId);
  if (!template || template.status !== "published") {
    return NextResponse.json({ error: "Template tidak ditemukan atau belum diterbitkan." }, { status: 400 });
  }

  const updated = await updateEvent(id, { templateId: template.id });
  // Materialisasi bingkai bawaan template ke event_frames — lihat
  // komentar syncTemplateFramesForEvent (Langkah 8). Unggahan klien
  // sendiri (source='custom') tidak tersentuh sama sekali.
  await syncTemplateFramesForEvent(id, guard.accountId, template.id);
  return NextResponse.json({ ok: true, event: updated });
}
