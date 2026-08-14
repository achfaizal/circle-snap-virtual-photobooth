/**
 * Validator bingkai V1–V8 — Langkah 3 rencana Tahap 2 (dok 06 §5.1, D-11).
 * Dibangun DI ATAS `detectSlots()` (lib/services/slots.ts, algoritma
 * connected-component yang sudah terbukti), BUKAN ditulis dari nol.
 *
 * ⚠️ V6 di sini pakai ambang KERAS 0,95 (tolak), beda dari
 * `SUSPICIOUS_FILL_RATIO=0.85` di slots.ts yang cuma menandai
 * `suspicious` (boleh lanjut). docs/AUDIT-AWAL.md §7.11 menyebut ini
 * persis: "V6 adalah yang menyelamatkan acara" — lapisan semi-transparan
 * yang lolos deteksi visual tapi tidak lolos V6 menghasilkan foto tamu
 * buram tertutup kabut.
 *
 * `slots` yang divalidasi di sini adalah bingkai FINAL (hasil deteksi
 * otomatis ATAU sudah dikoreksi admin di CreateFrameWizard) — bukan
 * selalu identik dengan region mentah `detectSlots()`. V4 (area
 * transparan minimal) tetap memeriksa region MENTAH dari PNG (properti
 * gambar itu sendiri), sisanya (V5–V8) memeriksa `slots` yang diberikan.
 */
import { PNG, type PNGWithMetadata } from "pngjs";
import type { Slot, TextLayer } from "../models/frame";
import { detectSlots } from "./slots";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MIN_SHORT_SIDE = 600;
const MAX_LONG_SIDE = 6000;
const MIN_TRANSPARENT_AREA_RATIO = 0.03;
const MAX_SLOTS = 6;
const MIN_SLOT_TRANSPARENCY = 0.95;
const OVERLAP_TOLERANCE_PX = 2;
const ALPHA_THRESHOLD = 10;

export interface FrameCheck {
  passed: boolean;
  message: string;
}
export interface FrameWarning {
  triggered: boolean;
  message: string;
}

export interface FrameValidationReport {
  passed: boolean;
  checks: {
    V1: FrameCheck;
    V2: FrameCheck;
    V3: FrameCheck;
    V4: FrameCheck;
    V5: FrameCheck;
    V6: FrameCheck;
    V7: FrameCheck;
    V8: FrameCheck;
  };
  warnings: {
    W1: FrameWarning;
    W2: FrameWarning;
    W3: FrameWarning;
    W4: FrameWarning;
    W5: FrameWarning;
  };
}

function ok(message: string): FrameCheck {
  return { passed: true, message };
}
function fail(message: string): FrameCheck {
  return { passed: false, message };
}

/** Fraksi piksel BENAR-BENAR transparan (alpha < 10) di dalam satu
    kotak — dipakai V6, dihitung ulang dari PNG asli, bukan diwariskan
    dari fillRatio detectSlots() (yang mengukur komponen HASIL DETEKSI,
    bukan kotak akhir yang mungkin sudah digeser admin). */
function transparencyRatioInBox(
  data: Buffer,
  imgWidth: number,
  imgHeight: number,
  box: Slot
): number {
  const x0 = Math.max(0, Math.floor(box.x));
  const y0 = Math.max(0, Math.floor(box.y));
  const x1 = Math.min(imgWidth, Math.ceil(box.x + box.w));
  const y1 = Math.min(imgHeight, Math.ceil(box.y + box.h));
  const totalBox = Math.max(1, (x1 - x0) * (y1 - y0));
  let transparent = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const alpha = data[(y * imgWidth + x) * 4 + 3];
      if (alpha < ALPHA_THRESHOLD) transparent++;
    }
  }
  return transparent / totalBox;
}

function rectsOverlap(a: Slot, b: Slot, tolerance: number): boolean {
  const ax2 = a.x + a.w;
  const ay2 = a.y + a.h;
  const bx2 = b.x + b.w;
  const by2 = b.y + b.h;
  return a.x < bx2 - tolerance && ax2 - tolerance > b.x && a.y < by2 - tolerance && ay2 - tolerance > b.y;
}

/** W1 — heuristik KASAR "kemungkinan teks tercetak": teks bikin banyak
    tepi kontras-tinggi berdekatan (huruf demi huruf) di area OPAK
    (bukan lubang foto). Dipetak-petak 20x20px, satu petak ditandai
    "berteks" kalau kepadatan tepinya di atas ambang. Bukan OCR — cuma
    proksi, sengaja diberi label "kemungkinan" (bukan kepastian) di
    pesannya, sesuai sifat W1 sendiri (peringatan, bukan penolakan). */
function detectPossibleText(png: PNG): boolean {
  const { width, height, data } = png;
  const BLOCK = 20;
  const EDGE_LUMA_DELTA = 60;
  const BLOCK_EDGE_RATIO = 0.12;

  function luma(idx: number): number {
    return 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }

  for (let by = 0; by < height; by += BLOCK) {
    for (let bx = 0; bx < width; bx += BLOCK) {
      const x1 = Math.min(width, bx + BLOCK);
      const y1 = Math.min(height, by + BLOCK);
      let opaqueCount = 0;
      let edgeCount = 0;
      let sampled = 0;

      for (let y = by; y < y1; y++) {
        for (let x = bx; x < x1 - 1; x++) {
          const idx = (y * width + x) * 4;
          if (data[idx + 3] < 250) continue; // cuma area opak yang relevan
          opaqueCount++;
          sampled++;
          const rightIdx = idx + 4;
          if (data[rightIdx + 3] >= 250 && Math.abs(luma(idx) - luma(rightIdx)) > EDGE_LUMA_DELTA) {
            edgeCount++;
          }
        }
      }

      if (opaqueCount < BLOCK * BLOCK * 0.5) continue; // bukan area opak yang cukup besar
      if (sampled > 0 && edgeCount / sampled > BLOCK_EDGE_RATIO) return true;
    }
  }
  return false;
}

export async function validateFrame(
  pngBuffer: Buffer,
  slots: Slot[],
  textLayers: TextLayer[] = []
): Promise<FrameValidationReport> {
  // V2 dulu — murah, tidak perlu decode PNG untuk tahu ukuran berkas.
  const v2 =
    pngBuffer.length <= MAX_FILE_BYTES
      ? ok(`Ukuran berkas ${(pngBuffer.length / 1_000_000).toFixed(1)} MB`)
      : fail(`Berkas ${(pngBuffer.length / 1_000_000).toFixed(1)} MB, maksimal 8 MB.`);

  let png: PNGWithMetadata;
  try {
    png = PNG.sync.read(pngBuffer);
  } catch {
    const failure = fail("Bukan berkas PNG yang valid.");
    return {
      passed: false,
      checks: { V1: failure, V2: v2, V3: failure, V4: failure, V5: failure, V6: failure, V7: failure, V8: failure },
      warnings: {
        W1: { triggered: false, message: "Tidak diperiksa — PNG gagal dibaca." },
        W2: { triggered: false, message: "Tidak diperiksa — PNG gagal dibaca." },
        W3: { triggered: false, message: "Tidak diperiksa — PNG gagal dibaca." },
        W4: { triggered: false, message: "Belum dihitung di sini — butuh konteks bingkai lain di acara yang sama." },
        W5: { triggered: false, message: "Tidak diperiksa — PNG gagal dibaca." },
      },
    };
  }

  const { width, height, data } = png;

  const v1 = png.alpha
    ? ok("Berkas punya kanal alpha.")
    : fail("PNG ini tidak punya kanal alpha (RGBA) — lubang foto tidak bisa transparan.");

  const shortSide = Math.min(width, height);
  const longSide = Math.max(width, height);
  const v3 =
    shortSide >= MIN_SHORT_SIDE && longSide <= MAX_LONG_SIDE
      ? ok(`${width}×${height}px`)
      : fail(
          `${width}×${height}px — sisi terpendek wajib ≥${MIN_SHORT_SIDE}px, sisi terpanjang ≤${MAX_LONG_SIDE}px.`
        );

  const detected = await detectSlots(pngBuffer);
  const canvasArea = width * height;
  const hasEnoughTransparentArea = detected.slots.some((s) => s.w * s.h >= canvasArea * MIN_TRANSPARENT_AREA_RATIO);
  const v4 = hasEnoughTransparentArea
    ? ok("Ada area transparan yang cukup besar.")
    : fail(`Tidak ada area transparan ≥${MIN_TRANSPARENT_AREA_RATIO * 100}% kanvas — PNG ini kemungkinan tidak punya lubang foto sungguhan.`);

  const v5 =
    slots.length >= 1 && slots.length <= MAX_SLOTS
      ? ok(`${slots.length} slot.`)
      : fail(`${slots.length} slot — BRD mewajibkan 1–${MAX_SLOTS} slot.`);

  let minTransparency = 1;
  for (const s of slots) {
    minTransparency = Math.min(minTransparency, transparencyRatioInBox(data, width, height, s));
  }
  const v6 =
    slots.length === 0 || minTransparency >= MIN_SLOT_TRANSPARENCY
      ? ok(`Transparansi slot minimal ${(minTransparency * 100).toFixed(0)}%.`)
      : fail(
          `Slot dengan transparansi terendah cuma ${(minTransparency * 100).toFixed(0)}% (wajib ≥${MIN_SLOT_TRANSPARENCY * 100}%) — foto tamu akan tertutup kabut di area itu.`
        );

  let overlapFound = false;
  for (let i = 0; i < slots.length && !overlapFound; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      if (rectsOverlap(slots[i], slots[j], OVERLAP_TOLERANCE_PX)) {
        overlapFound = true;
        break;
      }
    }
  }
  const v7 = !overlapFound
    ? ok("Tidak ada slot yang tumpang tindih.")
    : fail("Ada dua slot atau lebih yang tumpang tindih (toleransi 2px).");

  const outOfBounds = slots.some((s) => s.x < 0 || s.y < 0 || s.x + s.w > width || s.y + s.h > height);
  const v8 = !outOfBounds
    ? ok("Semua slot di dalam kanvas.")
    : fail("Ada slot yang keluar dari batas kanvas.");

  // --- peringatan (W1-W5), tidak menolak, cuma ditampilkan ---
  const w1Triggered = detectPossibleText(png);
  const smallestSlotHeightRatio = slots.length > 0 ? Math.min(...slots.map((s) => s.h / height)) : 1;
  const w2Triggered = slots.some((s) => s.h / height < 0.15);
  const extremeAspect = slots.some((s) => {
    const ratio = s.w / s.h;
    return ratio < 0.4 || ratio > 2.5;
  });
  const w5Triggered = textLayers.length === 0;

  return {
    passed: v1.passed && v2.passed && v3.passed && v4.passed && v5.passed && v6.passed && v7.passed && v8.passed,
    checks: { V1: v1, V2: v2, V3: v3, V4: v4, V5: v5, V6: v6, V7: v7, V8: v8 },
    warnings: {
      W1: {
        triggered: w1Triggered,
        message: w1Triggered
          ? "Terdeteksi kemungkinan teks tercetak di dalam bingkai (AB-18) — periksa manual."
          : "Tidak terdeteksi pola mirip teks tercetak.",
      },
      W2: {
        triggered: w2Triggered,
        message: w2Triggered
          ? `Ada slot sangat kecil (${(smallestSlotHeightRatio * 100).toFixed(0)}% tinggi kanvas).`
          : "Ukuran slot wajar.",
      },
      W3: {
        triggered: extremeAspect,
        message: extremeAspect ? "Ada slot dengan rasio ekstrem (<0,4 atau >2,5)." : "Rasio slot wajar.",
      },
      W4: {
        triggered: false,
        message: "Belum dihitung di sini — butuh konteks bingkai lain di acara yang sama (dicek saat dipasang ke template, bukan saat unggah).",
      },
      W5: {
        triggered: w5Triggered,
        message: w5Triggered
          ? "Tanpa layer teks — nama acara tidak akan muncul di hasil."
          : `${textLayers.length} layer teks terpasang.`,
      },
    },
  };
}
