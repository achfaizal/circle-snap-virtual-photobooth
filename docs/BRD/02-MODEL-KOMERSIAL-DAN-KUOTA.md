# BRD — Circle Snap Virtual Booth
## 02 · Model Komersial, Kuota & Penagihan

---

## 1. Prinsip: satu mekanisme, dua perilaku

Godaan terbesar di sini adalah membuat dua sistem terpisah — "paket
perorangan" dan "saldo vendor". Jangan.

Semua pembelian mengikuti jalur yang sama:

```
Pesanan  →  Pembayaran lunas  →  Strip masuk DOMPET akun  →  Alokasi ke acara
```

Yang membedakan hanya satu properti paket: **mode alokasi**.

| | `single_event` | `flexible` |
|---|---|---|
| Dipakai oleh | Paket perorangan | Paket vendor |
| Saat lunas | Strip masuk dompet, lalu **langsung dialokasikan otomatis** ke acara yang ditunjuk di pesanan | Strip tinggal di dompet |
| Boleh dipindah antar-acara | Tidak | Ya |
| Sisa setelah acara `ended` | Hangus (`forfeit`) | Kembali ke dompet |
| Boleh dibeli akun `personal` | Ya | Tidak |
| Boleh dibeli akun `vendor` | Ya | Ya |

Efeknya: klien perorangan tetap melihat pengalaman sederhana ("beli 200 strip
untuk resepsi saya"), tapi di belakang layar tidak ada cabang kode khusus.
Kalau nanti ia naik jadi vendor, saldonya tidak perlu dimigrasikan.

---

## 2. Paket

Paket sepenuhnya dikelola admin lewat CMS. Tidak ada harga yang ditulis di
kode.

### 2.1 Field paket

| Field | Tipe | Wajib | Aturan | Catatan |
|---|---|:--:|---|---|
| `id` | uuid | ✔ | | |
| `code` | string(32) | ✔ | unik, huruf besar + strip | mis. `PERSONAL-200` |
| `name` | string(80) | ✔ | | tampil ke klien |
| `tagline` | string(140) | — | | satu baris penjelas |
| `audience` | enum | ✔ | `personal` \| `vendor` \| `both` | menentukan siapa yang melihatnya |
| `allocation_mode` | enum | ✔ | `single_event` \| `flexible` | AB-05 |
| `strips` | int | ✔ | ≥ 1 | jumlah strip yang didapat |
| `min_strips` | int | — | ≥ 1 | untuk paket kustom; vendor bawaan 600 (AB-06) |
| `price_idr` | bigint | ✔ | ≥ 0 | harga total, bukan per strip |
| `active_days` | int | ✔ | 1–90, bawaan 7 | masa aktif acara (AB-09) |
| `max_events` | int | — | null = tak terbatas | jatah acara; `single_event` selalu 1 |
| `max_voice_seconds` | int | ✔ | 0–60, bawaan 15 | 0 = pesan suara mati |
| `allow_custom_frame` | bool | ✔ | bawaan true | klien boleh unggah bingkai sendiri |
| `allow_gallery` | bool | ✔ | bawaan true | galeri Momen |
| `allow_video_card` | bool | ✔ | bawaan true | kartu video pesan suara |
| `max_operators` | int | — | null = tak terbatas | anggota `operator` |
| `template_scope` | enum | ✔ | `all` \| `selected` | akses template |
| `template_ids` | uuid[] | ◐ | wajib bila `selected` | |
| `wallet_valid_months` | int | ✔ | bawaan 12 | masa berlaku saldo (AB-07) |
| `is_topup` | bool | ✔ | bawaan false | paket tambah kuota, tanpa jatah acara baru |
| `sort_order` | int | ✔ | | urutan tampil |
| `status` | enum | ✔ | `draft` \| `published` \| `archived` | |
| `published_at` | timestamptz | — | | |

### 2.2 Aturan paket

**P-01.** Paket `archived` tidak muncul di etalase, tapi pesanan dan acara yang
sudah memakainya tetap berjalan dengan syarat lamanya.

**P-02.** Mengubah paket yang **sudah pernah terjual** hanya boleh oleh Super
Admin, dan tidak mengubah pesanan lama. Setiap pesanan menyimpan **snapshot**
seluruh nilai paket saat dibeli. Ini yang mencegah sengketa "dulu saya beli
masa aktif 14 hari kok sekarang jadi 7".

**P-03.** Paket `is_topup = true` hanya menambah strip. Tidak menambah jatah
acara dan tidak memperpanjang masa aktif. Untuk memperpanjang masa aktif ada
produk terpisah (§6).

**P-04.** Paket dengan `audience = personal` wajib `allocation_mode =
single_event` dan `max_events = 1`. Divalidasi saat simpan, bukan diserahkan ke
kedisiplinan admin.

### 2.3 Contoh isi awal

| Kode | Nama | Audience | Mode | Strip | Masa aktif | Catatan |
|---|---|---|---|---|---|---|
| `TRIAL-10` | Coba Dulu | personal | single_event | 10 | 3 hari | gratis, sekali per akun |
| `PERSONAL-100` | Acara Kecil | personal | single_event | 100 | 7 hari | |
| `PERSONAL-200` | Acara Standar | personal | single_event | 200 | 7 hari | paket andalan |
| `PERSONAL-400` | Acara Besar | personal | single_event | 400 | 14 hari | |
| `VENDOR-600` | Vendor Mula | vendor | flexible | 600 | 7 hari/acara | minimum vendor |
| `VENDOR-1500` | Vendor Aktif | vendor | flexible | 1500 | 14 hari/acara | |
| `VENDOR-4000` | Vendor Besar | vendor | flexible | 4000 | 30 hari/acara | |
| `TOPUP-50` | Tambah 50 Strip | both | flexible | 50 | — | `is_topup` |

> Paket `TRIAL-10` bukan sekadar promosi. Tanpa jalur mencoba tanpa bayar,
> klien harus membayar untuk mengetahui apakah kamera HP tamunya jalan di
> gedung itu — dan itu hambatan pembelian yang paling mahal.

---

## 3. Buku besar kuota

Ini bagian yang paling penting untuk benar sejak awal (AB-03).

### 3.1 Kenapa buku besar, bukan kolom `used`

Kolom `used` akan menyimpang. Selalu. Penyebabnya bermacam-macam: proses
gagal separuh jalan, admin menyesuaikan manual, acara dibatalkan, klaim
dobel saat jaringan putus. Dan ketika klien protes, tidak ada cara
membuktikan apa pun.

Buku besar menyelesaikan itu: **saldo tidak disimpan, saldo dihitung.**
Angka di kolom `cached_balance` hanya untuk kecepatan tampilan, dan boleh
dibangun ulang kapan saja dari jurnal.

### 3.2 Jenis jurnal

| Jenis | Arah | Dari → Ke | Kapan |
|---|---|---|---|
| `purchase` | + | luar → dompet | pesanan lunas |
| `allocation` | ↔ | dompet → acara | klien mengalokasikan |
| `deallocation` | ↔ | acara → dompet | klien menarik kembali (AB-08) |
| `consumption` | − | acara → luar | strip final berhasil dibuat |
| `return_on_end` | ↔ | acara → dompet | acara `ended`, mode `flexible` |
| `forfeit` | − | acara → luar | acara `ended`, mode `single_event` |
| `expiry` | − | dompet → luar | saldo lewat masa berlaku (AB-07) |
| `adjustment` | ± | mana saja | Super Admin, **wajib alasan** |
| `refund_reversal` | − | dompet → luar | pesanan dikembalikan dananya |

### 3.3 Field jurnal

| Field | Tipe | Wajib | Catatan |
|---|---|:--:|---|
| `id` | uuid | ✔ | |
| `account_id` | uuid | ✔ | |
| `event_id` | uuid | — | null berarti pergerakan di dompet |
| `entry_type` | enum | ✔ | daftar di §3.2 |
| `strips` | int | ✔ | positif = masuk, negatif = keluar |
| `balance_after` | int | ✔ | saldo setelah baris ini, untuk pemeriksaan |
| `order_id` | uuid | — | untuk `purchase`, `refund_reversal` |
| `session_id` | uuid | — | untuk `consumption` |
| `actor_user_id` | uuid | — | null = sistem |
| `reason` | text | ◐ | wajib untuk `adjustment` |
| `idempotency_key` | string(64) | — | unik; kunci anti-dobel |
| `created_at` | timestamptz | ✔ | |

**Baris jurnal tidak boleh diubah atau dihapus.** Koreksi dilakukan dengan
menambahkan baris `adjustment` yang berlawanan, bukan mengedit yang lama.

### 3.4 Rumus saldo

```
Saldo dompet  = Σ strips WHERE account_id = ? AND event_id IS NULL
Kuota acara   = Σ strips WHERE event_id = ?
Sisa acara    = Kuota acara  (konsumsi sudah bernilai negatif di dalamnya)
```

Tugas terjadwal harian membandingkan `cached_balance` dengan hasil penjumlahan
jurnal. Selisih apa pun memicu peringatan ke admin — jangan diperbaiki
diam-diam, karena selisih berarti ada jalur kode yang menulis tanpa jurnal.

### 3.5 Klaim kuota saat sesi

Alur ini kritis dan dijelaskan lengkap di dokumen 07 §5. Ringkasnya:

1. Tamu menyelesaikan sesi → perangkat mengirim `POST /api/quota/claim` dengan
   `session_id` sebagai kunci idempoten
2. Server membuka transaksi, mengunci baris acara
3. Cek: acara `live`, belum `expired`, sisa kuota > 0
4. Tulis jurnal `consumption` −1
5. Perbarui `cached_balance`
6. Commit; kembalikan sisa kuota terbaru

Kalau permintaan yang sama datang dua kali (tamu menekan ulang, jaringan
mengulang), kunci idempoten membuat panggilan kedua mengembalikan hasil yang
sama tanpa memotong kuota lagi.

---

## 4. Pesanan & pembayaran

### 4.1 Status pesanan

```
draft → awaiting_payment → paid → fulfilled
                ↓                     ↓
            cancelled             refunded
                ↓
             expired
```

| Status | Arti |
|---|---|
| `draft` | Keranjang, belum dikonfirmasi |
| `awaiting_payment` | Menunggu pembayaran; instruksi sudah dikirim |
| `paid` | Pembayaran terverifikasi |
| `fulfilled` | Jurnal `purchase` sudah ditulis, strip sudah masuk |
| `cancelled` | Dibatalkan sebelum bayar |
| `expired` | Lewat batas waktu bayar (bawaan 48 jam) |
| `refunded` | Dana dikembalikan; jurnal `refund_reversal` ditulis |

`paid` dan `fulfilled` sengaja dipisah. Ada jeda antara "uang masuk" dan
"strip masuk", dan kalau penulisan jurnal gagal, kamu perlu tahu bahwa
pembayaran sudah sah tapi pemenuhan belum jalan.

### 4.2 Field pesanan

| Field | Tipe | Wajib | Catatan |
|---|---|:--:|---|
| `id` | uuid | ✔ | |
| `number` | string(20) | ✔ | unik, `CS-2608-0001`, dipakai di percakapan |
| `account_id` | uuid | ✔ | |
| `created_by_user_id` | uuid | ✔ | |
| `package_id` | uuid | ✔ | |
| `package_snapshot` | jsonb | ✔ | seluruh nilai paket saat dibeli (P-02) |
| `target_event_id` | uuid | ◐ | wajib bila `single_event` |
| `strips` | int | ✔ | dari snapshot |
| `subtotal_idr` | bigint | ✔ | |
| `discount_idr` | bigint | ✔ | bawaan 0 |
| `voucher_code` | string(32) | — | |
| `total_idr` | bigint | ✔ | |
| `status` | enum | ✔ | §4.1 |
| `payment_method` | enum | ✔ | `manual_transfer` \| `qris` \| `va` \| `card` |
| `payment_ref` | string(80) | — | nomor rujukan gateway |
| `proof_asset_id` | uuid | — | bukti transfer manual |
| `paid_at` | timestamptz | — | |
| `verified_by_user_id` | uuid | — | admin yang memverifikasi |
| `expires_at` | timestamptz | ✔ | bawaan +48 jam |
| `notes_internal` | text | — | catatan admin, tidak terlihat klien |

### 4.3 Alur pembayaran

**Rilis 1 — transfer manual + QRIS statis.**
Klien memilih paket, sistem menampilkan nominal unik (total + 3 digit acak)
supaya pencocokan mudah, klien mengunggah bukti, admin memverifikasi di CMS,
lalu strip masuk otomatis.

Nominal unik itu detail kecil yang menghemat banyak waktu: tanpa itu admin
harus mencocokkan mutasi bank dengan nama pengirim yang sering tidak sama
dengan nama akun.

**Rilis 2 — payment gateway.**
Midtrans atau Xendit. Status berpindah otomatis lewat webhook. Webhook wajib
diverifikasi tanda tangannya dan diproses idempoten — gateway mengirim ulang
notifikasi yang sama lebih dari sekali sebagai perilaku normal, bukan
kesalahan.

### 4.4 Voucher

| Field | Tipe | Catatan |
|---|---|---|
| `code` | string(32) | unik, huruf besar |
| `type` | enum | `percent` \| `fixed` \| `bonus_strips` |
| `value` | int | persen, rupiah, atau jumlah strip |
| `applies_to` | enum | `all` \| `package` \| `audience` |
| `package_ids` | uuid[] | bila `applies_to = package` |
| `max_uses` | int | null = tak terbatas |
| `max_uses_per_account` | int | bawaan 1 |
| `min_total_idr` | bigint | bawaan 0 |
| `starts_at` / `ends_at` | timestamptz | |
| `status` | enum | `active` \| `paused` \| `expired` |

Voucher `bonus_strips` menambah strip tanpa mengubah harga — berguna untuk
kompensasi keluhan tanpa harus melakukan `adjustment` manual.

---

## 5. Penagihan & dokumen

| Dokumen | Kapan | Isi |
|---|---|---|
| **Proforma** | Saat `awaiting_payment` | Rincian paket, total, instruksi bayar, batas waktu |
| **Kuitansi** | Saat `fulfilled` | Bukti lunas, nomor pesanan, strip masuk |
| **Faktur pajak** | Atas permintaan | Butuh data NPWP di profil penagihan |

Data penagihan disimpan per akun: nama penagihan, NPWP (opsional), alamat,
email penagihan. Hanya `owner` yang boleh mengubahnya.

---

## 6. Produk tambahan

| Produk | Efek | Harga |
|---|---|---|
| **Top-up strip** | Menambah strip ke dompet | Per paket `is_topup` |
| **Perpanjang masa aktif** | +7 hari untuk satu acara, maksimal 2 kali | Tarif tetap |
| **Perpanjang retensi** | Galeri bertahan +90 hari | Tarif tetap |
| **Unduh arsip lengkap** | Berkas zip seluruh media acara resolusi penuh | Gratis, sekali per acara |

Perpanjang masa aktif dibatasi 2 kali dengan sengaja. Kalau klien butuh lebih,
yang terjadi bukan acara panjang — melainkan salah isi jadwal, dan itu perlu
ditangani admin supaya masalahnya ketahuan.

---

## 7. Kebijakan pembatalan

| Kondisi | Kebijakan |
|---|---|
| Belum bayar | Batal bebas |
| Sudah bayar, acara belum `live`, < 7 hari sejak bayar | Pengembalian penuh dikurangi biaya administrasi |
| Sudah bayar, acara belum `live`, ≥ 7 hari | Diubah jadi saldo dompet, bukan uang kembali |
| Acara sudah `live` | Tidak ada pengembalian; sisa kuota mengikuti AB-08 |
| Gangguan sistem terbukti | Kompensasi strip lewat `adjustment` + alasan tertulis |

Kebijakan ini harus muncul di halaman checkout, bukan hanya di syarat &
ketentuan. Klien yang membaca kebijakan sebelum membayar jarang menuntut
setelahnya.
