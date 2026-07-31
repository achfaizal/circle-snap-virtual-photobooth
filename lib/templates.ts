/**
 * Template = kontrak antara desainer frame dan mesin compositing.
 *
 * Aturan yang menentukan model bisnis: PNG overlay tidak boleh memuat teks
 * apa pun. Nama pengantin, tanggal, dan tagar didefinisikan sebagai
 * `textLayers` dan digambar saat compositing dari data event. Satu template
 * karena itu melayani semua pernikahan tanpa desain ulang.
 */

export interface Slot {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Token yang tersedia: {{names}} {{date}} {{venue}} {{hashtag}} {{code}} */
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
  /** Ukuran font diperkecil otomatis bila teks melebihi lebar ini. */
  maxWidth?: number;
}

export interface Template {
  id: string;
  name: string;
  blurb: string;
  width: number;
  height: number;
  printSize: string;
  slots: Slot[];
  overlay: string;
  /** Warna dasar bila overlay gagal dimuat — mencegah kanvas hitam. */
  paper: string;
  textLayers: TextLayer[];
}

export const TEMPLATES: Template[] = [
  {
    id: "klasik",
    name: "Klasik Strip",
    blurb: "Empat jepretan di kertas putih. Bentuk yang semua orang langsung kenali.",
    width: 600,
    height: 1800,
    printSize: '2 × 6"',
    slots: [0, 1, 2, 3].map((i) => ({ x: 40, y: 40 + i * 414, w: 520, h: 390 })),
    overlay: "/templates/klasik.png",
    paper: "#F7F3EC",
    textLayers: [
      {
        text: "{{names}}",
        x: 300, y: 1738, size: 40, align: "center",
        color: "#14100E", face: "display", weight: 600,
        maxWidth: 500,
      },
      {
        text: "{{date}}",
        x: 300, y: 1782, size: 18, align: "center",
        color: "#6C625C", face: "mono", tracking: 3, uppercase: true,
        maxWidth: 500,
      },
    ],
  },
  {
    id: "duo",
    name: "Dua Kali Jepret",
    blurb: "Dua bingkai besar di kertas kuning lampu kilat. Cepat dan ramai.",
    width: 600,
    height: 1200,
    printSize: '2 × 4"',
    slots: [0, 1].map((i) => ({ x: 40, y: 40 + i * 504, w: 520, h: 480 })),
    overlay: "/templates/duo.png",
    paper: "#FFE45E",
    textLayers: [
      {
        text: "{{names}}",
        x: 300, y: 1105, size: 46, align: "center",
        color: "#14100E", face: "display", weight: 700,
        maxWidth: 500,
      },
      {
        text: "{{hashtag}}",
        x: 300, y: 1150, size: 18, align: "center",
        color: "#14100E", face: "mono", tracking: 2,
        maxWidth: 500,
      },
    ],
  },
  {
    id: "grid",
    name: "Empat Sudut",
    blurb: "Kolase 2×2 di kertas gelap. Masuk feed Instagram tanpa terpotong.",
    width: 1200,
    height: 1320,
    printSize: '4 × 4.4"',
    slots: [
      { x: 48, y: 48, w: 540, h: 540 },
      { x: 612, y: 48, w: 540, h: 540 },
      { x: 48, y: 612, w: 540, h: 540 },
      { x: 612, y: 612, w: 540, h: 540 },
    ],
    overlay: "/templates/grid.png",
    paper: "#14100E",
    textLayers: [
      {
        text: "{{names}}",
        x: 48, y: 1240, size: 54, align: "left",
        color: "#F7F3EC", face: "display", weight: 600,
        maxWidth: 760,
      },
      {
        text: "{{date}}",
        x: 1152, y: 1232, size: 20, align: "right",
        color: "#6C625C", face: "mono", tracking: 3, uppercase: true,
      },
      {
        text: "{{hashtag}}",
        x: 1152, y: 1266, size: 20, align: "right",
        color: "#FFE45E", face: "mono", tracking: 2,
      },
    ],
  },
  {
    id: "polaroid",
    name: "Polaroid Tunggal",
    blurb: "Satu foto, satu momen, ruang lapang di bawah untuk nama pasangan.",
    width: 1050,
    height: 1260,
    printSize: '3.5 × 4.2"',
    slots: [{ x: 75, y: 75, w: 900, h: 900 }],
    overlay: "/templates/polaroid.png",
    paper: "#F7F3EC",
    textLayers: [
      {
        text: "{{names}}",
        x: 525, y: 1105, size: 62, align: "center",
        color: "#14100E", face: "display", weight: 600,
        maxWidth: 880,
      },
      {
        text: "{{venue}}",
        x: 525, y: 1160, size: 22, align: "center",
        color: "#6C625C", face: "mono", tracking: 2,
        maxWidth: 880,
      },
      {
        text: "{{date}}",
        x: 525, y: 1200, size: 22, align: "center",
        color: "#6C625C", face: "mono", tracking: 3, uppercase: true,
        maxWidth: 880,
      },
    ],
  },
  {
    id: "sal-s1",
    name: "Dua Foto Elegan",
    blurb: "Dua jepretan besar dalam bingkai floral merah marun & emas.",
    width: 800,
    height: 1966,
    printSize: '2.7 × 6.6"',
    slots: [
      { x: 96, y: 99, w: 620, h: 747 },
      { x: 96, y: 873, w: 620, h: 671 },
    ],
    overlay: "/templates/Sal&Sal/S1.png",
    paper: "#45030A",
    // Nama & tanggal sudah tercetak di dalam PNG ("Sal & Sal" · "4 April
    // 2027") — bingkai ini diunggah admin per-event, jadi tidak ada teks
    // dinamis yang digambar lagi di atasnya (lihat catatan di README).
    textLayers: [],
  },
  {
    id: "sal-s2",
    name: "Tiga Foto Elegan",
    blurb: "Tiga jepretan berjajar, bingkai floral merah marun & emas.",
    width: 800,
    height: 1966,
    printSize: '2.7 × 6.6"',
    slots: [
      { x: 75, y: 350, w: 649, h: 404 },
      { x: 75, y: 796, w: 649, h: 403 },
      { x: 75, y: 1241, w: 649, h: 367 },
    ],
    overlay: "/templates/Sal&Sal/S2.png",
    paper: "#3C0A0F",
    textLayers: [],
  },
  {
    id: "sal-s3",
    name: "Lengkung Floral",
    blurb: "Satu foto besar di bingkai lengkung penuh rangkaian bunga.",
    width: 954,
    height: 1648,
    printSize: '3.2 × 5.5"',
    slots: [{ x: 127, y: 138, w: 699, h: 1088 }],
    overlay: "/templates/Sal&Sal/S3.png",
    paper: "#641E1D",
    textLayers: [],
  },
];

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
