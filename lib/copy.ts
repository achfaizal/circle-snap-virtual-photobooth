/**
 * TEKS ANTARMUKA PLAYGROUND — sumber tunggal.
 *
 * Sebelum file ini ada, semua kalimat di bawah ditulis langsung di dalam
 * komponen (WelcomeScreen, StepVoice, MomentsGallery, EventBooth). Model
 * `CopyOverrides` (lib/models/event.ts) sudah lama mendefinisikan 14 field
 * override, tapi TIDAK ADA satu komponen pun yang membacanya — jadi
 * override-nya tersimpan rapi di data dan tidak pernah berpengaruh.
 *
 * Sekarang: komponen memanggil `resolveCopy(event)`, yang mengembalikan
 * teks final = override klien kalau ada, kalau tidak default di sini.
 *
 * ⚠️ Sengaja TIDAK mencakup pesan error kamera/mikrofon — membiarkan klien
 * mengubahnya berisiko membuat panduan pemulihan jadi menyesatkan (catatan
 * yang sama sudah ada di CopyOverrides).
 */
import type { CopyOverrides } from "./models/event";

/** Nama pasangan dipecah " & " → "A dan B". Rapuh untuk acara
    non-pernikahan atau format nama lain (temuan 06-T6) — justru itu
    alasan `voiceTitle` bisa di-override. */
function defaultVoiceTitle(names: string): string {
  const [a, b] = names.split(" & ");
  return `Titip Pesan untuk ${a} dan ${b ?? "Pasangan"}`;
}

export interface CopyContext {
  names: string;
  date?: string;
  venue?: string;
  hashtag?: string;
}

/** Token yang boleh dipakai klien di dalam teks override. */
function fillTokens(text: string, ctx: CopyContext): string {
  return text
    .replace(/\{\{\s*names\s*\}\}/g, ctx.names)
    .replace(/\{\{\s*date\s*\}\}/g, ctx.date ?? "")
    .replace(/\{\{\s*venue\s*\}\}/g, ctx.venue ?? "")
    .replace(/\{\{\s*hashtag\s*\}\}/g, ctx.hashtag ?? "");
}

export type ResolvedCopy = Required<CopyOverrides>;

/** Default yang tidak bergantung data event — dipakai juga sebagai
    placeholder di admin (Visual Builder → tab Teks), supaya klien melihat
    apa yang sedang ia ganti. */
export const COPY_DEFAULTS: Omit<ResolvedCopy, "voiceTitle"> = {
  welcomeKicker: "Virtual Photobooth",
  welcomeCta: "Mulai sesi foto",
  welcomeMomentsCta: "Lihat Momen",
  guestNamePlaceholder: "Nama kamu",

  stepFrame: "Pilih Bingkai",
  stepShoot: "Sesi Foto",
  stepVoice: "Pesan Suara",
  stepResult: "Selesai",

  voiceIntro:
    "Ucapkan doa, harapan, atau kenangan manis untuk kedua mempelai. Suaramu akan menjadi kejutan berharga yang bisa mereka dengarkan kapan saja.",

  momentsTitle: "Momen Tamu Lainnya",
  momentsEmpty: "Belum ada momen tersimpan. Jadilah tamu pertama yang muncul di sini!",

  quotaExhaustedTitle: "Sesi foto belum bisa dibuka",
  quotaExhaustedBody: "Paket untuk acara ini sudah terpakai semua. Hubungi panitia kalau butuh tambahan.",
};

/**
 * Teks final untuk satu event. Override kosong/hanya-spasi dianggap tidak
 * diisi — klien yang menghapus isi field kembali ke default, bukan dapat
 * layar kosong.
 */
export function resolveCopy(ctx: CopyContext, overrides?: CopyOverrides): ResolvedCopy {
  const pick = (key: keyof CopyOverrides, fallback: string): string => {
    const raw = overrides?.[key];
    if (typeof raw !== "string" || raw.trim() === "") return fallback;
    return fillTokens(raw, ctx);
  };

  return {
    welcomeKicker: pick("welcomeKicker", COPY_DEFAULTS.welcomeKicker),
    welcomeCta: pick("welcomeCta", COPY_DEFAULTS.welcomeCta),
    welcomeMomentsCta: pick("welcomeMomentsCta", COPY_DEFAULTS.welcomeMomentsCta),
    guestNamePlaceholder: pick("guestNamePlaceholder", COPY_DEFAULTS.guestNamePlaceholder),

    stepFrame: pick("stepFrame", COPY_DEFAULTS.stepFrame),
    stepShoot: pick("stepShoot", COPY_DEFAULTS.stepShoot),
    stepVoice: pick("stepVoice", COPY_DEFAULTS.stepVoice),
    stepResult: pick("stepResult", COPY_DEFAULTS.stepResult),

    voiceTitle: pick("voiceTitle", defaultVoiceTitle(ctx.names)),
    voiceIntro: pick("voiceIntro", COPY_DEFAULTS.voiceIntro),

    momentsTitle: pick("momentsTitle", COPY_DEFAULTS.momentsTitle),
    momentsEmpty: pick("momentsEmpty", COPY_DEFAULTS.momentsEmpty),

    quotaExhaustedTitle: pick("quotaExhaustedTitle", COPY_DEFAULTS.quotaExhaustedTitle),
    quotaExhaustedBody: pick("quotaExhaustedBody", COPY_DEFAULTS.quotaExhaustedBody),
  };
}
