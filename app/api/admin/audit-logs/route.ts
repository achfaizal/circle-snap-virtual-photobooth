import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/adminAuth";
import { listAuditLogs, type AuditLogRow } from "@/lib/db/queries/auditLogs";

/** Bungkus satu field CSV — kutip ganda kalau mengandung koma/kutip/
    baris baru, dan kutip-ganda-di-dalam di-escape jadi dobel (RFC 4180). */
function csvField(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function toCsv(rows: AuditLogRow[]): string {
  const header = ["waktu", "pelaku", "akun", "tindakan", "jenis_entitas", "entitas_id", "alasan"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.createdAt.toISOString(),
        r.actorEmail ?? "sistem",
        r.accountName ?? "",
        r.action,
        r.entityType,
        r.entityId,
        r.reason ?? "",
      ]
        .map((v) => csvField(String(v)))
        .join(",")
    );
  }
  return lines.join("\n");
}

/**
 * Langkah 12 Tahap 4 — dok 04 §12, baca-saja. `?format=csv` untuk
 * ekspor. Gerbang di sini SAMA untuk seluruh staf (requireStaff() belum
 * membedakan super_admin/admin — gap lama, lihat catatan rencana Tahap
 * 4 Langkah 12, BUKAN diselesaikan diam-diam di sini).
 */
export async function GET(request: Request) {
  const guard = await requireStaff();
  if (guard instanceof NextResponse) return guard;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const rows = await listAuditLogs({
    actorUserId: searchParams.get("actorUserId") || undefined,
    action: searchParams.get("action") || undefined,
    entityType: searchParams.get("entityType") || undefined,
    accountId: searchParams.get("accountId") || undefined,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
  });

  if (searchParams.get("format") === "csv") {
    return new NextResponse(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="jejak-audit-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json({ logs: rows });
}
