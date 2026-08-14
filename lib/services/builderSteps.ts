/**
 * LANGKAH VISUAL BUILDER — menyusuri lima layar yang benar-benar dilalui
 * tamu, lalu ringkasan. Navigasinya Lanjut/Kembali: klien yang baru
 * pertama kali membukanya tidak perlu memutuskan "mulai dari mana".
 *
 * ⚠️ BUILDER INI TIDAK MENGATUR GAYA VISUAL. Tidak ada palet warna,
 * pemilih font, bentuk tombol, atau animasi di sini — semuanya datang
 * dari template yang dipilih di menu **Template** (rute
 * /admin/events/[id]/template).
 *
 * Riwayatnya: pernah sepuluh langkah, empat di antaranya menyuruh klien
 * menata warna/font/bentuk/animasi dari nol; lalu diringkas jadi satu
 * langkah "Pilih Template" berisi panel "Atur sendiri". Keduanya
 * melanggar keputusan produk yang sama (dokumen 07: **klien bukan
 * desainer**) — cuma dengan kadar berbeda. Sekarang tuntas: klien memilih
 * template jadi, lalu di sini dia cuma mengganti **isinya** — nama, kata-
 * kata, foto, dan perilaku sesi. Persis alur undangan digital.
 *
 * Konsekuensi yang diterima sadar: klien yang ingin satu warna berbeda
 * dari templatenya TIDAK bisa lagi mengubahnya sendiri. Itu memang
 * tujuannya — kalau ada permintaan begitu, jawabannya template baru,
 * bukan tombol baru di builder.
 */
export type BuilderStepId = "welcome" | "frame" | "shoot" | "voice" | "result" | "summary";

export type BuilderPhase = "layar" | "selesai";

export interface BuilderStep {
  id: BuilderStepId;
  phase: BuilderPhase;
  /** Nomor urut yang dilihat klien (1-based). */
  step: number;
  emoji: string;
  label: string;
  /** Satu kalimat: apa yang dikerjakan di langkah ini. */
  hint: string;
  /** Nilai ?preview= pada rute tamu — null berarti layar awal. */
  previewStep: "bingkai" | "potret" | "suara" | "struk" | null;
  /** Layar yang butuh izin kamera/mikrofon — dipakai memberi peringatan
      jujur di pratinjau, bukan membiarkan klien bingung kenapa areanya
      kosong. */
  needsDevice?: "kamera" | "mikrofon";
}

export const PHASE_LABEL: Record<BuilderPhase, string> = {
  layar: "Layar Tamu",
  selesai: "Selesai",
};

export const BUILDER_STEPS: BuilderStep[] = [
  {
    id: "welcome",
    phase: "layar",
    step: 1,
    emoji: "👋",
    label: "Selamat Datang",
    hint: "Foto, monogram, dan tulisan di layar pertama tamu",
    previewStep: null,
  },
  {
    id: "frame",
    phase: "layar",
    step: 2,
    emoji: "🖼️",
    label: "Pilih Bingkai",
    hint: "Bingkai yang ditawarkan ke tamu & label langkahnya",
    previewStep: "bingkai",
  },
  {
    id: "shoot",
    phase: "layar",
    step: 3,
    emoji: "📸",
    label: "Sesi Foto",
    hint: "Hitung mundur, pengulangan, filter warna, animasi cetak",
    previewStep: "potret",
    needsDevice: "kamera",
  },
  {
    id: "voice",
    phase: "layar",
    step: 4,
    emoji: "🎙️",
    label: "Pesan Suara",
    hint: "Rekaman ucapan tamu dan berapa lama boleh merekam",
    previewStep: "suara",
    needsDevice: "mikrofon",
  },
  {
    id: "result",
    phase: "layar",
    step: 5,
    emoji: "🎉",
    label: "Hasil & Bagikan",
    hint: "Tombol unduh, bagikan, dan galeri momen",
    previewStep: "struk",
  },
  {
    id: "summary",
    phase: "selesai",
    step: 6,
    emoji: "✅",
    label: "Ringkasan",
    hint: "Periksa sekali lagi, lalu simpan",
    previewStep: null,
  },
];

export function stepAt(index: number): BuilderStep {
  return BUILDER_STEPS[Math.max(0, Math.min(index, BUILDER_STEPS.length - 1))];
}

export function indexOfStep(id: BuilderStepId): number {
  const i = BUILDER_STEPS.findIndex((s) => s.id === id);
  return i === -1 ? 0 : i;
}
