/**
 * Regresi permanen Langkah 14 Tahap 4 — computeQuotaThreshold() (dok 03
 * §8.3, D-15). Jalan: npx tsx --env-file=.env.local scripts/test-quota-notify.ts
 */
import { computeQuotaThreshold } from "../lib/services/quotaNotify";

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

function main() {
  console.log("\n=== computeQuotaThreshold() ===");

  check("sisa 100/100 (100%) → tidak ada ambang", computeQuotaThreshold(100, 100).target === null);
  check("sisa 21/100 (21%) → tidak ada ambang (masih di atas 20%)", computeQuotaThreshold(21, 100).target === null);
  check("sisa 20/100 (persis 20%) → quota.low", computeQuotaThreshold(20, 100).target === "quota.low");
  check("sisa 1/100 (1%) → quota.low", computeQuotaThreshold(1, 100).target === "quota.low");
  check("sisa 0/100 → quota.empty (bukan quota.low)", computeQuotaThreshold(0, 100).target === "quota.empty");
  check("totalQuota=0 → tidak ada ambang (bukan pembagian nol)", computeQuotaThreshold(0, 0).target === null);
  check("percentRemaining terhitung benar (25/100=25%)", computeQuotaThreshold(25, 100).percentRemaining === 25);

  console.log(`\n${pass} lulus, ${fail} gagal.\n`);
  if (fail > 0) process.exit(1);
}

main();
