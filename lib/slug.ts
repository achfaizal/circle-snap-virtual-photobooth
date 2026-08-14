/** "Salma & Faizal" -> "salma-faizal" — dipakai wizard buat event baru
    (saran slug awal, klien masih boleh menimpa) dan validasi server. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // lepas diakritik
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
