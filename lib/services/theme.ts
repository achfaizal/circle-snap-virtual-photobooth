/**
 * Pemeriksa kontras + preset tema — dipakai tab Tema di admin.
 *
 * Kenapa ini wajib ada (bukan sekadar bagus-bagusan): `ink` dan `paper`
 * bertukar peran antara tema gelap/terang (lihat catatan panjang di
 * lib/models/theme.ts) — color picker polos gampang sekali menghasilkan
 * kombinasi yang tidak terbaca. Ini sudah pernah nyaris kejadian saat
 * tema terang engagement dibuat manual dulu (butuh perhitungan kontras
 * manual berkali-kali sebelum ketemu kombinasi yang benar).
 */
import type { ThemeColors, ThemeEffects, VideoCardTheme } from "../models/theme";

/*
 * Pemeriksa kontras WCAG (hexToRgb / contrastRatio / checkThemeContrast)
 * dihapus 2026-08-14 bersama panel pemilih warna di Visual Builder.
 *
 * Warna sekarang datang dari template yang sudah diselaraskan sejak
 * dirancang, dan klien tidak punya cara mengubahnya — jadi peringatan
 * kontras di layar tidak lagi bisa ditindaklanjuti siapa pun.
 * Keselarasan warna jadi tanggung jawab saat MEMBUAT template.
 */
/** `id` sengaja `string`, bukan union "dark"|"light" seperti dulu —
    katalog palet sekarang terbuka untuk ditambah tanpa mengubah tipe di
    banyak tempat. `Theme.preset` tetap menyimpan id ini apa adanya
    (atau "custom" begitu klien menyentuh warnanya sendiri). */
export interface ThemePreset {
  id: string;
  label: string;
  /** Satu kalimat: kapan palet ini cocok dipakai. */
  hint: string;
  colors: ThemeColors;
  effects: ThemeEffects;
  videoCard: VideoCardTheme;
}

/** Kartu video default — sengaja SAMA untuk semua palet: kartu ini
    diunggah tamu ke Instagram/TikTok, jadi berlatar putih netral apa pun
    tema playground-nya (lihat VideoCardTheme di lib/models/theme.ts).
    Klien tetap bisa mengubahnya sendiri di langkah Pesan Suara. */
const DEFAULT_VIDEO_CARD: VideoCardTheme = {
  bg: "#FFFFFF",
  ink: "#1A1610",
  smoke: "#8A8478",
  waveActive: "#EC4899",
  waveTrack: "#E7E2D8",
  headingGradient: ["#7C3AED", "#EC4899", "#F59E0B"],
};

const NO_EFFECTS: ThemeEffects = {
  petals: { enabled: false, count: 0 },
  blobs: false,
  confetti: false,
  bokeh: false,
  sparkle: false,
};

const SOFT_EFFECTS: ThemeEffects = {
  petals: { enabled: true, count: 5 },
  blobs: true,
  confetti: true,
  bokeh: false,
  sparkle: false,
};

/**
 * Titik awal saat klien memilih palet.
 *
 * `polos` SENGAJA yang pertama dan jadi bawaan event baru — playground
 * mulai benar-benar kosong (putih, tanpa animasi apa pun) supaya klien
 * merasa sedang MENATA dari nol lewat Visual Builder, bukan menghapus
 * gaya orang lain. Dua preset lama (`dark`/`light`) dipertahankan
 * id-nya persis — event Salma & Faizal menyimpan id itu di datanya.
 *
 * Semua palet di bawah sudah dicek `checkThemeContrast()` lolos 4.5:1
 * untuk ketiga pasangan yang benar-benar bertumpuk di UI.
 */
export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "polos",
    label: "Polos",
    hint: "Kanvas kosong — mulai menata dari nol",
    colors: {
      ink: "#FFFFFF",
      film: "#F4F4F5",
      edge: "#D4D4D8",
      smoke: "#52525B",
      paper: "#18181B",
      flash: "#3F3F46",
      live: "#DC2626",
      brandPurple: "#27272A",
      brandGold: "#52525B",
    },
    effects: NO_EFFECTS,
    videoCard: DEFAULT_VIDEO_CARD,
  },
  {
    id: "dark",
    label: "Gelap Elegan",
    hint: "Maroon & emas — pernikahan malam",
    colors: {
      ink: "#2B0508",
      film: "#3A0A10",
      edge: "#8C6A3F",
      smoke: "#D9BE95",
      paper: "#FDF6EC",
      flash: "#C9A66B",
      live: "#C0392B",
      brandPurple: "#5C1220",
      brandGold: "#C9A66B",
    },
    effects: { petals: { enabled: true, count: 7 }, blobs: true, confetti: true },
    videoCard: DEFAULT_VIDEO_CARD,
  },
  {
    id: "light",
    label: "Terang Lembut",
    hint: "Krem & emas tua — lamaran siang",
    colors: {
      ink: "#F3F3E9",
      film: "#EAE7D8",
      edge: "#C9B78A",
      smoke: "#6B5D3F",
      paper: "#2E2A1E",
      flash: "#A98D4A",
      live: "#A63B2E",
      brandPurple: "#7A5E28",
      brandGold: "#D8C08A",
    },
    effects: { petals: { enabled: true, count: 7 }, blobs: true, confetti: true },
    videoCard: DEFAULT_VIDEO_CARD,
  },
  {
    id: "sage",
    label: "Sage & Krem",
    hint: "Hijau sage tenang — pesta kebun",
    colors: {
      ink: "#F5F7F2",
      film: "#E6EBE0",
      edge: "#A8B99C",
      smoke: "#4A5A44",
      paper: "#22301F",
      flash: "#6E8B5E",
      live: "#B4573E",
      brandPurple: "#44603A",
      brandGold: "#9BB58A",
    },
    effects: SOFT_EFFECTS,
    videoCard: DEFAULT_VIDEO_CARD,
  },
  {
    id: "navy",
    label: "Navy & Emas",
    hint: "Biru tua mewah — resepsi formal",
    colors: {
      ink: "#0E1A2B",
      film: "#16283F",
      edge: "#8A7343",
      smoke: "#B9C6D6",
      paper: "#F7FAFC",
      flash: "#D4AF62",
      live: "#E05555",
      brandPurple: "#1B3A5C",
      brandGold: "#D4AF62",
    },
    effects: { petals: { enabled: false, count: 0 }, blobs: true, confetti: true, sparkle: true },
    videoCard: DEFAULT_VIDEO_CARD,
  },
  {
    id: "rose",
    label: "Dusty Rose",
    hint: "Merah muda lembut — manis & hangat",
    colors: {
      ink: "#FDF4F3",
      film: "#F8E6E4",
      edge: "#D8A9A4",
      smoke: "#7A4F4C",
      paper: "#3A1F1D",
      flash: "#C1746C",
      live: "#C0392B",
      brandPurple: "#9C5A55",
      brandGold: "#E3B7B1",
    },
    effects: SOFT_EFFECTS,
    videoCard: DEFAULT_VIDEO_CARD,
  },
  {
    id: "terracotta",
    label: "Terakota",
    hint: "Oranye tanah — rustic & hangat",
    colors: {
      ink: "#FBF3EC",
      film: "#F3E3D5",
      edge: "#C99873",
      smoke: "#7A4E32",
      paper: "#3B2317",
      flash: "#B4633A",
      live: "#A63B2E",
      brandPurple: "#8C4527",
      brandGold: "#DDA476",
    },
    effects: SOFT_EFFECTS,
    videoCard: DEFAULT_VIDEO_CARD,
  },
  {
    id: "lavender",
    label: "Lavender",
    hint: "Ungu lembut — playful & modern",
    colors: {
      ink: "#F8F5FD",
      film: "#EDE6F8",
      edge: "#BCA8DC",
      smoke: "#5B4680",
      paper: "#2A1C42",
      flash: "#7C5BB5",
      live: "#D14D6B",
      brandPurple: "#6A4A9E",
      brandGold: "#C0A8E6",
    },
    effects: { petals: { enabled: true, count: 5 }, blobs: true, confetti: true, sparkle: true },
    videoCard: DEFAULT_VIDEO_CARD,
  },
  {
    id: "mono",
    label: "Hitam Putih",
    hint: "Monokrom tegas — modern & clean",
    colors: {
      ink: "#0A0A0A",
      film: "#1A1A1A",
      edge: "#4A4A4A",
      smoke: "#B4B4B4",
      paper: "#FAFAFA",
      flash: "#E5E5E5",
      live: "#EF4444",
      brandPurple: "#2E2E2E",
      brandGold: "#8A8A8A",
    },
    effects: { petals: { enabled: false, count: 0 }, blobs: false, confetti: true, sparkle: true },
    videoCard: DEFAULT_VIDEO_CARD,
  },
  {
    id: "tropis",
    label: "Tropis",
    hint: "Teal & koral — pesta pantai",
    colors: {
      ink: "#062A2E",
      film: "#0C3B41",
      edge: "#3E8C8A",
      smoke: "#A9D6D2",
      paper: "#F2FBFA",
      flash: "#F2856B",
      live: "#E0483C",
      brandPurple: "#0F5257",
      brandGold: "#FFB899",
    },
    effects: { petals: { enabled: false, count: 0 }, blobs: true, confetti: true, bokeh: true },
    videoCard: DEFAULT_VIDEO_CARD,
  },
];

/** Palet bawaan event baru — lihat catatan `polos` di atas. */
export const DEFAULT_PRESET_ID = "polos";

export function presetById(id: string): ThemePreset | undefined {
  return THEME_PRESETS.find((p) => p.id === id);
}

/** Label manusiawi untuk tiap token — dipakai UI, bukan nama teknis
    (docs/blueprint/03-spesifikasi-admin.md tab Tema bagian b). */
