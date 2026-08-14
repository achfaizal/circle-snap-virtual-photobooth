/**
 * EVENT
 *
 * Menggantikan `EventConfig` di lib/event.ts.
 *
 * Perbedaan penting dari model lama: `quota` TIDAK lagi ada di sini.
 * Kuota adalah kesepakatan komersial, bukan properti acara — ia pindah ke
 * `Subscription` (lib/models/plan.ts) supaya hanya server yang bisa
 * menulisnya. Lihat docs/blueprint/06-temuan-risiko.md temuan T1.
 */
import type { Theme } from "./theme";

/** Kategori acara — murni buat wizard/dashboard (prefill sapaan default,
    ikon kartu). TIDAK memengaruhi perilaku playground sama sekali, jadi
    aman ditambah tanpa menyentuh lib/adapters/legacy.ts. Metadata
    tampilannya (label, emoji, sapaan default) ada di
    lib/services/eventKind.ts, bukan di sini — file ini cuma tipe. */
export type EventKind = "wedding" | "engagement" | "graduation" | "birthday" | "other";

export interface EventIdentity {
  /** Nama internal untuk klien sendiri, tidak pernah tampil ke tamu. */
  internalName: string;
  /** Opsional — kosong untuk event lama sebelum field ini ada. */
  kind?: EventKind;

  /** Sapaan besar di header, galeri, dan kartu video. */
  brandLabel: string;
  names: string;

  /** ISO-8601 (YYYY-MM-DD) — bisa diurutkan & dihitung. */
  date: string;
  /** Yang benar-benar dicetak ke layar. Klien boleh menulis bebas. */
  dateDisplay: string;

  venue: string;
  hashtag: string;
  greeting: string;
}

/**
 * Perilaku sesi foto.
 *
 * Ini rumah baru untuk konstanta & "kode mati" yang sekarang tersebar:
 * MAX_RETAKES (store.ts), REVEAL_MS (FrameAssembly.tsx), FILTER_CSS
 * (filters.ts), dan countdownFrom/autoContinue/mirror yang ada di store
 * tapi tidak pernah bisa diubah dari UI mana pun (temuan 06-T5).
 */
export interface SessionConfig {
  countdownSeconds: 0 | 3 | 5 | 10;
  autoContinue: boolean;
  mirror: boolean;
  maxRetakes: number;
  /** Durasi animasi "print". 0 = tanpa animasi. */
  revealMs: number;
  /** Satu string filter CSS, dipakai bersama preview <video> dan
      ctx.filter saat compositing — supaya hasil = yang dilihat. */
  filterCss: string;
  cameraAspect: "1:1" | "4:5" | "3:4";
  guestNameRequired: boolean;

  voice: {
    enabled: boolean;
    /** Dibatasi plafon Subscription.maxVoiceSeconds. */
    maxSeconds: number;
  };

  moments: {
    enabled: boolean;
    showGuestName: boolean;
  };

  share: {
    instagram: boolean;
    whatsapp: boolean;
    nativeShare: boolean;
    downloadPng: boolean;
    downloadJpg: boolean;
    downloadVideo: boolean;
  };
}

/**
 * Override teks antarmuka. Semua opsional — yang kosong memakai default
 * sistem di lib/copy.ts.
 *
 * Sengaja TIDAK mencakup pesan error kamera/mikrofon: membiarkan klien
 * mengubahnya berisiko membuat panduan pemulihan jadi salah.
 */
export interface CopyOverrides {
  welcomeKicker?: string;
  welcomeCta?: string;
  welcomeMomentsCta?: string;
  guestNamePlaceholder?: string;

  stepFrame?: string;
  stepShoot?: string;
  stepVoice?: string;
  stepResult?: string;

  /** Default memecah `names` pakai " & " — rapuh untuk acara non-pernikahan
      atau format nama lain (temuan 06-T6). Override di sini jalan keluarnya. */
  voiceTitle?: string;
  voiceIntro?: string;

  momentsTitle?: string;
  momentsEmpty?: string;

  quotaExhaustedTitle?: string;
  quotaExhaustedBody?: string;
}

export interface Event {
  id: string;
  clientId: string;
  /** Bagian URL: /e/{slug}. Boleh diganti klien; `id` yang tetap. */
  slug: string;
  status: "draft" | "live" | "ended";

  /** Jadwal mulai acara — ISO 8601 BESERTA offset zona waktu, mis.
      "2026-08-08T19:00:00+07:00". Mengikat secara KOMERSIAL: awal
      hitungan masa aktif (lib/services/eventLifecycle.ts, default 7
      hari) — BEDA dari identity.date/dateDisplay yang murni hiasan
      tampilan untuk tamu. Mengetik ulang sapaan atau tanggal tampilan
      TIDAK BOLEH ikut mengubah kapan paketnya kedaluwarsa, karena itu
      field ini dipisah. Offset wajib disimpan (bukan waktu polos) —
      acara jam 19:00 WIB dan WIT beda 2 jam sungguhan, jangan sampai
      terkunci lebih cepat/lambat dari yang dijanjikan.
      docs/blueprint/09-brd-model-bisnis.md §7.4.
      Kosong = event belum punya jadwal pasti (wajar selagi draft). */
  startAt?: string;

  /** Template playground yang dipilih klien (lib/services/
      playgroundTemplates.ts). Menentukan gaya awal SEKALIGUS bingkai
      mana yang muncul di pustaka event ini. Kosong = event lama sebelum
      fitur template ada — diperlakukan "tanpa penyaringan", bukan
      "tanpa bingkai". */
  templateId?: string;

  identity: EventIdentity;
  /** Bingkai yang boleh dipakai, urutannya = urutan carousel tamu. */
  frameIds: string[];
  theme: Theme;
  session: SessionConfig;
  copy: CopyOverrides;

  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export type NewEvent = Omit<Event, "id" | "createdAt" | "updatedAt">;

