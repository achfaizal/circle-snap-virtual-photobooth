/**
 * Isi `system_settings` dengan nilai bawaan BRD (Langkah 16 Tahap 4,
 * dok 03 §8.4). Idempoten — aman dijalankan berkali-kali (upsert),
 * TIDAK menimpa nilai yang sudah diubah manual oleh Super Admin.
 *
 * Jalan: npx tsx --env-file=.env.local scripts/seed-system-settings.ts
 */
import { sql } from "drizzle-orm";
import { db } from "../lib/db/client";
import { systemSettings } from "../lib/db/schema/settings";

async function main() {
  await db
    .insert(systemSettings)
    .values({ key: "retention_days_after_end", value: 90 })
    .onConflictDoNothing({ target: systemSettings.key });

  const [row] = await db
    .select()
    .from(systemSettings)
    .where(sql`${systemSettings.key} = 'retention_days_after_end'`);
  console.log("retention_days_after_end =", row.value);
}
main().then(() => process.exit(0));
