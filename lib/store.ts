import { create } from "zustand";
import type { EventConfig } from "./event";
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

/** Batas ulang per slot. Tanpa batas, satu tamu bisa menghabiskan waktu sesi
    berikutnya hanya untuk mencari pose sempurna di satu foto saja. */
export const MAX_RETAKES = 3;

interface SessionState {
  event: EventConfig | null;
  step: Step;
  template: Template | null;
  frames: (ImageBitmap | null)[];
  /** Jumlah "ulang" terpakai per slot, sejajar dengan `frames`. */
  retakes: number[];
  cursor: number;
  filterId: string;
  mirror: boolean;
  countdownFrom: number;
  autoContinue: boolean;
  shooting: boolean;
  voice: Blob | null;
  used: number;
  receipt: string | null;

  attach: (ev: EventConfig, used: number) => void;
  chooseTemplate: (t: Template) => void;
  goto: (s: Step) => void;
  pushFrame: (bmp: ImageBitmap) => void;
  retakeAt: (index: number) => void;
  canRetake: (index: number) => boolean;
  setFilter: (id: string) => void;
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
  step: "bingkai",
  template: null,
  frames: [],
  retakes: [],
  cursor: 0,
  filterId: "cerah",
  mirror: true,
  countdownFrom: 3,
  autoContinue: true,
  shooting: false,
  voice: null,
  used: 0,
  receipt: null,

  attach: (ev, used) => set({ event: ev, used }),

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
    const { frames, retakes } = get();
    if ((retakes[index] ?? 0) >= MAX_RETAKES) return;

    const nextFrames = [...frames];
    nextFrames[index]?.close?.();
    nextFrames[index] = null;

    const nextRetakes = [...retakes];
    nextRetakes[index] = (nextRetakes[index] ?? 0) + 1;

    set({ frames: nextFrames, retakes: nextRetakes, cursor: index });
  },

  canRetake: (index) => (get().retakes[index] ?? 0) < MAX_RETAKES,

  setFilter: (id) => set({ filterId: id }),
  toggleMirror: () => set((s) => ({ mirror: !s.mirror })),
  setCountdown: (n) => set({ countdownFrom: n }),
  toggleAuto: () => set((s) => ({ autoContinue: !s.autoContinue })),
  setShooting: (v) => set({ shooting: v }),
  setVoice: (b) => set({ voice: b }),

  finish: (receipt, used) => set({ receipt, used, step: "struk" }),

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
      shooting: false,
    });
  },
}));
