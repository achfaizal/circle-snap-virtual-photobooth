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

export interface VideoCardColors {
  bg: string;
  ink: string;
  smoke: string;
  waveActive: string;
  waveTrack: string;
  headingGradient: [string, string, string];
}

export interface VoiceCardOptions {
  strip: HTMLCanvasElement;
  audio: Blob;
  names: string;
  date: string;
  hashtag: string;
  /** Sama dengan `EventTheme.videoCard` — undefined = warna putih polos
      bawaan lama (DEFAULT_VIDEO_CARD di bawah), event yang belum pernah
      mengatur ini tidak berubah tampilannya sama sekali. Temuan
      docs/blueprint/06-temuan-risiko.md T2/T4: dulu warna ini HARDCODE,
      tidak pernah ikut tema event sama sekali. */
  videoCard?: VideoCardColors;
  /** URL langsung PNG dekorasi sudut event (sama dengan `EventTheme.decorUrl`)
      — kalau ada, bunga sudut yang sama dipakai di UI ikut tercetak di
      keempat sisi kartu video, bukan cuma latar putih polos. Diabaikan
      kalau `bgVideo` diisi (latar penuh sudah punya dekorasinya sendiri). */
  decorUrl?: string;
  /** Latar penuh 1080×1920 siap pakai (sama dengan `EventTheme.videoBg`) —
      kalau diisi, GANTIKAN latar putih + dekorasi sudut + sapaan/nama/
      tanggal/hashtag yang biasanya digambar di sini, karena semua itu
      sudah tercetak di dalam gambarnya sendiri. Cuma strip foto, gelombang
      suara, dan nama tamu yang tetap digambar di atasnya. */
  bgVideo?: string;
  /** Nama tamu yang mengirim pesan — dicetak sebagai "pesan suara dari
      {nama}" alih-alih generik, supaya pengantin tahu ucapan ini dari
      siapa saat kartunya dibagikan/ditonton ulang. */
  guestName?: string;
  /** Sapaan besar di atas nama, sama dengan header sesi (event.brandLabel)
      — "Happy Wedding" kalau kosong. */
  brandLabel?: string;
  onProgress?: (ratio: number) => void;
}

const W = 1080;
const H = 1920;
// Bawaan lama — dipakai kalau event belum pernah mengatur `videoCard`
// (lihat VoiceCardOptions.videoCard di atas). Kartu video default sengaja
// berlatar putih polos, lepas dari tema gelap aplikasi — ini yang
// diunggah tamu ke Reels/TikTok, jadi harus netral dan bersih di linimasa
// siapa pun, bukan otomatis ikut warna UI booth kecuali admin memang
// memilih begitu lewat tab Tema.
const DEFAULT_VIDEO_CARD: VideoCardColors = {
  bg: "#FFFFFF",
  ink: "#1A1610",
  smoke: "#8A8478",
  waveActive: "#EC4899",
  waveTrack: "#E7E2D8",
  headingGradient: ["#7C3AED", "#EC4899", "#F59E0B"],
};

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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Gambar tidak bisa dimuat: ${src}`));
    img.src = src;
  });
}

/** Satu bunga sudut yang sama dicetak ulang di keempat sisi lewat
    scale(-1)/(1,-1) — teknik yang sama dengan CSS -scale-x-100/-scale-y-100
    di EventBooth, cuma versi canvas. */
function drawCorner(
  g: CanvasRenderingContext2D,
  img: HTMLImageElement,
  anchorX: number,
  anchorY: number,
  w: number,
  h: number,
  flipX: boolean,
  flipY: boolean
) {
  g.save();
  g.translate(anchorX, anchorY);
  g.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  g.globalAlpha = 0.85;
  g.drawImage(img, 0, 0, w, h);
  g.restore();
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
  decorUrl,
  guestName,
  brandLabel,
  bgVideo,
  videoCard,
  onProgress,
}: VoiceCardOptions): Promise<Blob> {
  const vc = videoCard ?? DEFAULT_VIDEO_CARD;
  const mime = pickMime();
  if (!mime || !videoSupported()) {
    throw new Error("Browser ini belum bisa membuat video. Unduh foto dan pesan suara terpisah.");
  }

  const ctx = new AudioContext();
  const decoded = await ctx.decodeAudioData(await audio.arrayBuffer());
  const duration = Math.max(1.2, decoded.duration);
  const wave = peaks(decoded, 72);

  // Latar siap pakai gagal dimuat bukan alasan kehilangan videonya — kartu
  // jatuh balik ke latar putih + dekorasi sudut generik kalau gambarnya
  // tidak tersedia.
  const background = bgVideo ? await loadImage(bgVideo).catch(() => null) : null;

  // Dekorasi sudut cuma dipakai kalau TIDAK ada latar siap pakai (latar
  // custom sudah punya dekorasinya sendiri tercetak di dalam).
  const corner = !background && decorUrl ? await loadImage(decorUrl).catch(() => null) : null;
  const cw = 300;
  const ch = corner ? cw * (corner.height / corner.width) : 0;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d")!;

  const display = family("--canvas-display", "sans-serif");
  const mono = family("--canvas-mono", "monospace");

  // Latar custom (bgVideo) sudah punya sapaan/nama/tanggal tercetak di
  // dalamnya sendiri, jadi strip diberi ruang lebih besar & digeser turun
  // sedikit (bukan mepet ke sapaan generik yang sudah tidak digambar lagi).
  // 0.53 sempat dicoba dan KETABRAK teks "2026" bawah punya bg-video.png
  // (diverifikasi lewat video sungguhan yang diunduh & di-render ulang
  // frame-nya, bukan cuma dihitung) — 0.51 dipakai sebagai margin aman.
  // Latar default (putih polos) pakai proporsi lama, disesuaikan supaya ada
  // ruang untuk baris sapaan di atas nama.
  const maxH = background ? H * 0.51 : H * 0.6;
  const maxW = background ? W * 0.62 : W * 0.66;
  const k = Math.min(maxW / strip.width, maxH / strip.height);
  const sw = strip.width * k;
  const sh = strip.height * k;
  const sx = (W - sw) / 2;
  const sy = background ? 590 : 275;

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

    if (background) {
      // Latar siap pakai sudah punya sapaan, nama acara, tanggal, dan
      // dekorasinya sendiri tercetak di dalam — tinggal digambar penuh
      // satu kanvas, tidak perlu fill polos + dekorasi sudut generik lagi.
      g.drawImage(background, 0, 0, W, H);
    } else {
      g.fillStyle = vc.bg;
      g.fillRect(0, 0, W, H);

      // Bunga sudut yang sama dengan UI, dicetak di keempat sisi kartu
      // putih ini supaya videonya tidak terasa lepas dari tema — digambar
      // sebelum strip & teks supaya tidak menutupi isi utama.
      if (corner) {
        drawCorner(g, corner, 0, 0, cw, ch, false, false);
        drawCorner(g, corner, W, 0, cw, ch, true, false);
        drawCorner(g, corner, 0, H, cw, ch, false, true);
        drawCorner(g, corner, W, H, cw, ch, true, true);
      }
    }

    g.save();
    g.shadowColor = "rgba(0,0,0,0.18)";
    g.shadowBlur = 60;
    g.shadowOffsetY = 22;
    g.drawImage(strip, sx, sy, sw, sh);
    g.restore();

    g.textAlign = "center";

    // Sapaan besar + nama + tanggal cuma digambar kalau TIDAK ada latar
    // custom — kalau ada, semua itu sudah tercetak di dalam gambarnya
    // sendiri (lihat bgVideo di EventTheme), gambar ulang di sini cuma
    // bikin dobel.
    if (!background) {
      // Sapaan besar pakai gradasi tema kartu video (videoCard.headingGradient
      // — bawaan lama ungu→pink→emas, bisa diganti admin lewat tab Tema).
      const heading = g.createLinearGradient(W / 2 - 220, 0, W / 2 + 220, 0);
      heading.addColorStop(0, vc.headingGradient[0]);
      heading.addColorStop(0.55, vc.headingGradient[1]);
      heading.addColorStop(1, vc.headingGradient[2]);
      g.fillStyle = heading;
      g.font = `600 46px ${display}`;
      g.fillText(brandLabel ?? "Happy Wedding", W / 2, 108);

      g.fillStyle = vc.ink;
      g.font = `600 56px ${display}`;
      g.fillText(names, W / 2, 178);

      g.fillStyle = vc.smoke;
      g.font = `26px ${mono}`;
      g.fillText(date, W / 2, 220);
    }

    // Gelombang: bagian yang sudah lewat berwarna terang, sisanya redup.
    // Jarak ke strip dipersempit di latar custom (strip-nya lebih besar,
    // ruang sisa di bawah lebih sempit sebelum masuk teks tanggal bawah).
    const wy = sy + sh + (background ? 90 : 150);
    const bw = 8;
    const gap = 5;
    const total = wave.length * (bw + gap) - gap;
    let x = (W - total) / 2;
    wave.forEach((v, i) => {
      const h = 12 + v * 130;
      g.fillStyle = i / wave.length <= p ? vc.waveActive : vc.waveTrack;
      g.fillRect(x, wy - h / 2, bw, h);
      x += bw + gap;
    });

    // Nama tamu bisa panjang — kecilkan otomatis supaya caption tidak
    // keluar dari kanvas, pola yang sama dengan nama pengantin di
    // compositor.ts.
    const caption = guestName ? `pesan suara dari ${guestName}` : "pesan suara dari tamu";
    g.fillStyle = vc.smoke;
    let captionSize = 24;
    g.font = `${captionSize}px ${mono}`;
    while (g.measureText(caption).width > W - 120 && captionSize > 14) {
      captionSize -= 1;
      g.font = `${captionSize}px ${mono}`;
    }
    g.fillText(caption, W / 2, wy + (background ? 75 : 130));

    // Hashtag juga cuma untuk latar default — di latar custom dianggap
    // sudah cukup terwakili oleh brand yang tercetak di gambarnya.
    if (!background) {
      g.fillStyle = vc.ink;
      g.font = `500 30px ${display}`;
      g.fillText(hashtag, W / 2, H - 110);
    }

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
