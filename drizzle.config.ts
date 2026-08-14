import { defineConfig } from "drizzle-kit";
import { requireDatabaseUrl } from "./lib/db/env";

export default defineConfig({
  schema: "./lib/db/schema/index.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: requireDatabaseUrl(),
  },
  // Migrasi ditulis manual sebagai SQL biasa (lihat Langkah 8 rencana —
  // butuh GRANT/REVOKE dan index parsial yang tidak diekspresikan lewat
  // skema Drizzle), jadi jangan otomatis "casing" ulang nama kolom.
  casing: "snake_case",
});
