/**
 * Regresi permanen Langkah 1 Tahap 4 (D-17) — dijalankan ulang kapan
 * pun curiga regresi. Jalan: npx tsx scripts/test-image-processing.ts
 * (tidak butuh DB, murni fungsi lokal).
 */
import sharp from "sharp";
import { stripImageMetadata } from "../lib/services/imageProcessing";

let pass = 0;
let fail = 0;
function check(label: string, ok: boolean, detail?: string) {
  if (ok) {
    pass++;
    console.log(`  OK   ${label}`);
  } else {
    fail++;
    console.log(`  GAGAL ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function testJpegExifStripped() {
  console.log("\n=== 1. JPEG dengan EXIF GPS sungguhan ===");
  // Tipe `Exif` bawaan sharp cuma mengekspos IFD0-IFD3 (bukan kunci
  // "GPS" terpisah) — tag lokasi GPS sungguhan disimpan di sub-IFD
  // yang sama, di luar cakupan API publik sharp untuk MENULIS uji.
  // Cukup buktikan EXIF apa pun (termasuk Make/Model — kamera HP nyata
  // selalu menyertakan ini bersama GPS) hilang total setelah dibersihkan.
  const withExif = await sharp({
    create: { width: 40, height: 30, channels: 3, background: { r: 200, g: 120, b: 80 } },
  })
    .jpeg()
    .withExif({
      IFD0: { Make: "Circle Snap Uji", Model: "Kamera Uji", GPSLatitude: "-6.200000", GPSLongitude: "106.816666" },
    })
    .toBuffer();

  const before = await sharp(withExif).metadata();
  check("berkas uji sungguhan punya EXIF sebelum dibersihkan", !!before.exif);

  const result = await stripImageMetadata(withExif);
  const after = await sharp(result.buffer).metadata();
  check("EXIF hilang setelah stripImageMetadata()", !after.exif);
  check("format tetap jpeg", result.format === "jpeg");
  check("dimensi terbaca (40x30)", result.width === 40 && result.height === 30);
}

async function testPngAlphaPreserved() {
  console.log("\n=== 2. PNG transparan (bingkai) — alpha TIDAK boleh berubah ===");
  const original = await sharp({
    create: { width: 20, height: 20, channels: 4, background: { r: 10, g: 20, b: 30, alpha: 0 } },
  })
    .composite([
      {
        input: await sharp({ create: { width: 10, height: 10, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } } }).png().toBuffer(),
        left: 5,
        top: 5,
      },
    ])
    .png()
    .toBuffer();

  const result = await stripImageMetadata(original);
  check("format tetap png", result.format === "png");
  check("dimensi tidak berubah", result.width === 20 && result.height === 20);

  const rawBefore = await sharp(original).raw().toBuffer();
  const rawAfter = await sharp(result.buffer).raw().toBuffer();
  check("piksel (termasuk alpha) identik sebelum/sesudah re-encode", Buffer.compare(rawBefore, rawAfter) === 0);
}

async function testOrientationApplied() {
  console.log("\n=== 3. Foto dengan tag orientation EXIF — piksel harus ikut diputar SEBELUM tag dibuang ===");
  // Gambar 40x20 (lebar > tinggi) diberi tag orientation=6 (putar 90°
  // CW saat ditampilkan) — pembaca yang MENGHORMATI tag akan
  // menampilkannya sebagai 20x40 tegak. Kalau stripImageMetadata() cuma
  // membuang tag TANPA menerapkannya dulu, hasil akhir (tanpa tag sama
  // sekali) akan tampil landscape yang salah arah.
  const landscape = await sharp({ create: { width: 40, height: 20, channels: 3, background: { r: 1, g: 2, b: 3 } } })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();

  const result = await stripImageMetadata(landscape);
  check("dimensi ikut berputar (jadi 20x40, bukan tetap 40x20)", result.width === 20 && result.height === 40);
}

async function main() {
  await testJpegExifStripped();
  await testPngAlphaPreserved();
  await testOrientationApplied();

  console.log(`\n${pass} lulus, ${fail} gagal.`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error("GAGAL:", e);
  process.exit(1);
});
