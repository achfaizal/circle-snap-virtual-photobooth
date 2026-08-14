/**
 * DETEKSI SLOT — port dari algoritma Python yang sudah terbukti dipakai
 * untuk S4–S7 dan ENG1–3 (docs/blueprint/01-inventaris-playground.md
 * bagian C1, docs/blueprint/04-arsitektur.md bagian 5).
 *
 * `pngjs` dipilih (bukan `sharp`) karena murni JS — tanpa binary native,
 * jadi tidak berisiko rewel di serverless kalau nanti admin di-deploy
 * (Fase 7). Kita cuma butuh baca kanal alpha, `sharp` kelebihan untuk itu.
 *
 * Algoritma (persis 6 langkah yang sudah divalidasi di Python):
 *   1. Mask `alpha < 10` (toleransi anti-aliasing tepi)
 *   2. Connected components, 8-connectivity (flood-fill berbasis stack,
 *      BUKAN rekursi — bingkai resolusi cetak bisa >2000px per sisi,
 *      rekursi akan meledakkan call stack)
 *   3. Buang region dengan area < 5000px sebagai noise
 *   4. Bounding box per komponen
 *   5. Urutkan atas→bawah berdasarkan `y`
 *   6. `paper` = warna OPAK dengan frekuensi piksel tertinggi (bukan
 *      sampling sudut — sudut sering kena dekorasi gelap, pelajaran
 *      nyata dari analisis bingkai E1–E5 di masa lalu)
 */
import { PNG } from "pngjs";
import type { Slot } from "../models/frame";

export interface DetectedSlot extends Slot {
  /** area/bbox — mendekati 1 berarti benar-benar persegi (lubang bersih).
      Jauh di bawah 1 = kemungkinan bentuk aneh/L-shape/teks menimpa
      lubang, ditandai `suspicious` supaya admin diminta memeriksa. */
  fillRatio: number;
  suspicious: boolean;
}

export interface DetectResult {
  width: number;
  height: number;
  paper: string;
  slots: DetectedSlot[];
}

const ALPHA_THRESHOLD = 10;
const MIN_AREA = 5000;
/** Di bawah ambang ini, bounding box menyisakan cukup banyak area TIDAK
    transparan di dalamnya (bentuk bukan persegi bersih) — layak dicurigai,
    bukan ditolak (masih ditampilkan, admin yang putuskan lewat editor). */
const SUSPICIOUS_FILL_RATIO = 0.85;

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

export async function detectSlots(png: Buffer): Promise<DetectResult> {
  const image = PNG.sync.read(png);
  const { width, height, data } = image;
  const total = width * height;

  // 1. Mask alpha < 10 — Uint8Array (bukan boolean[]) supaya hemat memori
  // untuk gambar resolusi cetak besar.
  const transparent = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    transparent[i] = data[i * 4 + 3] < ALPHA_THRESHOLD ? 1 : 0;
  }

  // 2–5. Connected components 8-arah, flood-fill berbasis stack eksplisit.
  const visited = new Uint8Array(total);
  const slots: DetectedSlot[] = [];
  const stack: number[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const start = y * width + x;
      if (!transparent[start] || visited[start]) continue;

      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let area = 0;

      stack.length = 0;
      stack.push(start);
      visited[start] = 1;

      while (stack.length) {
        const idx = stack.pop()!;
        const cx = idx % width;
        const cy = (idx - cx) / width;
        area++;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        for (let dy = -1; dy <= 1; dy++) {
          const ny = cy + dy;
          if (ny < 0 || ny >= height) continue;
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = cx + dx;
            if (nx < 0 || nx >= width) continue;
            const nidx = ny * width + nx;
            if (transparent[nidx] && !visited[nidx]) {
              visited[nidx] = 1;
              stack.push(nidx);
            }
          }
        }
      }

      // 3. Buang noise
      if (area < MIN_AREA) continue;

      // 4. Bounding box sudah dihitung sambil jalan (min/maxX/Y di atas)
      const w = maxX - minX + 1;
      const h = maxY - minY + 1;
      const fillRatio = area / (w * h);

      slots.push({
        x: minX,
        y: minY,
        w,
        h,
        fillRatio,
        suspicious: fillRatio < SUSPICIOUS_FILL_RATIO,
      });
    }
  }

  // 5. Urutkan atas→bawah
  slots.sort((a, b) => a.y - b.y);

  // 6. paper = warna opak (alpha >= 250, toleransi kompresi) dengan
  // frekuensi tertinggi — histogram sederhana, cukup untuk PNG bingkai
  // yang paletnya biasanya kecil.
  const counts = new Map<string, number>();
  for (let i = 0; i < total; i++) {
    if (data[i * 4 + 3] < 250) continue;
    const hex = rgbToHex(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
    counts.set(hex, (counts.get(hex) ?? 0) + 1);
  }
  let paper = "#FFFFFF";
  let best = 0;
  for (const [hex, count] of counts) {
    if (count > best) {
      best = count;
      paper = hex;
    }
  }

  return { width, height, paper, slots };
}
