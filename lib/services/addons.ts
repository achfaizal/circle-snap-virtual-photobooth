/**
 * KATALOG ADD-ON — docs/blueprint/09-brd-model-bisnis.md §5.5 "Add-on".
 *
 * Hardcode di sini, BUKAN model Plan tersimpan — sama persis pola
 * STARTER_QUOTA di app/api/admin/events/route.ts (jujur belum ada
 * katalog Plan sungguhan yang bisa diatur staff; kalau nanti ada,
 * pindahkan angka-angka ini ke sana, jangan dobel).
 */
import type { OrderKind } from "@/lib/models/order";

export interface AddonOption {
  id: string;
  kind: OrderKind;
  /** Besaran: strip / hari / slot event, tergantung `kind`. */
  amount: number;
  label: string;
  hint: string;
  priceIdr: number;
}

export const ADDON_CATALOG: AddonOption[] = [
  {
    id: "topup-50",
    kind: "topup_strip",
    amount: 50,
    label: "Top-up 50 strip",
    hint: "Menambah kuota strip event ini — tidak mengubah masa aktif.",
    priceIdr: 129_000,
  },
  {
    id: "extend-7",
    kind: "extend_days",
    amount: 7,
    label: "Perpanjang 7 hari",
    hint: "Masa aktif +7 hari — sesi foto & galeri momen terbuka lagi kalau sudah habis.",
    priceIdr: 99_000,
  },
  {
    id: "extend-30",
    kind: "extend_days",
    amount: 30,
    label: "Perpanjang 30 hari",
    hint: "Masa aktif +30 hari — cocok untuk acara yang butuh akses momen lebih lama.",
    priceIdr: 249_000,
  },
  {
    id: "slot-1",
    kind: "add_event_slot",
    amount: 1,
    label: "Tambah 1 jatah event",
    hint: "Untuk akun Vendor/EO yang ingin mengelola lebih banyak acara.",
    priceIdr: 399_000,
  },
];

export function addonById(id: string): AddonOption | undefined {
  return ADDON_CATALOG.find((a) => a.id === id);
}

export function formatIdr(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

/** Nomor rekening/QRIS PLACEHOLDER — belum ada payment gateway (fase
    "konfirmasi manual" per BRD §7.1). Ganti dengan rekening sungguhan
    sebelum dipakai transaksi nyata. */
export const MANUAL_TRANSFER_INSTRUCTIONS = {
  bank: "BCA",
  accountNumber: "1234567890",
  accountName: "PT Circle Snap Indonesia (contoh — ganti sebelum produksi)",
  whatsapp: "+62 812-0000-0000",
};
