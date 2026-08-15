/**
 * Bentuk & nilai bawaan `events.session_config` — persis contoh dok 03
 * §5.3. Dipakai saat acara BARU dibuat (Langkah 4 rencana Tahap 3);
 * Visual Builder (Langkah 7) yang nanti membaca & menulis ulang field
 * ini per pilihan klien (dibatasi plafon paket).
 *
 * `share.downloadPng/downloadJpg` bawaan MENYALA — gerbang publikasi
 * poin 11 ("minimal satu tombol unduh menyala", dok 05 §5.5) lolos
 * sejak acara dibuat, bukan jebakan tersembunyi yang baru ketahuan saat
 * klien mau terbitkan.
 */
import { FILTER_PRESETS } from "./filters";

export interface SessionConfig {
  countdownSeconds: 0 | 3 | 5 | 10;
  autoContinue: boolean;
  mirror: boolean;
  maxRetakes: number;
  revealMs: number;
  filterId: string;
  filtersEnabled: string[];
  cameraAspect: "1:1" | "4:5" | "3:4";
  voice: { enabled: boolean; maxSeconds: number; prompt: string };
  share: {
    downloadPng: boolean;
    downloadJpg: boolean;
    downloadVideo: boolean;
    instagram: boolean;
    whatsapp: boolean;
    nativeShare: boolean;
  };
}

export function defaultSessionConfig(): SessionConfig {
  return {
    countdownSeconds: 3,
    autoContinue: true,
    mirror: true,
    maxRetakes: 3,
    revealMs: 900,
    // id HARUS cocok lib/services/filters.ts FILTER_PRESETS (katalog
    // NYATA dipakai StepShoot.tsx) — "none" itu preset "Asli" di sana,
    // bukan "asli" (typo yang sempat lolos, diperbaiki sebelum Langkah
    // 10 menyambungkan sessionConfig ke booth tamu sungguhan).
    filterId: "none",
    filtersEnabled: FILTER_PRESETS.map((p) => p.id),
    cameraAspect: "3:4",
    voice: { enabled: false, maxSeconds: 15, prompt: "Titip pesan untuk kami" },
    share: {
      downloadPng: true,
      downloadJpg: true,
      downloadVideo: false,
      instagram: true,
      whatsapp: true,
      nativeShare: true,
    },
  };
}
