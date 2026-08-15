import { redirect } from "next/navigation";

/** D-25 — Paket & Billing pindah ke /app/billing (Langkah 6 Tahap 3). */
export default function LegacyBillingRedirect() {
  redirect("/app/billing");
}
