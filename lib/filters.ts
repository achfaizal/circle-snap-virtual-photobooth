/**
 * Satu string filter dipakai dua tempat: `style.filter` pada <video> untuk
 * preview langsung, dan `ctx.filter` saat compositing. Kalau keduanya
 * didefinisikan terpisah, hasil foto tidak akan sama dengan yang dilihat
 * tamu di layar — keluhan nomor satu di produk sejenis.
 */
export const FILTER_CSS = "brightness(1.08) contrast(1.04) saturate(1.12)";
