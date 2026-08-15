import { notFound } from "next/navigation";
import { getSessionClientId } from "@/lib/adminAuth";
import { getRepo } from "@/lib/repo";
import { listSystemFrames } from "@/lib/db/queries/systemFrames";
import SystemFramesManager from "@/components/admin/t2/SystemFramesManager";

/**
 * Bingkai sistem — Langkah 4 Tahap 2. Direname dari `/admin/system-frames`
 * ke nama BRD asli `/admin/frames` di Langkah 11 Tahap 3 — rute lama
 * (JSON, dipakai bersama klien) sudah dipensiunkan, tabrakan rutenya
 * sudah tidak ada.
 */
export default async function SystemFramesPage() {
  const clientId = await getSessionClientId();
  if (!clientId) notFound();
  const me = await getRepo().clients.getById(clientId);
  if (!me?.isStaff) notFound();

  const frames = await listSystemFrames();

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--a-clr-text)" }}>
        Bingkai Sistem
      </h1>
      <p style={{ fontSize: 14, color: "var(--a-clr-text-muted)", marginTop: 4, marginBottom: 24 }}>
        Pustaka bingkai bawaan — divalidasi otomatis (V1–V8) sebelum tersimpan.
        Beda dari Pustaka Bingkai lama, ini yang dipasang ke Template.
      </p>
      <SystemFramesManager
        initial={frames.map((f) => ({
          id: f.id,
          name: f.name,
          status: f.status,
          slotCount: f.slotCount,
          width: f.width,
          height: f.height,
        }))}
      />
    </div>
  );
}
