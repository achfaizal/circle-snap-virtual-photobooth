# Tahap 2 — Portal Admin Minimum: Selesai

Ditulis 15 Agustus 2026, di akhir Langkah 10 rencana Tahap 2
(`docs/BRD/09-DELTA-DARI-IMPLEMENTASI.md` §5). Portal admin **pertama**
yang baca-tulis Postgres — dibangun berdampingan dengan portal admin
JSON yang sudah jalan, bukan menggantikannya (lihat §5 di bawah).

---

## 1. Lima area BRD, semua selesai

| # | Area | Rute | Aturan BRD utama |
|---|---|---|---|
| 6 | Kategori acara | `/admin/categories` | dok 04 §3 |
| 7 | Template (CRUD+variabel+bingkai+penerbitan) | `/admin/templates`, `/admin/templates/[id]`, `/admin/templates/[id]/preview` | dok 04 §4, dok 06 §2 |
| 8 | Bingkai sistem + validator | `/admin/system-frames` | dok 04 §5, dok 06 §5 (D-11) |
| 9 | Paket | `/admin/packages` | dok 02 §2 |
| 10 | Pesanan & verifikasi | `/admin/purchase-orders`, `/admin/purchase-orders/[id]` | dok 02 §4, dok 04 §7 (D-26) |

## 2. Tabrakan rute — diselesaikan sebelum kode ditulis

BRD ingin `/admin/frames` (bingkai sistem) dan `/admin/orders` (pesanan)
— keduanya BENTROK dengan rute lama yang masih dipakai klien (JSON).
Ditanyakan ke pemilik produk di awal Tahap 2: **rute baru berdampingan**
— `/admin/system-frames` dan `/admin/purchase-orders`. Rute BRD
sesungguhnya menggantikan yang lama baru di Tahap 3 (portal klien pindah
ke `/app/*`).

## 3. Dua koreksi skema Tahap 1, ditemukan saat membangun Tahap 2

1. **`templates.cover_asset_id`** — Tahap 1 menulisnya `NOT NULL`
   (salah baca dok 03 §3.2). dok 04 §4.4 eksplisit menjadikan "sampul
   terisi" gerbang PENERBITAN, bukan syarat tabel. Ditanyakan dulu,
   dijawab: ubah nullable. Migrasi `0007_templates_cover_nullable.sql`.
2. **`templates.previewed_at`** — kolom baru (di luar dok 03, murni
   pelacakan alur kerja admin — TIDAK melalui proses tanya-dulu seperti
   `frames.blurb` Tahap 1 karena bukan data klien/tamu). Migrasi
   `0008_templates_previewed_at.sql`. Dibutuhkan gerbang penerbitan
   poin ke-8.

## 4. Validator bingkai V1–V8 (D-11)

Dibangun DI ATAS `lib/services/slots.ts` (deteksi *connected-component*
yang sudah ada), bukan ditulis ulang. `lib/services/frameValidator.ts`.
V6 diperketat dari ambang lunak 0,85 ("suspicious", cuma peringatan) ke
**ambang keras 0,95** (tolak) sesuai BRD — audit Tahap 1 menyebut ini
"yang menyelamatkan acara". Diuji terhadap PNG **asli produksi**
(`ENG1-token.png`) — lolos semua V — dan 4 skenario rusak (tanpa alpha,
>8MB, 10 slot, tumpang tindih) — semua ditolak dengan pesan yang
menyebut nomor V-nya. `scripts/test-frame-validator.ts` (permanen).

## 5. Bug ditemukan & diperbaiki sendiri saat kerja (bukan keputusan BRD)

1. **`FONT_CATALOG` di file yang salah** — sempat diekspor dari
   `lib/db/queries/templates.ts`, yang mengimpor `lib/db/client.ts`
   (driver `pg`, butuh modul inti Node `dns`). Komponen klien
   (`TemplateEditor.tsx`) yang mengimpornya bikin Next.js gagal
   bundling untuk browser. Diperbaiki: `lib/services/fontCatalog.ts`
   baru, client-safe, diimpor terpisah dari sisi server.
2. **Jembatan ID sesi JSON ↔ `users.id` Postgres** — `requireStaff()`
   mengembalikan `Client` sesi JSON (`id` semacam `"cli_demo"`), BUKAN
   uuid `users.id` yang dibutuhkan `orders.verified_by_user_id`.
   Diperbaiki: dicari lewat `email` (jembatan yang sama dipakai migrasi
   Tahap 1) — dicatat eksplisit di kode, bukan didiamkan sebagai bug
   tersembunyi.
3. **Pemisahan komit `approveOrder()`** — draf pertama menaruh
   `paid`→jurnal→`fulfilled` dalam SATU transaksi, padahal dok 04 baris
   250-253 eksplisit: kalau jurnal gagal, order **tetap** `paid`
   (bukan balik `awaiting_payment`). Diperbaiki SEBELUM diuji (bukan
   ketahuan dari kegagalan uji) — Langkah 1 (commit sendiri: `paid`),
   Langkah 2 (satu transaksi terpisah: jurnal+`fulfilled`). Diuji nyata:
   transaksi Langkah 2 dipaksa gagal (FK ke akun palsu) → status TETAP
   `paid`, 0 baris jurnal nyangkut, retry lewat `approveOrder()`
   sungguhan berhasil sampai `fulfilled`.

## 6. Uji yang dijalankan (semua lulus, dicatat jujur)

- `npx tsc --noEmit` — bersih di setiap langkah
- `npm run build` — lolos, 37 rute (termasuk 5 area baru + sub-rute)
- `scripts/test-frame-validator.ts` — LULUS (permanen)
- `scripts/test-order-lifecycle.ts` — LULUS, 12 pemeriksaan (permanen)
- Sapuan 5 rute admin baru via Playwright: staf → 200 semua, 0 error
  konsol/halaman; klien non-staf → 404 semua
- Setiap Langkah (1-9) diuji sendiri saat dibangun (lihat riwayat
  percakapan) — HTTP sungguhan, bukan cuma baca kode: P-04 ditolak 400,
  DELETE kategori terpakai ditolak 409, unggah PNG rusak ditolak dengan
  pesan V spesifik, gerbang penerbitan 8 poin diuji satu-satu sampai
  lengkap, versi naik saat terbit ulang, duplikat membawa
  kategori+bingkai, nominal unik pesanan, setuju/tolak lewat UI
  sungguhan (termasuk satu kegagalan *flaky* karena *hot-reload* dev
  server yang terverifikasi BUKAN bug lewat pengujian ulang)

## 7. Belum dikerjakan (sengaja, sesuai rencana)

- **Portal klien tetap 100% JSON** — booth, wizard buat acara, billing
  klien tidak disentuh. Konsekuensinya: DUA katalog kategori/paket/
  template hidup berdampingan (satu JSON dipakai klien, satu Postgres
  dipakai admin) sampai Tahap 3 menyatukannya.
- **Auth tetap sesi JSON** (`Client.isStaff`), belum `users.platform_role`.
- **Bingkai unggahan klien** (D-10) — beda dari "bingkai sistem", itu
  Tahap 3.
- **Pratinjau template** statis (sampul+tema+`sample_data`), BUKAN
  kamera/shoot interaktif — simplifikasi disengaja, dicatat sejak
  rencana awal.
- **P-02 (super_admin-only untuk paket terjual)** — belum ada peran
  `super_admin` sungguhan di sesi JSON, jadi staf mana pun boleh; gap
  dicatat di kode.
- Voucher (D-22, prioritas rendah), notifikasi, payment gateway Rilis 2,
  kuitansi/faktur PDF, perpanjang batas bayar, refund — semua di luar 5
  butir Tahap 2, tidak disentuh.

## 8. Definisi Selesai Tahap 2

- [x] Langkah 1–10 lulus semua uji masing-masing
- [x] Kelima area BRD §5 Tahap 2 ada dan berfungsi
- [x] Validator V1-V8 menolak bingkai gagal SEBELUM tersimpan (bukan
      cuma peringatan lunak seperti sebelumnya)
- [x] Gerbang penerbitan 8 poin dok 04 §4.4 ditegakkan, bukan cuma
      dicek di UI
- [x] Pesanan→jurnal→kuota satu alur teruji atomik (termasuk uji gagal
      di tengah)
- [x] Semua rute baru staf-saja, terbukti 404 untuk klien biasa
- [x] Dokumen ini ditulis jujur termasuk bug yang ditemukan sendiri
