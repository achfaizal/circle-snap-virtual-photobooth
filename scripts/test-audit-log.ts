/**
 * Regresi permanen Langkah 10 Tahap 4 — recordAudit() (dok 03 §8.1,
 * AB-22). Jalan: npx tsx --env-file=.env.local scripts/test-audit-log.ts
 */
import { eq } from "drizzle-orm";
import { db } from "../lib/db/client";
import { auditLogs } from "../lib/db/schema/audit";
import { recordAudit } from "../lib/services/auditLog";

let pass = 0;
let fail = 0;
function check(label: string, ok: boolean, detail?: string) {
  if (ok) {
    pass++;
    console.log(`  OK   ${label}`);
  } else {
    fail++;
    console.log(`  GAGAL ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function main() {
  console.log("\n=== recordAudit() ===");

  const entityId = crypto.randomUUID();
  await recordAudit({
    actorUserId: null, // sistem
    accountId: null,
    action: "test.action",
    entityType: "test_entity",
    entityId,
    before: { status: "a" },
    after: { status: "b" },
    reason: "uji regresi",
  });

  const [row] = await db.select().from(auditLogs).where(eq(auditLogs.entityId, entityId));
  check("baris tersimpan", !!row);
  if (row) {
    check("actor_user_id null diterima (aksi sistem)", row.actorUserId === null);
    check("before/after jsonb tersimpan benar", JSON.stringify(row.before) === '{"status":"a"}' && JSON.stringify(row.after) === '{"status":"b"}');
    check("action tersimpan", row.action === "test.action");
    check("reason tersimpan", row.reason === "uji regresi");
  }

  console.log(`\n${pass} lulus, ${fail} gagal.\n`);
  if (fail > 0) process.exit(1);
}

main().then(() => process.exit(0));
