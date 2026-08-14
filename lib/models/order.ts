/**
 * PESANAN (add-on) — docs/blueprint/09-brd-model-bisnis.md §7.1 & §7.5.
 *
 * Fase awal SENGAJA cuma konfirmasi manual (klien transfer, staff tandai
 * lunas di /admin/orders) — payment gateway menyusul, tidak menghalangi
 * jualan pertama.
 *
 * `new_plan` ditambahkan belakangan (setelah katalog Plan sungguhan ada,
 * lib/services/planCatalog.ts) — beda dari tiga ADD-ON lain: efeknya
 * (kuota Subscription, Client.planId/eventSlotsTotal) SUDAH diterapkan
 * SAAT event dibuat (app/api/admin/events/route.ts), bukan menunggu
 * staff menekan "Tandai Lunas". Order untuk kind ini murni JEJAK
 * PEMBAYARAN — supaya staff tahu ada tagihan awal yang belum lunas,
 * bukan pemicu perubahan data (lihat lib/services/orderEffects.ts). */
export type OrderKind = "topup_strip" | "extend_days" | "add_event_slot" | "new_plan";

export interface Order {
  id: string;
  clientId: string;
  /** Event/Subscription yang kena efek — kosong untuk "add_event_slot"
      (itu menambah jatah di level Client, bukan Subscription satu event). */
  eventId?: string;
  kind: OrderKind;
  /** Besaran add-on: jumlah strip / jumlah hari / jumlah slot event —
      artinya beda-beda tergantung `kind`, lihat lib/services/addons.ts. */
  amount: number;
  priceIdr: number;
  status: "pending" | "paid" | "cancelled";
  method: "manual_transfer";
  /** Diisi staff saat konfirmasi/pembatalan — alasan atau nomor referensi
      transfer. Wajib ADA JEJAKNYA (BRD §7.5): "jangan pernah menaikkan
      kuota atau memundurkan tanggal kedaluwarsa tanpa baris transaksi
      yang menjelaskan kenapa." */
  note?: string;
  createdAt: string;
  paidAt?: string;
}

export type NewOrder = Omit<Order, "id" | "createdAt" | "paidAt" | "status"> & {
  status?: Order["status"];
};
