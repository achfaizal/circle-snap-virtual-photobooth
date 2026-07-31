/**
 * PESAN SUARA
 *
 * Ini bagian yang tidak dimiliki kompetitor mana pun di kategori ini, dan
 * alasannya bukan teknis: foto adalah komoditas, suara tamu tidak. Untuk
 * pengantin, rekaman 10 detik ucapan dari tante yang jauh lebih bernilai
 * daripada strip ke-140.
 *
 * Rekaman disimpan sebagai Blob di memori. Di produk, ia diunggah bersama
 * strip dan dijahit jadi kartu video yang bisa dibagikan.
 */

export interface Recorder {
  stop: () => Promise<Blob>;
  cancel: () => void;
  /** 0–1, untuk meteran level di UI. */
  level: () => number;
}

export function audioSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined"
  );
}

function pickMime(): string {
  const options = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  return options.find((m) => MediaRecorder.isTypeSupported?.(m)) ?? "";
}

export async function startRecording(): Promise<Recorder> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  const mime = pickMime();
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.start(120);

  // Analyser hanya untuk meteran visual. Tanpa umpan balik level, tamu tidak
  // tahu apakah mikrofonnya benar-benar menangkap suara sampai terlambat.
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);
  const buf = new Uint8Array(analyser.frequencyBinCount);

  const teardown = () => {
    stream.getTracks().forEach((t) => t.stop());
    void ctx.close().catch(() => {});
  };

  return {
    level() {
      analyser.getByteTimeDomainData(buf);
      let peak = 0;
      for (const v of buf) peak = Math.max(peak, Math.abs(v - 128) / 128);
      return Math.min(1, peak * 1.8);
    },
    stop() {
      return new Promise<Blob>((resolve) => {
        rec.onstop = () => {
          teardown();
          resolve(new Blob(chunks, { type: mime || "audio/webm" }));
        };
        rec.stop();
      });
    },
    cancel() {
      try {
        rec.stop();
      } catch {
        /* recorder sudah berhenti */
      }
      teardown();
    },
  };
}

export async function blobDuration(blob: Blob): Promise<number> {
  try {
    const ctx = new AudioContext();
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    const d = buf.duration;
    void ctx.close().catch(() => {});
    return d;
  } catch {
    return 0;
  }
}
