/**
 * Metadata jenis acara — dipakai wizard "Buat Event Baru" (langkah 1) dan
 * ikon kecil di kartu dashboard. Murni tampilan/prefill, lihat catatan di
 * lib/models/event.ts (EventKind) untuk kenapa ini bukan bagian model inti.
 */
import type { EventKind } from "../models/event";

export interface EventKindMeta {
  id: EventKind;
  emoji: string;
  label: string;
  hint: string;
  /** Prefill "Sapaan besar" — klien tetap bebas ubah di tab Info. */
  defaultBrandLabel: string;
  /** Prefill "Sambutan" — klien tetap bebas ubah di tab Info. */
  defaultGreeting: string;
}

export const EVENT_KINDS: EventKindMeta[] = [
  {
    id: "wedding",
    emoji: "💍",
    label: "Pernikahan",
    hint: "Resepsi, akad, atau keduanya",
    defaultBrandLabel: "Happy Wedding",
    defaultGreeting:
      "Terima kasih sudah datang di hari bahagia kami. Ambil foto sepuasnya, lalu titip pesan suara untuk kami.",
  },
  {
    id: "engagement",
    emoji: "💐",
    label: "Lamaran",
    hint: "Tunangan / pertunangan",
    defaultBrandLabel: "Happy Engagement",
    defaultGreeting:
      "Terima kasih sudah datang di acara lamaran kami. Ambil foto sebanyak yang kamu mau, lalu titip pesan suara untuk kami.",
  },
  {
    id: "graduation",
    emoji: "🎓",
    label: "Wisuda",
    hint: "Kelulusan / prosesi wisuda",
    defaultBrandLabel: "Selamat Wisuda",
    defaultGreeting: "Terima kasih sudah merayakan hari kelulusan ini bersama kami. Ambil foto sepuasnya di sini.",
  },
  {
    id: "birthday",
    emoji: "🎉",
    label: "Ulang Tahun",
    hint: "Perayaan hari lahir",
    defaultBrandLabel: "Happy Birthday",
    defaultGreeting: "Terima kasih sudah datang merayakan hari ulang tahun ini. Yuk ambil foto seru di sini!",
  },
  {
    id: "other",
    emoji: "✨",
    label: "Lainnya",
    hint: "Korporat, komunitas, dll.",
    defaultBrandLabel: "Selamat Datang",
    defaultGreeting: "Terima kasih sudah hadir di acara kami. Ambil foto sepuasnya di sini.",
  },
];

export function eventKindMeta(kind: EventKind | undefined): EventKindMeta | undefined {
  return EVENT_KINDS.find((k) => k.id === kind);
}
