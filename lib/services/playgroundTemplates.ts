/**
 * TEMPLATE PLAYGROUND — satu paket gaya siap pakai: warna, font, animasi,
 * bentuk tombol, DAN bingkai yang sudah diselaraskan dengannya.
 *
 * KENAPA ADA (dan kenapa ini menggantikan alur "atur 9 warna sendiri"):
 * dokumen 07 sudah memutuskan sejak awal bahwa **klien bukan desainer** —
 * yang mereka mau "kasih saya desain yang cantik, taruh nama saya di
 * situ". Menyuruh calon pengantin memilih sembilan warna, font, bentuk
 * tombol, dan lima jenis animasi satu per satu itu melanggar keputusan
 * itu, dan hasilnya gampang tidak selaras: tema maroon-emas dipasangi
 * bingkai hijau sage.
 *
 * Template menyelesaikan dua hal sekaligus:
 *   1. Sekali klik, seluruh gaya terpasang selaras.
 *   2. Pustaka bingkai ikut menyaring — klien cuma melihat bingkai yang
 *      memang dirancang untuk template itu (+ bingkai unggahannya
 *      sendiri, lihat app/admin/(protected)/events/[id]/frames/page.tsx).
 *
 * ⚠️ Template adalah TITIK AWAL, bukan kunci. Setelah memilih, klien
 * tetap bisa menyetel warna/font/bentuk sendiri lewat panel "Atur
 * sendiri" di langkah yang sama — kontrolnya cuma dijadikan sekunder,
 * tidak dihapus. Ini keputusan sadar: klien yang suka tata letak sebuah
 * template tapi ingin satu warna berbeda tidak boleh dipaksa
 * meninggalkan template itu sepenuhnya.
 *
 * CARA MENAMBAH TEMPLATE BARU (mis. "Retro"):
 *   1. Siapkan PNG bingkainya, daftarkan ke data/frames.json dengan
 *      `clientId: null` + layer teks bertoken {{names}}/{{date}}.
 *   2. Tambah satu entri di bawah, isi `frameIds` dengan id bingkai tadi.
 *   3. Selesai — template langsung muncul di langkah 1 Visual Builder,
 *      dan pustaka bingkainya otomatis ikut tersaring.
 */
import type { ThemeColors, ThemeEffects, ThemeElements, VideoCardTheme } from "@/lib/models/theme";

/**
 * Isi contoh yang ditampilkan saat template DIPRATINJAU — nama pasangan,
 * tanggal, sambutan bawaan template.
 *
 * KENAPA PERLU: tanpa ini pratinjau memakai data event klien yang sedang
 * dibuat, jadi calon pembeli yang baru mengetik "q" sebagai nama acara
 * melihat playground bertuliskan "q" — mustahil menilai desainnya. Sama
 * seperti situs undangan digital: kartu contoh selalu memakai nama
 * fiktif yang cantik, baru diganti nama asli setelah dipilih.
 *
 * ⚠️ HANYA untuk pratinjau. Saat template BENAR-BENAR dipasang, identitas
 * event klien TIDAK ditimpa — nama yang sudah dia isi waktu membuat event
 * tetap dipakai. Lihat catatan di applyTemplate (EventTemplatePicker.tsx).
 */
export interface TemplateSample {
  names: string;
  /** Tanggal siap tampil (dateDisplay), bukan format ISO. */
  date: string;
  venue: string;
  hashtag: string;
  greeting: string;
  brandLabel: string;
}

export interface PlaygroundTemplate {
  id: string;
  name: string;
  /** Satu kalimat: acara seperti apa yang cocok. */
  hint: string;
  /** Nama folder bundel di public/templates/ — PNG bingkai, dekorasi
      sudut, dan latar kartu video template ini semua tinggal di sana.
      Dicatat di sini supaya hubungan "template ↔ berkasnya" terbaca dari
      kode, bukan cuma tersirat dari URL aset di data/assets.json. */
  folder: string;
  sample: TemplateSample;
  colors: ThemeColors;
  effects: ThemeEffects;
  videoCard: VideoCardTheme;
  fontDisplayId: string;
  /** Bentuk tombol + bawaan monogram/foto. Sengaja TIDAK menyertakan
      assetId FOTO PRIBADI apa pun (logo/foto acara) — itu milik klien,
      bukan milik template, jadi tidak boleh hilang cuma karena ganti
      template (lihat mergeTemplate di EventTemplatePicker.tsx). */
  elements: ThemeElements;
  /** Dekorasi sudut & latar kartu video bawaan template — BEDA dari
      logo/foto di atas: ini aset BERSAMA (clientId: null), bagian dari
      desainnya sendiri, bukan unggahan klien. Boleh dipasang langsung
      dan DITIMPA tiap kali klien ganti template, persis seperti warna. */
  decorAssetId?: string;
  videoBgAssetId?: string;
  /** Bingkai bawaan template ini (id dari data/frames.json, clientId
      null). Kosong = template belum punya bingkai berpasangan; pustaka
      akan jatuh balik menampilkan SEMUA bingkai bersama supaya klien
      tidak terjebak tanpa pilihan sama sekali. */
  frameIds: string[];
}

export const PLAYGROUND_TEMPLATES: PlaygroundTemplate[] = [
  // KOSONG — katalog direset 2026-08-14 atas permintaan pemilik produk,
  // supaya template pertama dibangun ulang dari nol dengan struktur yang
  // konsisten. Cadangan data lama ada di data/_hidden/reset-*/ dan PNG
  // aslinya tetap utuh di public/templates/.
];

export function templateById(id: string | undefined): PlaygroundTemplate | undefined {
  if (!id) return undefined;
  return PLAYGROUND_TEMPLATES.find((t) => t.id === id);
}

/**
 * Bingkai mana yang boleh dipakai event dengan template ini.
 *
 * Template tanpa `frameIds` (atau event tanpa template sama sekali —
 * event lama) mengembalikan null, artinya "jangan disaring". Menyaring
 * jadi kosong lebih buruk daripada menampilkan semuanya: klien tidak
 * bisa memotret sama sekali.
 */
export function frameIdsForTemplate(templateId: string | undefined): string[] | null {
  const t = templateById(templateId);
  if (!t || t.frameIds.length === 0) return null;
  return t.frameIds;
}

/**
 * Gabungan SEMUA bingkai yang berpasangan dengan template mana pun di
 * katalog — dipakai sebagai kolam bingkai bersama untuk event yang
 * BELUM memilih template sama sekali (bukan lagi "tampilkan semua
 * bingkai di database").
 *
 * KENAPA BUKAN "tampilkan semua": database bingkai bersama masih
 * menyimpan bingkai lama yang tidak berpasangan dengan template mana
 * pun (mis. bingkai pernikahan Sal&Sal, Sirkus, Bola, Polos — sisa dari
 * sebelum sistem template ada). Menampilkannya lagi cuma bikin klien
 * bingung "kok ada bingkai yang gayanya beda sendiri". Aturannya
 * sekarang tegas: kolam bersama = union frameIds semua template, TITIK
 * — bingkai lama itu TETAP ada di data/frames.json (tidak dihapus, cuma
 * data desain lama), tapi tidak ditawarkan lagi sampai ada template
 * baru yang benar-benar memasangkannya.
 */
export function allTemplateFrameIds(): string[] {
  return [...new Set(PLAYGROUND_TEMPLATES.flatMap((t) => t.frameIds))];
}

/**
 * Bingkai mana milik template mana — dipakai Pustaka Bingkai untuk
 * menampilkan label "Bagian dari template X" pada event yang BELUM
 * memilih template (jadi pustakanya tidak tersaring, semua bingkai
 * tampil rata) supaya hubungan bingkai↔template tetap terlihat, bukan
 * hilang begitu saja jadi tumpukan bingkai polos tanpa keterangan.
 */
export function templateNameForFrame(frameId: string): string | undefined {
  return PLAYGROUND_TEMPLATES.find((t) => t.frameIds.includes(frameId))?.name;
}
