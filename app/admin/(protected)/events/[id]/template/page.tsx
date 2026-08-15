import { redirect } from "next/navigation";

/** D-25 — lihat catatan di app/admin/(protected)/events/[id]/page.tsx. */
export default function LegacyEventTemplateRedirect() {
  redirect("/app");
}
