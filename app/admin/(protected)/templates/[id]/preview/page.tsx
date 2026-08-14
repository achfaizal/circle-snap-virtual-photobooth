import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getSessionClientId } from "@/lib/adminAuth";
import { getRepo } from "@/lib/repo";
import { db } from "@/lib/db/client";
import { assets, templates } from "@/lib/db/schema";
import { listTemplateFrames } from "@/lib/db/queries/templateFrames";
import PreviewMarker from "@/components/admin/t2/PreviewMarker";

/**
 * Pratinjau STATIS "sebagai tamu" — Langkah 7, gerbang penerbitan poin
 * ke-8. Simplifikasi disengaja (dicatat di rencana Tahap 2): sampul +
 * warna tema + sample_data ditampilkan mirip layar sambutan booth,
 * BUKAN kamera/shoot sungguhan — pipeline booth sekarang terikat ke
 * bentuk `Event` lama, menyatukannya dengan template DB baru itu
 * pekerjaan Tahap 3.
 */
export default async function TemplatePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const clientId = await getSessionClientId();
  if (!clientId) notFound();
  const me = await getRepo().clients.getById(clientId);
  if (!me?.isStaff) notFound();

  const { id } = await params;
  const [template] = await db.select().from(templates).where(eq(templates.id, id));
  if (!template) notFound();

  const [cover, attachedFrames] = await Promise.all([
    template.coverAssetId
      ? db.select().from(assets).where(eq(assets.id, template.coverAssetId)).then((r) => r[0] ?? null)
      : Promise.resolve(null),
    listTemplateFrames(id),
  ]);

  const colors = (template.themeColors as Record<string, string>) ?? {};
  const sampleData = (template.sampleData as Record<string, string>) ?? {};

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <PreviewMarker templateId={id} />
      <p className="t2-mono" style={{ fontSize: 11, textTransform: "uppercase", color: "var(--a-clr-text-muted)", marginBottom: 12 }}>
        Pratinjau statis — bukan booth interaktif sungguhan
      </p>
      <div
        className="t2-sheet"
        style={{
          padding: 32,
          textAlign: "center",
          background: colors.ink || "#111",
          color: colors.paper || "#fff",
        }}
      >
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover.storageKey} alt="Sampul" style={{ maxWidth: "100%", borderRadius: 4, marginBottom: 16 }} />
        )}
        <h1 style={{ fontFamily: "serif", fontSize: 28, marginBottom: 8 }}>{template.brandLabel}</h1>
        <p style={{ fontSize: 16 }}>{sampleData.names ?? "(nama contoh belum diisi)"}</p>
        <p style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>{sampleData.date ?? ""}</p>
        {sampleData.greeting && <p style={{ fontSize: 13, marginTop: 16, opacity: 0.9 }}>{sampleData.greeting}</p>}
      </div>

      <div className="t2-sheet" style={{ marginTop: 16 }}>
        <div className="t2-sheet-section">
          <p className="t2-label" style={{ marginBottom: 8 }}>Bingkai yang ditawarkan ({attachedFrames.length})</p>
          {attachedFrames.map((f) => (
            <p key={f.id} style={{ fontSize: 13, color: "var(--a-clr-text)" }}>• {f.frameName}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
