/**
 * Normalisasi nomor WhatsApp ke bentuk 62xxxxxxxxxx — dipakai pendaftaran
 * klien (app/api/app/register/route.ts). Logika sama dengan yang lebih
 * dulu ada di app/api/admin/register/route.ts (rute lama, dipensiunkan
 * Langkah 11), diekstrak ke sini supaya tidak disalin dua kali di kode
 * BARU — rute lama sengaja tidak diubah ikut memakai ini, hampir
 * pensiun, tidak sepadan risikonya.
 */
export function normalizeWhatsapp(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  let n = digits;
  if (n.startsWith("62")) n = n.slice(2);
  else if (n.startsWith("0")) n = n.slice(1);
  // Nomor seluler Indonesia: 9–13 digit setelah kode negara.
  if (n.length < 9 || n.length > 13) return null;
  if (!n.startsWith("8")) return null; // seluler selalu diawali 8
  return `62${n}`;
}
