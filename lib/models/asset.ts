/**
 * ASET
 *
 * Sekarang aset (PNG bingkai, dekorasi sudut, latar video) ditaruh
 * manual ke public/templates/{Nama Folder}/. Ini model untuk sistem
 * upload yang menggantikannya — lihat docs/blueprint/04-arsitektur.md
 * bagian 4.
 *
 * Dua backend, deteksi lewat process.env.VERCEL — pola yang sama persis
 * dengan yang sudah dipakai lib/moments.ts:
 *   - lokal (`next dev`)  → public/uploads/{clientId}/{id}.png
 *   - Vercel              → Vercel Blob, prefix assets/{clientId}/
 */
export interface Asset {
  id: string;
  /** null = pustaka bawaan Circle Snap (aset lama di public/templates/). */
  clientId: string | null;
  kind: "frame-overlay" | "decor-corner" | "video-bg";

  /** Nama asli dari user, untuk ditampilkan di admin. */
  filename: string;
  url: string;
  contentType: string;
  bytes: number;
  width: number;
  height: number;

  createdAt: string;
}

export type NewAsset = Omit<Asset, "id" | "createdAt">;
