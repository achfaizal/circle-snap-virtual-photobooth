import { redirect } from "next/navigation";

/** D-25 — pengaturan akun klien pindah ke /app/* (belum ada halaman
    /app/settings dedicated, di luar 8 butir Tahap 3 — /app dashboard
    jadi tujuan paling aman sampai halaman itu dibangun). */
export default function LegacyAccountRedirect() {
  redirect("/app");
}
