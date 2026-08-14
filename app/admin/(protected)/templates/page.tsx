import { notFound } from "next/navigation";
import { getSessionClientId } from "@/lib/adminAuth";
import { getRepo } from "@/lib/repo";
import { listTemplates } from "@/lib/db/queries/templates";
import TemplatesListManager from "@/components/admin/t2/TemplatesListManager";

export default async function TemplatesPage() {
  const clientId = await getSessionClientId();
  if (!clientId) notFound();
  const me = await getRepo().clients.getById(clientId);
  if (!me?.isStaff) notFound();

  const templates = await listTemplates();

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--a-clr-text)" }}>
        Template
      </h1>
      <p style={{ fontSize: 14, color: "var(--a-clr-text-muted)", marginTop: 4, marginBottom: 24 }}>
        Kelas desain untuk acara — warna, font, bingkai bawaan. Klien memilih,
        tidak pernah mengubah.
      </p>
      <TemplatesListManager
        initial={templates.map((t) => ({
          id: t.id,
          code: t.code,
          name: t.name,
          status: t.status,
          version: t.version,
          usageCount: t.usageCount,
        }))}
      />
    </div>
  );
}
