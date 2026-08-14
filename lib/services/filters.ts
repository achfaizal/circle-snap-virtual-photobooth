/**
 * KATALOG FILTER KAMERA
 *
 * Nilainya adalah string `filter` CSS apa adanya — dipakai SEKALIGUS oleh
 * `style.filter` pada <video> (pratinjau tamu) dan `ctx.filter` saat
 * compositing (hasil unduhan). Satu string untuk keduanya itu disengaja;
 * lihat lib/filters.ts.
 *
 * Katalog ini murni kenyamanan admin: klien memilih nama ("Hangat",
 * "Hitam Putih") alih-alih mengetik `sepia(.35) contrast(1.05)`. Kolom CSS
 * mentah tetap ada di bawahnya untuk yang mau mengatur sendiri, jadi
 * katalog ini TIDAK membatasi apa pun — cuma memberi titik awal.
 */
export interface FilterPreset {
  id: string;
  label: string;
  /** Nilai untuk SessionConfig.filterCss. Kosong = tanpa filter. */
  css: string;
  hint: string;
}

export const FILTER_PRESETS: FilterPreset[] = [
  { id: "none", label: "Asli", css: "none", hint: "Tanpa olahan warna" },
  {
    id: "cerah",
    label: "Cerah",
    css: "brightness(1.08) contrast(1.04) saturate(1.12)",
    hint: "Bawaan Circle Snap — aman untuk kebanyakan ruangan",
  },
  {
    id: "hangat",
    label: "Hangat",
    css: "brightness(1.06) contrast(1.03) saturate(1.18) sepia(0.16)",
    hint: "Kulit terlihat lebih hangat, cocok acara sore",
  },
  {
    id: "dingin",
    label: "Dingin",
    css: "brightness(1.04) contrast(1.08) saturate(0.92) hue-rotate(-8deg)",
    hint: "Nuansa kebiruan, bersih dan modern",
  },
  {
    id: "pudar",
    label: "Pudar",
    css: "brightness(1.12) contrast(0.9) saturate(0.85)",
    hint: "Gaya film lawas yang lembut",
  },
  {
    id: "dramatis",
    label: "Dramatis",
    css: "brightness(0.98) contrast(1.35) saturate(1.1)",
    hint: "Kontras tinggi, bayangan lebih tegas",
  },
  {
    id: "mono",
    label: "Hitam Putih",
    css: "grayscale(1) contrast(1.12) brightness(1.04)",
    hint: "Klasik — perhatian jatuh ke ekspresi, bukan warna baju",
  },
  {
    id: "sepia",
    label: "Sepia",
    css: "sepia(0.75) contrast(1.05) brightness(1.05)",
    hint: "Cokelat jadul, terasa nostalgia",
  },
];

/** Cocokkan string filter yang tersimpan ke preset — dipakai admin untuk
    menandai chip mana yang aktif. null = klien menulis CSS sendiri. */
export function matchFilterPreset(css: string): FilterPreset | null {
  const norm = css.trim().replace(/\s+/g, " ");
  return FILTER_PRESETS.find((p) => p.css === norm) ?? null;
}
