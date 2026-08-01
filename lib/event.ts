/**
 * MODEL EVENT
 *
 * Di produk, ini datang dari API setelah tamu memindai QR. Di playground,
 * event di-hardcode dan kuota disimpan di localStorage supaya perilaku
 * "paket 200 foto habis" bisa benar-benar diuji tanpa backend.
 *
 * Bentuk objek ini sengaja dibuat menyerupai baris tabel `events` yang akan
 * dipakai nanti, jadi penggantian sumber data tidak menyentuh komponen.
 */

/**
 * Tema visual per event. Semua nilai warna di sini adalah CSS custom
 * property yang dipakai ulang oleh setiap util Tailwind (`bg-flash`,
 * `text-smoke`, `.btn-primary`, dst.) lewat `var(--color-*)` — jadi
 * menerapkan tema cukup dengan override variable ini di elemen pembungkus
 * sesi, tanpa menyentuh satu pun komponen langkah (bingkai/potret/suara/
 * struk). Kalau `theme` kosong, event memakai tampilan Glyka default.
 */
export interface EventTheme {
  ink: string;
  film: string;
  edge: string;
  smoke: string;
  paper: string;
  flash: string;
  live: string;
  brandPurple: string;
  brandGold: string;
  brandGoldDeep: string;
  /** Nilai `--font-display` pengganti, mis. `var(--font-playfair)`. */
  fontDisplay?: string;
  /** Folder aset dekorasi (bunga sudut dll.) relatif ke root situs. */
  decorDir?: string;
}

export interface EventConfig {
  code: string;
  names: string;
  date: string;
  venue: string;
  hashtag: string;
  /** Jumlah strip yang dibeli klien, bukan jumlah jepretan. */
  quota: number;
  allowedTemplates: string[];
  /** Pesan sambutan dari tuan rumah, muncul sebelum sesi dimulai. */
  greeting: string;
  voiceNoteEnabled: boolean;
  maxVoiceSeconds: number;
  theme?: EventTheme;
}

export const EVENTS: EventConfig[] = [
  {
    code: "SALMA-FAIZAL",
    names: "Salma & Faizal",
    date: "4 April 2027",
    venue: "Gedung Pernikahan",
    hashtag: "#SalmaFaizal",
    quota: 200,
    allowedTemplates: ["sal-s1", "sal-s2", "sal-s3", "sal-s4", "sal-s5", "sal-s6", "sal-s7"],
    greeting:
      "Terima kasih sudah datang di pernikahan kami. Ambil foto sebanyak yang kamu mau, lalu titip pesan suara untuk kami.",
    voiceNoteEnabled: true,
    maxVoiceSeconds: 15,
    theme: {
      ink: "#2B0508",
      film: "#3A0A10",
      edge: "#8C6A3F",
      smoke: "#D9BE95",
      paper: "#FDF6EC",
      flash: "#C9A66B",
      live: "#C0392B",
      brandPurple: "#5C1220",
      brandGold: "#C9A66B",
      brandGoldDeep: "#8C6A3F",
      fontDisplay: "var(--font-playfair)",
      decorDir: "/templates/Sal&Sal",
    },
  },
];

export function getEvent(code: string): EventConfig | undefined {
  return EVENTS.find((e) => e.code.toLowerCase() === code.toLowerCase());
}

export function tokensFor(ev: EventConfig): Record<string, string> {
  return {
    names: ev.names,
    date: ev.date,
    venue: ev.venue,
    hashtag: ev.hashtag,
    code: ev.code,
  };
}

/* ----------------------------------------------------------- kuota lokal */

const key = (code: string) => `glyka-photobooth:used:${code}`;

export function readUsed(code: string): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(key(code));
  const n = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function bumpUsed(code: string): number {
  const next = readUsed(code) + 1;
  window.localStorage.setItem(key(code), String(next));
  return next;
}

export function resetUsed(code: string) {
  window.localStorage.removeItem(key(code));
}

/** Nomor strip untuk struk — dipakai sebagai bukti pemakaian kuota. */
export function receiptNo(code: string, used: number): string {
  const prefix = code.replace(/[^A-Z0-9]/gi, "").slice(0, 4).toUpperCase();
  return `${prefix}-${String(used).padStart(4, "0")}`;
}
