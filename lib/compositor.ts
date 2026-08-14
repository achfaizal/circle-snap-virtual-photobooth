import type { Slot, Template, TextLayer } from "./templates";

/**
 * MESIN COMPOSITING
 *
 * Frame mentah disimpan seukuran sensor; crop, filter, dan teks dihitung saat
 * compose. Konsekuensinya tamu bisa ganti template atau filter SETELAH
 * memotret tanpa foto ulang, dan seluruh biaya render tetap nol di server.
 *
 * Urutan menggambar: kertas → foto → overlay PNG → teks event.
 * Teks digambar terakhir supaya nama pengantin tidak pernah tertutup bingkai.
 */

const overlayCache = new Map<string, HTMLImageElement>();

function loadOverlay(src: string): Promise<HTMLImageElement> {
  const cached = overlayCache.get(src);
  if (cached?.complete) return Promise.resolve(cached);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      overlayCache.set(src, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error(`Overlay tidak bisa dimuat: ${src}`));
    img.src = src;
  });
}

/** Nama family asli dari next/font, dibaca dari custom property di <html>. */
function familyFor(face: "display" | "mono"): string {
  if (typeof window === "undefined") return "sans-serif";
  const prop = face === "mono" ? "--canvas-mono" : "--canvas-display";
  const v = getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
  return v || (face === "mono" ? "monospace" : "sans-serif");
}

export function coverRect(srcW: number, srcH: number, slot: Slot) {
  const slotAspect = slot.w / slot.h;
  const srcAspect = srcW / srcH;

  if (srcAspect > slotAspect) {
    const sh = srcH;
    const sw = sh * slotAspect;
    return { sx: (srcW - sw) / 2, sy: 0, sw, sh };
  }
  const sw = srcW;
  const sh = sw / slotAspect;
  return { sx: 0, sy: (srcH - sh) / 2, sw, sh };
}

function fill(tpl: string, tokens: Record<string, string>) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => tokens[k] ?? "");
}

function measure(ctx: CanvasRenderingContext2D, text: string, tracking: number) {
  return ctx.measureText(text).width + tracking * Math.max(text.length - 1, 0);
}

function drawTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  align: CanvasTextAlign,
  tracking: number
) {
  if (tracking === 0) {
    ctx.textAlign = align;
    ctx.fillText(text, x, y);
    return;
  }
  const total = measure(ctx, text, tracking);
  let cx = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
  ctx.textAlign = "left";
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + tracking;
  }
}

/**
 * Menghitung ukuran font FINAL (setelah auto-shrink) dan baris-baris teks
 * siap gambar untuk satu layer — dipakai BERSAMA oleh `drawTextLayer` dan
 * `measureTextLayers`. Kalau dua-duanya menghitung ukurannya sendiri-
 * sendiri, cepat atau lambat hasilnya beda (handle drag di editor tidak
 * lagi menempel pas di teks yang sungguhan tercetak). Lihat
 * docs/blueprint/07-canvas-designer.md §3.
 *
 * ctx dipakai HANYA untuk ctx.measureText — tidak menggambar apa pun,
 * jadi aman dipanggil berkali-kali saat menghitung tata letak.
 */
export interface ResolvedTextLayer {
  lines: string[];
  size: number;
  family: string;
  weight: number;
  tracking: number;
  lineHeight: number;
}

function resolveTextLayer(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
  tokens: Record<string, string>,
  scale: number
): ResolvedTextLayer | null {
  let text = fill(layer.text, tokens);
  if (!text) return null;
  if (layer.uppercase) text = text.toUpperCase();

  const lines = text.split("\n");
  const tracking = (layer.tracking ?? 0) * scale;
  const family = familyFor(layer.face);
  const weight = layer.weight ?? 400;
  const lineHeight = layer.lineHeight ?? 1.2;

  // Kecilkan otomatis bila terlalu panjang. Nama pengantin bisa sangat panjang
  // ("Nur Aisyah Rahmadhani & Muhammad Fadhlurrahman") dan tidak boleh keluar
  // dari kertas — ini kasus yang pasti terjadi, bukan tepi jarang. Baris
  // terpanjang yang menentukan, supaya semua baris menyusut serentak
  // (kalau tidak, tiap baris punya ukuran font berbeda — terlihat rusak).
  let size = layer.size * scale;
  ctx.font = `${weight} ${size}px ${family}`;
  if (layer.maxWidth) {
    const limit = layer.maxWidth * scale;
    const widest = () => Math.max(...lines.map((l) => measure(ctx, l, tracking)));
    let guard = 0;
    while (widest() > limit && size > 8 && guard++ < 40) {
      size *= 0.94;
      ctx.font = `${weight} ${size}px ${family}`;
    }
  }

  return { lines, size, family, weight, tracking, lineHeight };
}

function drawTextLayer(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
  tokens: Record<string, string>,
  scale: number
) {
  if (layer.hidden) return;
  const resolved = resolveTextLayer(ctx, layer, tokens, scale);
  if (!resolved) return;

  const { lines, size, family, weight, tracking, lineHeight } = resolved;
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.fillStyle = layer.color;
  ctx.textBaseline = "alphabetic";

  const step = size * lineHeight;
  const x = layer.x * scale;
  const y0 = layer.y * scale;
  lines.forEach((line, i) => {
    drawTracked(ctx, line, x, y0 + step * i, layer.align, tracking);
  });
}

/**
 * Kotak batas tiap layer teks TAMPAK (bukan tersembunyi), dalam piksel
 * kanvas pada `scale` yang diberikan — dipakai editor untuk menempatkan
 * handle DOM tepat di atas teks yang sungguhan tergambar. Memakai
 * `resolveTextLayer` yang SAMA dengan `drawTextLayer`, jadi ukurannya
 * selalu sinkron dengan hasil ekspor.
 *
 * x/y layer adalah baseline baris PERTAMA (sesuai kontrak drawTracked),
 * jadi kotaknya diperluas ~0.25× ukuran font ke atas untuk mendekati
 * cap-height — cukup akurat untuk keperluan klik & drag, bukan pengukuran
 * tipografis presisi piksel.
 */
export interface TextLayerBounds {
  index: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export function measureTextLayers(
  ctx: CanvasRenderingContext2D,
  layers: TextLayer[],
  tokens: Record<string, string>,
  scale: number
): TextLayerBounds[] {
  const out: TextLayerBounds[] = [];
  layers.forEach((layer, index) => {
    if (layer.hidden) return;
    const resolved = resolveTextLayer(ctx, layer, tokens, scale);
    if (!resolved) return;
    ctx.font = `${resolved.weight} ${resolved.size}px ${resolved.family}`;
    const widest = Math.max(
      ...resolved.lines.map((l) => measure(ctx, l, resolved.tracking))
    );
    const step = resolved.size * resolved.lineHeight;
    const totalH = resolved.size * 1.25 + step * (resolved.lines.length - 1);
    const baseX = layer.x * scale;
    const x =
      layer.align === "center" ? baseX - widest / 2 : layer.align === "right" ? baseX - widest : baseX;
    out.push({ index, x, y: layer.y * scale - resolved.size * 0.9, w: widest, h: totalH });
  });
  return out;
}

export interface ComposeOptions {
  template: Template;
  frames: (ImageBitmap | null)[];
  filterCss: string;
  mirror: boolean;
  tokens?: Record<string, string>;
  /** 1 = resolusi ekspor penuh. Pakai 0.3–0.5 untuk preview. */
  scale?: number;
}

/**
 * Lapisan 1 (dasar): kertas + foto + overlay PNG — TANPA teks. Dipecah dari
 * `compose()` supaya Frame Builder admin bisa menggambar ulang dasarnya
 * SEKALI (mahal: memuat overlay, banyak drawImage) lalu menggambar ulang
 * teks saja berkali-kali saat klien menggeser layer (murah: cuma
 * `fillText`). Lihat docs/blueprint/07-canvas-designer.md §3.
 *
 * `compose()` di bawah tetap memanggil ini persis seperti sebelum
 * dipecah — playground & ekspor tamu TIDAK berubah sama sekali.
 */
export async function composeBase({
  template,
  frames,
  filterCss,
  mirror,
  scale = 1,
}: Omit<ComposeOptions, "tokens">): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(template.width * scale);
  canvas.height = Math.round(template.height * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D tidak tersedia di perangkat ini.");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.fillStyle = template.paper;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  template.slots.forEach((slot, i) => {
    const frame = frames[i];
    if (!frame) return;

    const { sx, sy, sw, sh } = coverRect(frame.width, frame.height, slot);
    const dx = slot.x * scale;
    const dy = slot.y * scale;
    const dw = slot.w * scale;
    const dh = slot.h * scale;

    ctx.save();
    ctx.beginPath();
    ctx.rect(dx, dy, dw, dh);
    ctx.clip();

    // ctx.filter absen di sebagian WebView lama. Foto tetap tampil tanpa
    // filter — gagal pelan, bukan gagal total.
    if (filterCss !== "none" && "filter" in ctx) ctx.filter = filterCss;

    if (mirror) {
      ctx.translate(dx + dw, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(frame, sx, sy, sw, sh, 0, 0, dw, dh);
    } else {
      ctx.drawImage(frame, sx, sy, sw, sh, dx, dy, dw, dh);
    }
    ctx.restore();
  });

  try {
    const overlay = await loadOverlay(template.overlay);
    ctx.drawImage(overlay, 0, 0, canvas.width, canvas.height);
  } catch {
    // Overlay hilang bukan alasan kehilangan foto tamu.
  }

  return canvas;
}

/** Lapisan 2 (teks): digambar LANGSUNG ke canvas dasar yang sudah ada —
    dipanggil ulang tiap kali klien mengubah teks/posisi, tanpa menyentuh
    lapisan dasar sama sekali. */
export async function drawTextLayers(
  canvas: HTMLCanvasElement,
  layers: TextLayer[],
  tokens: Record<string, string>,
  scale: number
): Promise<void> {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }
  for (const layer of layers) {
    ctx.save();
    drawTextLayer(ctx, layer, tokens, scale);
    ctx.restore();
  }
}

export async function compose({
  template,
  frames,
  filterCss,
  mirror,
  tokens = {},
  scale = 1,
}: ComposeOptions): Promise<HTMLCanvasElement> {
  const canvas = await composeBase({ template, frames, filterCss, mirror, scale });
  await drawTextLayers(canvas, template.textLayers, tokens, scale);
  return canvas;
}

export async function captureFrame(video: HTMLVideoElement): Promise<ImageBitmap> {
  if (!video.videoWidth || !video.videoHeight) throw new Error("Kamera belum siap.");
  return createImageBitmap(video);
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = "image/png",
  quality = 0.95
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Ekspor gagal."))),
      type,
      quality
    );
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
