/**
 * Regresi permanen Langkah 1 Tahap 3 — dijalankan ulang kapan pun curiga
 * regresi (pola sama scripts/test-frame-validator.ts dkk). Dua bagian:
 *
 * 1. Migrasi: baris `users` demo@circlesnap.app hasil
 *    scripts/migrate-clients-events.ts --source=live cocok dengan
 *    data/clients.json (password_hash tersalin apa adanya, bukan
 *    di-hash ulang), dan TIDAK punya account (staf tidak boleh punya
 *    acara — aturan Tahap 1, dipertahankan lewat migrate-clients-events.ts).
 * 2. Gerbang permission lib/clientAuth.ts: roleSatisfies() hierarkis
 *    (owner ⊇ manager ⊇ operator) + getActiveMembershipByUserId()
 *    mengembalikan peran yang benar dari DB sungguhan — bukan cuma
 *    dites lewat logika di kepala.
 *
 * Jalan: npx tsx --env-file=.env.local scripts/test-account-migration.ts
 *
 * ⚠️ Baris account/user sintetis yang dibuat skrip ini PERMANEN (pola
 * sama scripts/test-order-lifecycle.ts) — JANGAN dihapus manual, dipakai
 * ulang tiap regresi jalan.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../lib/db/client";
import { users, accounts, accountMembers } from "../lib/db/schema/identity";
import { getActiveMembershipByUserId } from "../lib/db/queries/accounts";
import { roleSatisfies, type AccountRole } from "../lib/clientAuth";

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

async function testMigration() {
  console.log("\n=== 1. Migrasi demo@circlesnap.app ===");
  const oldClients = JSON.parse(
    readFileSync(join(__dirname, "..", "data", "clients.json"), "utf-8")
  ) as Array<{ email: string; passwordHash?: string; isStaff?: boolean }>;
  const oldDemo = oldClients.find((c) => c.email === "demo@circlesnap.app");
  check("data/clients.json masih punya baris demo", !!oldDemo);

  const [dbUser] = await db.select().from(users).where(eq(users.email, "demo@circlesnap.app"));
  check("users.demo ada di Postgres", !!dbUser);
  if (dbUser && oldDemo) {
    check("password_hash tersalin identik (bukan di-hash ulang)", dbUser.passwordHash === oldDemo.passwordHash);
    check("platform_role='admin' (dari isStaff=true)", dbUser.platformRole === "admin");

    const membership = await getActiveMembershipByUserId(dbUser.id);
    check("staf TIDAK punya account (aturan Tahap 1)", membership === null);
  }
}

async function testRoleGate() {
  console.log("\n=== 2. Gerbang permission (roleSatisfies + getActiveMembershipByUserId) ===");

  check("owner memenuhi syarat 'manager'", roleSatisfies("owner", "manager") === true);
  check("owner memenuhi syarat 'owner'", roleSatisfies("owner", "owner") === true);
  check("manager memenuhi syarat 'manager'", roleSatisfies("manager", "manager") === true);
  check("manager TIDAK memenuhi syarat 'owner'", roleSatisfies("manager", "owner") === false);
  check("operator TIDAK memenuhi syarat 'manager'", roleSatisfies("operator", "manager") === false);
  check("operator memenuhi syarat 'operator'", roleSatisfies("operator", "operator") === true);

  // --- buat akun sintetis 3 peran, verifikasi lewat DB sungguhan ---
  const runId = randomUUID().slice(0, 8);
  const [account] = await db
    .insert(accounts)
    .values({
      type: "vendor",
      displayName: `[UJI PERAN] Jangan hapus manual — regresi permanen (${runId})`,
      slug: `uji-peran-${runId}`,
    })
    .returning({ id: accounts.id });

  const roleUserIds: Record<AccountRole, string> = { owner: "", manager: "", operator: "" };
  for (const role of ["owner", "manager", "operator"] as const) {
    const [u] = await db
      .insert(users)
      .values({
        email: `uji-peran-${role}-${runId}@test.local`,
        passwordHash: "UJI_PERAN_TIDAK_DIPAKAI_LOGIN",
        fullName: `Uji Peran ${role}`,
        phoneWa: `+6200000${role.slice(0, 3).toUpperCase()}`,
      })
      .returning({ id: users.id });
    roleUserIds[role] = u.id;
    await db.insert(accountMembers).values({
      accountId: account.id,
      userId: u.id,
      role,
      status: "active",
    });
  }

  for (const role of ["owner", "manager", "operator"] as const) {
    const membership = await getActiveMembershipByUserId(roleUserIds[role]);
    check(`getActiveMembershipByUserId mengembalikan role='${role}' yang benar`, membership?.role === role);
  }
}

async function main() {
  await testMigration();
  await testRoleGate();

  console.log(`\n${pass} lulus, ${fail} gagal.`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error("GAGAL:", e);
  process.exit(1);
});
