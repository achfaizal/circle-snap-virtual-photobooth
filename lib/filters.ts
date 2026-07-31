/**
 * Satu string filter dipakai dua tempat: `style.filter` pada <video> untuk
 * preview langsung, dan `ctx.filter` saat compositing. Kalau keduanya
 * didefinisikan terpisah, hasil foto tidak akan sama dengan yang dilihat
 * tamu di layar — keluhan nomor satu di produk sejenis.
 */

export interface Filter {
  id: string;
  name: string;
  css: string;
}

export const FILTERS: Filter[] = [
  { id: "asli", name: "Asli", css: "none" },
  {
    id: "cerah",
    name: "Cerah",
    css: "brightness(1.08) contrast(1.04) saturate(1.12)",
  },
  {
    id: "lembut",
    name: "Lembut",
    css: "brightness(1.06) contrast(0.94) saturate(0.92) sepia(0.12)",
  },
  {
    id: "film",
    name: "Film",
    css: "contrast(1.18) saturate(0.86) sepia(0.22) brightness(0.98)",
  },
  {
    id: "monokrom",
    name: "Monokrom",
    css: "grayscale(1) contrast(1.16) brightness(1.02)",
  },
  {
    id: "malam",
    name: "Malam",
    css: "brightness(0.94) contrast(1.24) saturate(1.3) hue-rotate(-8deg)",
  },
];

export function getFilter(id: string): Filter {
  return FILTERS.find((f) => f.id === id) ?? FILTERS[0];
}
