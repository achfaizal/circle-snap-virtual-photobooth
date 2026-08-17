/**
 * Pembersihan EXIF (Tahap 4, D-17, K7, dok 08 §1.4) — fungsi murni,
 * dipasang di SEMUA titik unggah gambar (Langkah 2), bukan cuma foto
 * tamu. BRD eksplisit: "hasilkan ulang gambar (re-encode) untuk
 * menghilangkan muatan tersembunyi" — bukan sekadar hapus tag EXIF,
 * karena metadata berbahaya (GPS dkk) bisa nempel di tempat lain
 * (profil warna, komentar teks) yang tag-stripping biasa tidak
 * menyentuh. `sharp` TIDAK menyalin metadata sumber ke output kecuali
 * `.withMetadata()` dipanggil eksplisit — jadi re-encode polos di sini
 * SUDAH bersih by default, tanpa perlu daftar tag mana yang dihapus.
 */
import sharp from "sharp";

export interface ProcessedImage {
  buffer: Buffer;
  width: number | null;
  height: number | null;
  /** Format OUTPUT sesungguhnya (bisa beda dari dugaan pemanggil kalau
      sharp tidak mengenali format asli — lihat cabang `default`). */
  format: string | undefined;
}

const JPEG_QUALITY = 92; // sama ambang dipakai StripCanvas.tsx utk unduhan JPEG — konsisten, bukan angka baru dikarang

/**
 * Baca ulang gambar → terapkan orientasi EXIF ke piksel (`.rotate()`
 * tanpa argumen) SEBELUM metadata dibuang — tanpa ini, foto HP yang
 * "tegak" cuma lewat tag orientation (sangat umum) akan tampak miring
 * setelah EXIF hilang. Lalu re-encode ke format yang SAMA (JPEG tetap
 * JPEG, PNG tetap PNG — transparansi bingkai PNG wajib lossless,
 * dipertahankan `sharp` bawaan).
 */
export async function stripImageMetadata(input: Buffer): Promise<ProcessedImage> {
  const probe = sharp(input, { failOn: "none" });
  const sourceMeta = await probe.metadata();

  let pipeline = sharp(input, { failOn: "none" }).rotate();

  switch (sourceMeta.format) {
    case "jpeg":
      pipeline = pipeline.jpeg({ quality: JPEG_QUALITY });
      break;
    case "png":
      pipeline = pipeline.png();
      break;
    case "webp":
      pipeline = pipeline.webp({ quality: JPEG_QUALITY });
      break;
    default:
      // Format tak dikenal sharp (jarang — validasi tipe berkas sudah
      // di lapisan pemanggil) — biarkan sharp pilih re-encode bawaan,
      // masih membuang metadata karena .withMetadata() tetap tidak dipanggil.
      break;
  }

  const buffer = await pipeline.toBuffer();
  const outMeta = await sharp(buffer).metadata();

  return {
    buffer,
    width: outMeta.width ?? null,
    height: outMeta.height ?? null,
    format: outMeta.format,
  };
}
