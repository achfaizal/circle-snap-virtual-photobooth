/**
 * BINGKAI
 *
 * Menggantikan `Template` di lib/templates.ts. Selama masa migrasi kedua
 * tipe hidup berdampingan: `Template` masih dipakai playground yang
 * berjalan, `Frame` dipakai lapisan data yang baru. Setelah playground
 * pindah membaca lewat repository, `lib/templates.ts` dihapus.
 *
 * Lihat docs/blueprint/02-model-data.md.
 */

/** Satu lubang foto di dalam bingkai, dalam piksel asli PNG. */
export interface Slot {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Teks yang digambar di atas bingkai saat compositing.
 *
 * Token yang tersedia: {{names}} {{date}} {{venue}} {{hashtag}} {{code}}
 *
 * Ini yang membuat satu desain bisa melayani banyak acara — nama & tanggal
 * TIDAK dibakar ke dalam PNG. Lihat docs/blueprint/07-canvas-designer.md.
 */
export interface TextLayer {
  text: string;
  x: number;
  y: number;
  size: number;
  align: CanvasTextAlign;
  color: string;
  face: "display" | "mono";
  weight?: number;
  /** Jarak antarhuruf dalam px kanvas ekspor. */
  tracking?: number;
  uppercase?: boolean;
  /** Ukuran font mengecil otomatis bila teks melebihi lebar ini. */
  maxWidth?: number;

  /* --- Tambahan untuk canvas designer (belum didukung compositor) --- */

  /** Nama layer di daftar editor. Kosong = pakai cuplikan teksnya. */
  label?: string;
  /** Multi-baris: kelipatan ukuran font. Default 1.2. */
  lineHeight?: number;
  /** Sembunyikan tanpa menghapus — mis. klien tidak mau menampilkan tagar. */
  hidden?: boolean;
  /** Dikunci staff: klien boleh ganti isi/warna, tidak boleh menggeser.
      Menjaga komposisi template tetap rapi. */
  locked?: boolean;
}

export interface Frame {
  id: string;
  /** null = pustaka bawaan Circle Snap, bisa dipakai semua klien. */
  clientId: string | null;

  name: string;
  blurb: string;

  /** Diambil otomatis dari dimensi PNG, bukan diisi manual. */
  width: number;
  height: number;
  printSize: string;

  overlayAssetId: string;
  /** Warna dasar bila overlay gagal dimuat — mencegah kanvas hitam.
      Hasil sampling warna opak paling sering muncul di PNG. */
  paper: string;

  slots: Slot[];
  textLayers: TextLayer[];

  /** Jejak audit: dari mana koordinat slot berasal. */
  slotSource: "auto" | "manual" | "auto-adjusted";

  createdAt: string;
  updatedAt: string;
}

export type NewFrame = Omit<Frame, "id" | "createdAt" | "updatedAt">;
