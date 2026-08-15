import { redirect } from "next/navigation";

/** D-25 — lihat catatan di app/admin/(protected)/events/[id]/page.tsx.
    Galeri Momen di /app/* belum dibangun (di luar 8 butir Tahap 3). */
export default function LegacyEventMomentsRedirect() {
  redirect("/app");
}
