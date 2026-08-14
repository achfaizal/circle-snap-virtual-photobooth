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

/** Sama persis dengan `TextLayer` di lib/models/frame.ts — diimpor ulang
    (bukan didefinisikan dobel) supaya field baru (hidden/lineHeight/dst,
    ditambah untuk Frame Builder) otomatis dikenali di sini juga. Tanpa
    ini compositor.ts (yang membaca tipe dari file ini) akan menolak field
    yang sebenarnya sudah dikirim lewat toTemplates() di
    lib/adapters/legacy.ts. */
import type { TextLayer } from "./models/frame";
export type { TextLayer } from "./models/frame";

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

/*
 * Katalog bingkai HARDCODE lama (TEMPLATES) dihapus 2026-08-14.
 *
 * Sudah tidak pernah dibaca sejak bingkai pindah ke data/frames.json
 * dan diadaptasi lewat lib/adapters/legacy.ts (toTemplate). Yang masih
 * dipakai dari berkas ini cuma TIPE-nya (Template, Slot, TextLayer) —
 * itulah kenapa berkasnya tetap ada.
 */
