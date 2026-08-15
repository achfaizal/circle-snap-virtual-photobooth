import { redirect } from "next/navigation";

/** D-25 — pendaftaran klien pindah ke /app/register (Postgres,
    lib/clientAuth.ts). /admin/* sekarang staf-saja, tidak ada
    pendaftaran mandiri di sana. */
export default function LegacyRegisterRedirect() {
  redirect("/app/register");
}
