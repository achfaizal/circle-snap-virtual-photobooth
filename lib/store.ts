import { create } from "zustand";
import type { EventConfig } from "./event";
import { FILTER_CSS as DEFAULT_FILTER_CSS } from "./filters";
import type { Template } from "./templates";

/**
 * ALUR SESI TAMU
 *
 *   bingkai → potret → suara (opsional) → struk
 *
 * "Pilih bingkai lebih dulu" bukan urutan sembarang: tamu perlu tahu berapa
 * kali akan dijepret sebelum kamera menyala, dan strip di sampingnya sudah
 * menunjukkan bentuk akhir sejak jepretan pertama. Memilih bingkai belakangan
 * membuat sesi terasa seperti mengisi formulir.
 */
export type Step = "bingkai" | "potret" | "suara" | "struk";

/**
 * Nilai bawaan untuk perilaku sesi (docs/blueprint/02-model-data.md
 * SessionConfig) — dipakai kalau event yang di-attach() tidak membawa
 * `session` (event lama yang belum lewat lib/adapters/legacy.ts). Event
 * yang datang dari repository SELALU mengisi kelimanya lewat adapter,
 * jadi default ini murni jaring pengaman, bukan jalur normal.
 */
const DEFAULT_SESSION = {
  countdownSeconds: 3 as const,
  autoContinue: true,
  mirror: true,
  maxRetakes: 3,
  revealMs: 15000,
  filterCss: DEFAULT_FILTER_CSS,
  cameraAspect: "1:1" as const,
  guestNameRequired: true,
};

/** ID acak yang GLOBAL-unik untuk kunci penyimpanan Momen (nama file di
    Blob/lokal) — beda dari `receipt` (nomor struk) yang cuma dihitung dari
    localStorage DI HP MASING-MASING TAMU. Dua tamu di dua HP berbeda sama-
    sama mulai dari struk #1, jadi kalau nama file storage-nya ikut nomor
    struk itu, tamu kedua akan MENIMPA punya tamu pertama (foto+nama baru
    ketimpa, tapi video lama yang gagal ke-upang bisa tertinggal — pernah
    kejadian sungguhan). `receipt` tetap dipakai apa adanya untuk struk yang
    ditampilkan ke tamu dan nama file unduhan pribadi mereka — collision di
    situ tidak masalah karena tiap tamu unduh ke perangkatnya sendiri. */
function uniqueId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

interface SessionState {
  event: EventConfig | null;
  /** Bingkai yang boleh dipakai event ini, urutan carousel = urutan array.
      Diisi attach() — StepFrame membaca dari sini, BUKAN dari katalog
      statis lib/templates.ts, supaya bingkai yang diatur admin/repo
      sungguhan yang tampil ke tamu (docs/blueprint/00 prinsip P2). */
  templates: Template[];
  /** Nama tamu, diisi di layar awal sebelum sesi bisa dimulai. Dipakai
      supaya pengantin tahu foto/pesan suara itu dari siapa — dilampirkan
      ke setiap Momen dan ke kartu video pesan suara. */
  guestName: string;
  step: Step;
  template: Template | null;
  frames: (ImageBitmap | null)[];
  /** Jumlah "ulang" terpakai per slot, sejajar dengan `frames`. */
  retakes: number[];
  cursor: number;
  mirror: boolean;
  countdownFrom: number;
  autoContinue: boolean;
  shooting: boolean;
  voice: Blob | null;
  used: number;
  receipt: string | null;
  /** Kunci penyimpanan Momen — lihat catatan `uniqueId()` di atas. Terpisah
      dari `receipt` supaya nama file di server tidak pernah bentrok antar
      tamu, walau nomor struknya sama-sama mulai dari #1. */
  momentId: string | null;

  /* --- Perilaku sesi, diisi attach() dari EventConfig.session (kalau ada)
     — lihat DEFAULT_SESSION di atas & docs/blueprint/06 temuan T5. --- */
  maxRetakes: number;
  revealMs: number;
  filterCss: string;
  cameraAspect: "1:1" | "4:5" | "3:4";
  guestNameRequired: boolean;

  attach: (ev: EventConfig, used: number, templates: Template[]) => void;
  /** Menerapkan patch dari pratinjau langsung Visual Builder (lihat
      lib/services/livePreview.ts) — SAMA seperti attach() untuk bagian
      tema/sesi/teks, TAPI tidak menyentuh step/template/frames/cursor
      yang sedang berjalan. attach() dirancang untuk kedatangan tamu baru
      (mulai dari nol); dipakai di sini tamu akan terlempar balik ke layar
      bingkai setiap admin mengubah satu warna — merusak tujuan "langsung
      kelihatan" itu sendiri. */
  applyPreviewOverride: (patch: Partial<EventConfig>) => void;
  setGuestName: (name: string) => void;
  chooseTemplate: (t: Template) => void;
  goto: (s: Step) => void;
  pushFrame: (bmp: ImageBitmap) => void;
  retakeAt: (index: number) => void;
  canRetake: (index: number) => boolean;
  toggleMirror: () => void;
  setCountdown: (n: number) => void;
  toggleAuto: () => void;
  setShooting: (v: boolean) => void;
  setVoice: (b: Blob | null) => void;
  finish: (receipt: string, used: number) => void;
  newSession: () => void;
}

export const useSession = create<SessionState>((set, get) => ({
  event: null,
  templates: [],
  guestName: "",
  step: "bingkai",
  template: null,
  frames: [],
  retakes: [],
  cursor: 0,
  mirror: true,
  countdownFrom: 3,
  autoContinue: true,
  shooting: false,
  voice: null,
  used: 0,
  receipt: null,
  momentId: null,

  maxRetakes: DEFAULT_SESSION.maxRetakes,
  revealMs: DEFAULT_SESSION.revealMs,
  filterCss: DEFAULT_SESSION.filterCss,
  cameraAspect: DEFAULT_SESSION.cameraAspect,
  guestNameRequired: DEFAULT_SESSION.guestNameRequired,

  attach: (ev, used, templates) => {
    const s = { ...DEFAULT_SESSION, ...ev.session };
    set({
      event: ev,
      templates,
      used,
      countdownFrom: s.countdownSeconds,
      autoContinue: s.autoContinue,
      mirror: s.mirror,
      maxRetakes: s.maxRetakes,
      revealMs: s.revealMs,
      filterCss: s.filterCss,
      cameraAspect: s.cameraAspect,
      guestNameRequired: s.guestNameRequired,
    });
  },
  applyPreviewOverride: (patch) => {
    const prev = get().event;
    if (!prev) return;

    const nextEvent: EventConfig = {
      ...prev,
      ...patch,
      theme: patch.theme ? { ...prev.theme, ...patch.theme } : prev.theme,
      copy: patch.copy ? { ...prev.copy, ...patch.copy } : prev.copy,
      session: patch.session ? { ...prev.session, ...patch.session } : prev.session,
    };

    // Sama seperti attach(): sinkronkan field sesi yang disimpan DATAR di
    // store (StepShoot dkk. membacanya langsung, bukan lewat event.session
    // — lihat komentar DEFAULT_SESSION di atas), supaya perubahan mirror/
    // filter/hitung-mundur juga langsung terasa, bukan cuma warna.
    const s = { ...DEFAULT_SESSION, ...nextEvent.session };
    set({
      event: nextEvent,
      countdownFrom: s.countdownSeconds,
      autoContinue: s.autoContinue,
      mirror: s.mirror,
      maxRetakes: s.maxRetakes,
      revealMs: s.revealMs,
      filterCss: s.filterCss,
      cameraAspect: s.cameraAspect,
      guestNameRequired: s.guestNameRequired,
    });
  },

  // Karakter kontrol (newline dkk. dari paste, bukan spasi biasa) dibuang di
  // sumbernya — nama ini nanti dicetak ke canvas video dan disimpan sebagai
  // JSON, jangan sampai ada yang aneh ikut terbawa dari clipboard tamu.
  // eslint-disable-next-line no-control-regex
  setGuestName: (name) => set({ guestName: name.replace(/[\x00-\x1F\x7F]/g, "").slice(0, 40) }),

  chooseTemplate: (t) =>
    set({
      template: t,
      frames: new Array(t.slots.length).fill(null),
      retakes: new Array(t.slots.length).fill(0),
      cursor: 0,
      step: "potret",
    }),

  goto: (s) => set({ step: s }),

  pushFrame: (bmp) => {
    const { frames, cursor, template } = get();
    if (!template) return;

    const next = [...frames];
    next[cursor] = bmp;

    // Slot kosong berikutnya, bukan cursor + 1 — supaya "ulang foto ke-2"
    // mengisi slot 2 dan tidak menimpa slot 3.
    const empty = next.findIndex((f) => f === null);
    set({ frames: next, cursor: empty === -1 ? cursor : empty });
  },

  retakeAt: (index) => {
    const { frames, retakes, maxRetakes } = get();
    if ((retakes[index] ?? 0) >= maxRetakes) return;

    const nextFrames = [...frames];
    nextFrames[index]?.close?.();
    nextFrames[index] = null;

    const nextRetakes = [...retakes];
    nextRetakes[index] = (nextRetakes[index] ?? 0) + 1;

    set({ frames: nextFrames, retakes: nextRetakes, cursor: index });
  },

  canRetake: (index) => (get().retakes[index] ?? 0) < get().maxRetakes,

  toggleMirror: () => set((s) => ({ mirror: !s.mirror })),
  setCountdown: (n) => set({ countdownFrom: n }),
  toggleAuto: () => set((s) => ({ autoContinue: !s.autoContinue })),
  setShooting: (v) => set({ shooting: v }),
  setVoice: (b) => set({ voice: b }),

  finish: (receipt, used) => set({ receipt, used, momentId: uniqueId(), step: "struk" }),

  /** Sesi baru untuk tamu berikutnya. Kuota event sengaja tidak direset. */
  newSession: () => {
    get().frames.forEach((f) => f?.close?.());
    set({
      step: "bingkai",
      template: null,
      frames: [],
      retakes: [],
      cursor: 0,
      voice: null,
      receipt: null,
      momentId: null,
      shooting: false,
    });
  },
}));
