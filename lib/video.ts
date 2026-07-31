/**
 * KARTU SUARA
 *
 * Strip statis buruk performanya di Reels dan TikTok — dua platform yang jadi
 * jalur penyebaran paling penting untuk produk ini. Jadi kalau tamu merekam
 * pesan, kita jahit strip dan suaranya jadi video vertikal 1080×1920 langsung
 * di perangkat, tanpa server encoding sama sekali.
 *
 * Gerakannya sengaja minim: satu bar gelombang yang berjalan mengikuti audio.
 * Cukup untuk lolos deteksi "gambar diam" di platform, tanpa mengalihkan
 * perhatian dari fotonya.
 */

export interface VoiceCardOptions {
  strip: HTMLCanvasElement;
  audio: Blob;
  names: string;
  date: string;
  hashtag: string;
  onProgress?: (ratio: number) => void;
}

const W = 1080;
const H = 1920;
// Kartu video sengaja berlatar putih polos, lepas dari tema gelap aplikasi —
// ini yang diunggah tamu ke Reels/TikTok, jadi harus netral dan bersih di
// linimasa siapa pun, bukan ikut warna UI booth.
const BG = "#FFFFFF";
const INK = "#1A1610";
const FLASH = "#EC4899";
const SMOKE = "#8A8478";
const TRACK = "#E7E2D8";

export function videoSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    typeof HTMLCanvasElement.prototype.captureStream === "function"
  );
}

function pickMime(): string | null {
  const options = [
    "video/mp4;codecs=avc1,mp4a.40.2",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  return options.find((m) => MediaRecorder.isTypeSupported?.(m)) ?? null;
}

function family(prop: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
  return v || fallback;
}

/** Ambil puncak amplitudo per bucket untuk digambar sebagai gelombang. */
function peaks(buffer: AudioBuffer, buckets: number): number[] {
  const data = buffer.getChannelData(0);
  const size = Math.floor(data.length / buckets) || 1;
  const out: number[] = [];
  for (let i = 0; i < buckets; i++) {
    let peak = 0;
    const start = i * size;
    for (let j = 0; j < size; j += 8) {
      peak = Math.max(peak, Math.abs(data[start + j] ?? 0));
    }
    out.push(Math.min(1, peak * 1.6));
  }
  return out;
}

export async function renderVoiceCard({
  strip,
  audio,
  names,
  date,
  hashtag,
  onProgress,
}: VoiceCardOptions): Promise<Blob> {
  const mime = pickMime();
  if (!mime || !videoSupported()) {
    throw new Error("Browser ini belum bisa membuat video. Unduh foto dan pesan suara terpisah.");
  }

  const ctx = new AudioContext();
  const decoded = await ctx.decodeAudioData(await audio.arrayBuffer());
  const duration = Math.max(1.2, decoded.duration);
  const wave = peaks(decoded, 72);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d")!;

  const display = family("--canvas-display", "sans-serif");
  const mono = family("--canvas-mono", "monospace");

  // Strip ditempatkan di area aman, menyisakan ruang bawah untuk gelombang.
  const maxH = H * 0.62;
  const maxW = W * 0.66;
  const k = Math.min(maxW / strip.width, maxH / strip.height);
  const sw = strip.width * k;
  const sh = strip.height * k;
  const sx = (W - sw) / 2;
  const sy = 250;

  const dest = ctx.createMediaStreamDestination();
  const source = ctx.createBufferSource();
  source.buffer = decoded;
  source.connect(dest); // hanya ke rekaman — tidak dibunyikan ke speaker

  const stream = canvas.captureStream(30);
  dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));

  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);

  const draw = (t: number) => {
    const p = Math.min(1, t / duration);

    g.fillStyle = BG;
    g.fillRect(0, 0, W, H);

    g.save();
    g.shadowColor = "rgba(0,0,0,0.18)";
    g.shadowBlur = 60;
    g.shadowOffsetY = 22;
    g.drawImage(strip, sx, sy, sw, sh);
    g.restore();

    g.textAlign = "center";
    g.fillStyle = INK;
    g.font = `600 62px ${display}`;
    g.fillText(names, W / 2, 150);

    g.fillStyle = SMOKE;
    g.font = `26px ${mono}`;
    g.fillText(date, W / 2, 196);

    // Gelombang: bagian yang sudah lewat berwarna terang, sisanya redup.
    const wy = sy + sh + 150;
    const bw = 8;
    const gap = 5;
    const total = wave.length * (bw + gap) - gap;
    let x = (W - total) / 2;
    wave.forEach((v, i) => {
      const h = 12 + v * 130;
      g.fillStyle = i / wave.length <= p ? FLASH : TRACK;
      g.fillRect(x, wy - h / 2, bw, h);
      x += bw + gap;
    });

    g.fillStyle = SMOKE;
    g.font = `24px ${mono}`;
    g.fillText("pesan suara dari tamu", W / 2, wy + 130);

    g.fillStyle = INK;
    g.font = `500 30px ${display}`;
    g.fillText(hashtag, W / 2, H - 110);

    onProgress?.(p);
  };

  return new Promise<Blob>((resolve, reject) => {
    let raf = 0;
    const t0 = performance.now();

    const loop = () => {
      const t = (performance.now() - t0) / 1000;
      draw(t);
      if (t < duration + 0.35) {
        raf = requestAnimationFrame(loop);
      } else {
        cancelAnimationFrame(raf);
        rec.stop();
      }
    };

    rec.onstop = () => {
      stream.getTracks().forEach((tr) => tr.stop());
      void ctx.close().catch(() => {});
      const blob = new Blob(chunks, { type: mime });
      blob.size > 0 ? resolve(blob) : reject(new Error("Video kosong."));
    };
    rec.onerror = () => reject(new Error("Perekaman video gagal."));

    draw(0);
    rec.start(200);
    source.start();
    raf = requestAnimationFrame(loop);
  });
}

export function videoExtension(blob: Blob): string {
  return blob.type.includes("mp4") ? "mp4" : "webm";
}
