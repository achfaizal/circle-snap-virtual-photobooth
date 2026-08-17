import { notFound } from "next/navigation";
import { getSessionClientId } from "@/lib/adminAuth";
import { getRepo } from "@/lib/repo";
import {
  listAuditLogs,
  listAccountsWithAuditLogs,
  listActorsWithAuditLogs,
  listDistinctAuditActions,
  listDistinctAuditEntityTypes,
} from "@/lib/db/queries/auditLogs";
import AuditLogTable from "@/components/admin/t2/AuditLogTable";

/**
 * Langkah 12 Tahap 4 — dok 04 §12. 404 (bukan 403) untuk non-staff, pola
 * sama halaman staf lain (tidak membocorkan bahwa halaman ini ada).
 *
 * Belum membedakan super_admin vs admin (requireStaff()/getRepo belum
 * granular per level, lihat catatan rencana Tahap 4 Langkah 12) — SEMUA
 * staf lihat SEMUA akun untuk sekarang, gap lama, bukan baru.
 */
export default async function AuditLogsPage() {
  const clientId = await getSessionClientId();
  if (!clientId) notFound();
  const me = await getRepo().clients.getById(clientId);
  if (!me?.isStaff) notFound();

  const [logs, accountOptions, actorOptions, actionOptions, entityTypeOptions] = await Promise.all([
    listAuditLogs({}),
    listAccountsWithAuditLogs(),
    listActorsWithAuditLogs(),
    listDistinctAuditActions(),
    listDistinctAuditEntityTypes(),
  ]);

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--a-clr-text)" }}>
        Jejak Audit
      </h1>
      <p style={{ fontSize: 14, color: "var(--a-clr-text-muted)", marginTop: 4, marginBottom: 24 }}>
        Baca-saja — semua perubahan uang, kuota, status acara, dan penghapusan media (AB-22).
      </p>
      <AuditLogTable
        initial={logs.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() }))}
        accountOptions={accountOptions}
        actorOptions={actorOptions}
        actionOptions={actionOptions}
        entityTypeOptions={entityTypeOptions}
      />
    </div>
  );
}
