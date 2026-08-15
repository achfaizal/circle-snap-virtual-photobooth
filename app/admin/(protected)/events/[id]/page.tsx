import { redirect } from "next/navigation";

/** D-25 — acara JSON lama pindah ke /app/events/{id} Postgres (id lama
    TIDAK bisa dipetakan 1:1 ke id baru — 0 event JSON nyata per temuan
    awal Tahap 3, jadi diarahkan ke dashboard, bukan ditebak). */
export default function LegacyEventRedirect() {
  redirect("/app");
}
