/**
 * TEMA
 *
 * Semua nilai warna di sini dipetakan jadi CSS custom property lewat
 * `themeVars()`, lalu dipakai ulang oleh setiap util Tailwind
 * (`bg-flash`, `text-smoke`, `.btn-primary`, dst.).
 *
 * Lihat docs/blueprint/02-model-data.md bagian 4.
 */

/**
 * 9 token warna.
 *
 * ⚠️ `ink` dan `paper` BUKAN sekadar "latar" dan "teks" — keduanya
 * bertukar peran antara tema gelap dan terang:
 *
 *   tema gelap : ink = latar gelap,  paper = teks terang
 *   tema terang: ink = latar terang, paper = teks gelap
 *
 * `ink` juga dipakai sebagai warna teks DI ATAS tombol gradient
 * (class `text-ink`), dan `paper` sebagai latar tombol sekunder
 * (`bg-paper`). Karena itu editor tema wajib punya pemeriksa kontras —
 * color picker polos akan menghasilkan playground yang tidak terbaca.
 */
export interface ThemeColors {
  ink: string;
  film: string;
  edge: string;
  smoke: string;
  paper: string;
  flash: string;
  live: string;
  brandPurple: string;
  brandGold: string;
}

export interface ThemeEffects {
  petals: { enabled: boolean; count: number };
  blobs: boolean;
  confetti: boolean;
  /** Bulatan cahaya lembut yang naik pelan — kesan pesta/bokeh kamera.
      Opsional: undefined = mati (beda dari petals/blobs yang default
      MENYALA demi kompatibilitas event lama). Efek baru tidak boleh
      tiba-tiba muncul di acara yang sudah berjalan. */
  bokeh?: boolean;
  /** Bintik berkelip halus — aksen mewah, jauh lebih tenang dari konfeti. */
  sparkle?: boolean;
}

/**
 * Warna kartu video pesan suara.
 *
 * DIPISAH dari `ThemeColors` karena kartu ini berlatar terang dan
 * diunggah ke Reels/TikTok — belum tentu cocok kalau ikut tema gelap
 * playground.
 *
 * Saat ini semua nilai ini masih hardcoded sebagai konstanta modul di
 * lib/video.ts dan tidak mengikuti tema sama sekali (temuan 06-T4).
 */
export interface VideoCardTheme {
  bg: string;
  ink: string;
  smoke: string;
  waveActive: string;
  waveTrack: string;
  /** Gradasi judul: [awal, tengah, akhir] */
  headingGradient: [string, string, string];
}

/**
 * Elemen-elemen yang bisa diatur klien per layar, di luar warna & font.
 *
 * Semua opsional dengan default yang MENYAMAI perilaku lama — event yang
 * dibuat sebelum field ini ada tidak boleh berubah tampilannya sedikit
 * pun. Lihat pemakainya di components/WelcomeScreen.tsx.
 */
export interface ThemeElements {
  /** Lingkaran inisial di layar Selamat Datang ("S · F"). */
  monogram?: {
    /** "initials" = dihitung dari nama (perilaku lama & default),
        "image" = pakai logo yang diunggah klien, "hidden" = tidak tampil. */
    mode: "initials" | "image" | "hidden";
    assetId?: string;
    /** Diameter dalam px. Default 64 (h-16 w-16 di kode lama). */
    size?: number;
    /** Tampilkan cincin tipis di sekeliling. Default true. */
    ring?: boolean;
  };
  /**
   * Foto besar di layar Selamat Datang — persis peran foto pasangan di
   * undangan digital. BEDA dari `monogram` (lingkaran kecil berisi
   * inisial/logo): ini fotonya sendiri, jadi elemen utama layar.
   *
   * Default `hidden` — playground SEBELUM ini tidak punya slot foto sama
   * sekali, jadi event lama tidak boleh tiba-tiba menampilkan kotak
   * kosong.
   *
   *   circle → foto bulat di atas nama, menggantikan posisi monogram
   *   cover  → foto memenuhi layar sebagai latar, teks di atasnya
   *            (butuh `overlay` supaya teks tetap terbaca)
   */
  heroPhoto?: {
    mode: "hidden" | "circle" | "cover";
    assetId?: string;
    /** Diameter (mode circle) dalam px. Default 160. */
    size?: number;
    /** 0–90: kepekatan lapisan gelap di atas foto (mode cover). Tanpa
        ini teks putih di atas foto terang jadi tidak terbaca. Default 45. */
    overlay?: number;
  };
  /** Bentuk semua tombol utama playground. Default "pill" (rounded-full
      di kode lama). */
  buttonShape?: "pill" | "rounded" | "square";
  /** Gaya latar tombol utama. Default "gradient" (kelas .btn-primary
      lama memakai gradasi brandPurple → brandGold). */
  buttonStyle?: "gradient" | "solid" | "outline";
  /** Sudut kartu/panel dalam px. Default 16. */
  cardRadius?: number;
}

export interface Theme {
  /** id palet dari THEME_PRESETS (lib/services/theme.ts), atau "custom"
      begitu klien mengubah salah satu warnanya sendiri. Sengaja `string`,
      bukan union tetap — katalog palet bisa bertambah tanpa memaksa
      perubahan tipe di banyak berkas, dan id lama ("dark"/"light") yang
      sudah tersimpan di data event tetap valid apa adanya. */
  preset: string;
  /** Lihat ThemeElements — semua opsional, default = perilaku lama. */
  elements?: ThemeElements;
  colors: ThemeColors;
  /** Rujuk katalog font (FontOption.id), bukan nilai CSS mentah. */
  fontDisplayId: string;
  fontMonoId: string;
  /** PNG dekorasi sudut — satu gambar, dipantulkan ke 4 sudut lewat CSS. */
  decorAssetId?: string;
  /** Latar penuh 1080×1920 untuk kartu video pesan suara. */
  videoBgAssetId?: string;
  effects: ThemeEffects;
  videoCard: VideoCardTheme;
}


