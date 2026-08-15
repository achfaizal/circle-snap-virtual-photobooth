import { NextResponse } from "next/server";
import { requireAccountRole } from "@/lib/clientAuth";
import { getEventForAccount, upsertEventVariableValue } from "@/lib/db/queries/events";
import { listTemplateVariables } from "@/lib/db/queries/templateVariables";

/**
 * Simpan nilai variabel dinamis (Langkah 7 Tahap 3, D-12) — event HANYA
 * menulis ke `event_variable_values` (K8), tidak pernah ke
 * `template_variables`. Validasi wajib-isi ditegakkan SERVER-SIDE
 * terhadap definisi variabel template SEKARANG (bukan cuma dipercaya
 * dari body) — klien bisa saja mengirim key yang sudah tidak relevan
 * kalau template diganti staf di tengah jalan.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAccountRole("manager");
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const event = await getEventForAccount(id, guard.accountId);
  if (!event) return NextResponse.json({ error: "Acara tidak ditemukan." }, { status: 404 });
  if (!event.templateId) {
    return NextResponse.json({ error: "Pilih template dulu sebelum mengisi variabel." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as { values?: Record<string, string> } | null;
  if (!body?.values) return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });

  const definitions = await listTemplateVariables(event.templateId);
  const missing = definitions.filter((d) => d.isRequired && !body.values![d.key]?.trim());
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Variabel wajib belum terisi: ${missing.map((d) => d.label).join(", ")}` },
      { status: 400 }
    );
  }

  const validKeys = new Set(definitions.map((d) => d.key));
  for (const [key, value] of Object.entries(body.values)) {
    if (!validKeys.has(key)) continue; // key basi (template sudah ganti) — diam-diam dilewati, bukan error keras
    await upsertEventVariableValue(id, guard.accountId, key, value.trim() || null);
  }

  return NextResponse.json({ ok: true });
}
