/**
 * Langkah 3 rencana Tahap 2 — uji validator V1-V8. Disimpan PERMANEN
 * sebagai regresi (sama pola dengan scripts/test-quota-concurrency.ts
 * Tahap 1), jalankan ulang kapan saja lib/services/frameValidator.ts
 * atau lib/services/slots.ts berubah.
 *
 * Jalan: npx tsx scripts/test-frame-validator.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { validateFrame } from "../lib/services/frameValidator";

const ROOT = join(__dirname, "..");
let failures = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✔ ${label}`);
  } else {
    console.error(`  ✘ ${label}`);
    failures++;
  }
}

async function testRealFrame() {
  console.log("\n[1] Bingkai asli (ENG1-token.png, slot nyata) — harus lolos semua V");
  const buf = readFileSync(join(ROOT, "public/templates/Engagement Photo Frame/ENG1-token.png"));
  const slots = [{ x: 367, y: 629, w: 645, h: 942 }];
  const textLayers = [{ text: "{{names}}", x: 0, y: 0, size: 10, align: "center" as CanvasTextAlign, color: "#000", face: "display" as const }];
  const report = await validateFrame(buf, slots, textLayers);

  assert(report.passed, "passed=true");
  for (const [key, check] of Object.entries(report.checks)) {
    assert(check.passed, `${key}: ${check.message}`);
  }
  assert(!report.warnings.W5.triggered, "W5 tidak terpicu (ada layer teks)");
}

async function testNoAlpha() {
  console.log("\n[2] PNG tanpa kanal alpha — harus gagal V1");
  const png = new PNG({ width: 800, height: 800, colorType: 2 }); // colorType 2 = RGB tanpa alpha
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 255;
    png.data[i + 1] = 255;
    png.data[i + 2] = 255;
    png.data[i + 3] = 255;
  }
  const buf = PNG.sync.write(png, { colorType: 2 });
  const report = await validateFrame(buf, [{ x: 10, y: 10, w: 100, h: 100 }]);
  assert(!report.checks.V1.passed, `V1 gagal: ${report.checks.V1.message}`);
  assert(!report.passed, "passed=false (keseluruhan)");
}

async function testOversized() {
  console.log("\n[3] Berkas > 8MB — harus gagal V2");
  const bigBuffer = Buffer.alloc(9 * 1024 * 1024, 0); // bukan PNG valid, tapi V2 dicek SEBELUM parse
  const report = await validateFrame(bigBuffer, []);
  assert(!report.checks.V2.passed, `V2 gagal: ${report.checks.V2.message}`);
}

async function testTooManySlots() {
  console.log("\n[4] 10 slot (batas BRD 1-6) — harus gagal V5");
  const png = new PNG({ width: 2000, height: 2000, colorType: 6 });
  // Isi opak dulu, lalu lubangi 1 area transparan besar supaya V4 tetap lolos
  // (fokus uji ini murni V5, bukan mencampur banyak kegagalan sekaligus).
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 200;
    png.data[i + 1] = 200;
    png.data[i + 2] = 200;
    png.data[i + 3] = 255;
  }
  for (let y = 200; y < 1800; y++) {
    for (let x = 200; x < 1800; x++) {
      const idx = (y * 2000 + x) * 4;
      png.data[idx + 3] = 0;
    }
  }
  const buf = PNG.sync.write(png, { colorType: 6 });
  const tenSlots = Array.from({ length: 10 }, (_, i) => ({ x: 200 + i * 10, y: 200, w: 50, h: 50 }));
  const report = await validateFrame(buf, tenSlots);
  assert(!report.checks.V5.passed, `V5 gagal: ${report.checks.V5.message}`);
}

async function testOverlap() {
  console.log("\n[5] Dua slot tumpang tindih — harus gagal V7");
  const png = new PNG({ width: 1000, height: 1000, colorType: 6 });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 200;
    png.data[i + 1] = 200;
    png.data[i + 2] = 200;
    png.data[i + 3] = 0; // semua transparan, cukup untuk uji geometri V7 murni
  }
  const buf = PNG.sync.write(png, { colorType: 6 });
  const overlapping = [
    { x: 100, y: 100, w: 200, h: 200 },
    { x: 150, y: 150, w: 200, h: 200 }, // tumpang tindih jelas dgn yang pertama
  ];
  const report = await validateFrame(buf, overlapping);
  assert(!report.checks.V7.passed, `V7 gagal: ${report.checks.V7.message}`);
}

async function main() {
  await testRealFrame();
  await testNoAlpha();
  await testOversized();
  await testTooManySlots();
  await testOverlap();

  console.log(failures === 0 ? "\n✔ LULUS — semua skenario sesuai." : `\n✘ GAGAL — ${failures} pemeriksaan meleset.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("GAGAL menjalankan uji:", e);
  process.exit(1);
});
