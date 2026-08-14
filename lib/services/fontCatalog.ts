/**
 * Katalog font display terdaftar — dipisah dari lib/db/queries/templates.ts
 * SENGAJA supaya bisa diimpor komponen KLIEN (TemplateEditor.tsx) tanpa
 * ikut menyeret lib/db/client.ts (driver `pg`, butuh modul inti Node
 * seperti `dns` — tidak jalan di browser, bundler Next.js menolaknya).
 *
 * Sinkron manual dengan FONT_DISPLAY_CSS di lib/adapters/legacy.ts —
 * itu SUMBER KEBENARAN katalog font (dimuat lewat next/font di
 * app/layout.tsx). Diduplikasi (bukan diimpor) karena FONT_DISPLAY_CSS
 * tidak diekspor dan legacy.ts murni utilitas booth.
 */
export const FONT_CATALOG = [
  "jakarta", // default aplikasi, "tanpa override"
  "playfair",
  "cormorant",
  "marcellus",
  "cinzel",
  "libre",
  "greatvibes",
  "parisienne",
  "italianno",
  "poppins",
  "montserrat",
  "lora",
] as const;
