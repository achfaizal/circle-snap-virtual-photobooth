import { headers } from "next/headers";

/**
 * D-21 Langkah 1 — URL dasar aplikasi diturunkan dari HEADER REQUEST,
 * BUKAN env var baru (`NEXT_PUBLIC_APP_URL` dkk). Proyek ini belum
 * punya domain produksi diputuskan (masih dev lokal, sama seperti
 * `DATABASE_URL` yang eksplisit "wajib pindah ke Neon sebelum deploy")
 * — menurunkan dari request selalu benar di environment mana pun
 * (dev lokal, preview Vercel, produksi) tanpa perlu dikonfigurasi ulang
 * tiap kali domain berubah.
 *
 * Server-only — pakai `next/headers`, cuma bisa dipanggil dari Server
 * Component/Route Handler, TIDAK bisa dari client component.
 */
export async function getAppBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3008";
  const forwardedProto = h.get("x-forwarded-proto");
  // localhost/127.* selalu http — proxy dev lokal tidak pernah kirim
  // x-forwarded-proto, dan memaksa https di sana bikin link/QR yang
  // dihasilkan tidak bisa dibuka.
  const isLocal = host.includes("localhost") || host.startsWith("127.");
  const protocol = forwardedProto ?? (isLocal ? "http" : "https");
  return `${protocol}://${host}`;
}
