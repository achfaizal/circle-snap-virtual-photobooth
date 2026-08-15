import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { getSessionAccount } from "@/lib/clientAuth";
import { getEventForAccount } from "@/lib/db/queries/events";
import { db } from "@/lib/db/client";
import { templates, templateCategories } from "@/lib/db/schema/templates";
import TemplatePicker from "@/components/app/TemplatePicker";

/** Pilih template (penyambung wajib untuk gerbang publikasi poin 6, dok
    05 §5.5 — tidak disebut namanya sebagai salah satu dari 8 butir
    Tahap 3, tapi tanpa halaman ini poin 6 mustahil pernah lolos).
    Dibatasi ke template PUBLISHED yang kategorinya cocok acara ini —
    junction template_categories dipakai persis untuk ini. */
export default async function EventTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionAccount();
  if (!session) redirect("/app/login");

  const { id } = await params;
  const event = await getEventForAccount(id, session.accountId);
  if (!event) redirect("/app");

  const rows = await db
    .select({ id: templates.id, name: templates.name, tagline: templates.tagline, brandLabel: templates.brandLabel, coverAssetId: templates.coverAssetId })
    .from(templates)
    .innerJoin(templateCategories, eq(templateCategories.templateId, templates.id))
    .where(and(eq(templateCategories.categoryId, event.categoryId), eq(templates.status, "published")));

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <h1 style={{ fontSize: 20, fontWeight: 900, color: "#18181B", marginBottom: 4 }}>Pilih Template</h1>
      <p style={{ fontSize: 13, color: "#71717A", marginBottom: 20 }}>
        Template menentukan warna, font, dan tata letak (AB-15) — bisa diganti kapan saja sebelum acara diterbitkan.
      </p>
      <TemplatePicker eventId={event.id} currentTemplateId={event.templateId} templates={rows} />
    </div>
  );
}
