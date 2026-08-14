# BRD — Circle Snap Virtual Booth
## 04 · Portal Admin (CMS)

Basis URL: `/admin`. Hanya untuk `platform_role` ≠ null. Wajib 2FA untuk
`super_admin` dan `admin`.

---

## 1. Peta modul

| # | Modul | Rute | Peran |
|---|---|---|---|
| 1 | Dasbor Operasional | `/admin` | semua staf |
| 2 | Kategori Acara | `/admin/categories` | admin+ |
| 3 | Template Playground | `/admin/templates` | admin+ |
| 4 | Bingkai Sistem | `/admin/frames` | admin+ |
| 5 | Aset | `/admin/assets` | admin+ |
| 6 | Paket | `/admin/packages` | admin+ |
| 7 | Voucher | `/admin/vouchers` | admin+ |
| 8 | Pesanan & Pembayaran | `/admin/orders` | semua staf |
| 9 | Akun Klien | `/admin/accounts` | semua staf |
| 10 | Pengawasan Acara | `/admin/events` | semua staf |
| 11 | Kuota & Penyesuaian | `/admin/quota` | super_admin |
| 12 | Pengguna Platform | `/admin/staff` | super_admin |
| 13 | Jejak Audit | `/admin/audit` | super_admin |
| 14 | Pengaturan Sistem | `/admin/settings` | super_admin |

---

## 2. Dasbor Operasional

Bukan halaman grafik. Ini daftar kerja — apa yang butuh ditangani **hari ini**.

**Baris atas — yang menunggu tindakan:**

| Kartu | Isi | Aksi |
|---|---|---|
| Pembayaran menunggu verifikasi | jumlah + nominal | ke daftar tersaring |
| Acara live sekarang | jumlah | ke pengawasan |
| Kuota kritis | acara dengan sisa ≤ 10% | ke acara |
| Bingkai gagal validasi | unggahan klien yang ditolak | ke bingkai |
| Selisih jurnal kuota | jumlah akun bermasalah | ke penyesuaian |

**Baris bawah — ringkasan 7 hari:** akun baru, pesanan lunas, strip terpakai,
acara dipublikasikan. Angka saja, tanpa grafik. Grafik masuk setelah ada
pertanyaan yang benar-benar butuh grafik.

Kartu "selisih jurnal kuota" penting: kalau angkanya bukan nol, ada jalur kode
yang mengubah kuota tanpa menulis jurnal, dan itu harus ketahuan hari itu juga.

---

## 3. Kategori Acara

**Daftar:** nama, kode, jumlah template, jumlah acara, urutan, status.

**Form:**

| Field | Kontrol | Validasi |
|---|---|---|
| `code` | teks | unik, huruf kecil, terkunci setelah dipakai |
| `name` | teks | 2–60 |
| `description` | teks | ≤ 140 |
| `icon` | pemilih emoji/ikon | |
| `default_greeting` | area teks | ≤ 500 |
| `default_brand_label` | teks | ≤ 40, huruf besar |
| `sort_order` | angka | |
| `status` | sakelar | |

**Aksi:** buat, ubah, ubah urutan (seret), arsipkan.
**Larangan:** menghapus kategori yang punya template atau acara. Tombol Hapus
diganti Arsipkan, dengan penjelasan singkat kenapa.

---

## 4. Template Playground

Modul terpenting di CMS. Ini yang menentukan kualitas seluruh produk.

### 4.1 Daftar

Tampilan kisi dengan sampul, nama, kategori, jumlah bingkai, `usage_count`,
versi, status. Saring berdasarkan kategori dan status.

### 4.2 Editor — enam tab

**Tab 1 · Identitas**

| Field | Kontrol | Catatan |
|---|---|---|
| `code` | teks | unik, terkunci setelah terbit |
| `name`, `tagline`, `description` | teks | |
| `categories` | multi-pilih + tandai utama | minimal 1 |
| `brand_label` | teks | teks tetap di layar sambutan |
| `folder` | teks | divalidasi keberadaannya |
| `cover_asset_id` | unggah | wajib sebelum terbit |
| `preview_asset_ids` | unggah banyak | |

**Tab 2 · Tema**

Sembilan token warna wajib terisi, masing-masing dengan pemilih warna dan
pratinjau langsung berdampingan. Font display dari katalog terdaftar.

> Menambah font baru butuh **tiga langkah sinkron** di kode: impor
> `next/font`, variabel `--canvas-font-*`, dan entri katalog. CMS hanya
> memilih dari yang sudah terdaftar — jangan biarkan admin mengetik nama font
> bebas, karena hasilnya font gagal muat di kanvas dan teks jatuh ke serif
> bawaan tanpa peringatan.

Efek latar: sakelar `petals` (+ jumlah), `blobs`, `confetti`, `bokeh`,
`sparkle`. Elemen: bentuk tombol, monogram, foto hero.

**Tab 3 · Kartu Video**

`bg`, `ink`, `smoke`, `waveActive`, `waveTrack`, `headingGradient[3]`, latar
opsional. Pratinjau kartu video statis di samping.

**Tab 4 · Variabel**

Tabel yang bisa diurut seret. Tiap baris: `key`, label, tipe input, wajib/
tidak, nilai contoh, nilai bawaan, dipakai di mana, teks bantuan.

Peringatan otomatis: kalau ada token di layer teks bingkai yang **tidak**
punya variabel padanan, tampilkan daftarnya. Ini menangkap `{{venue}}` yang
dipakai di bingkai tapi lupa didefinisikan.

**Tab 5 · Bingkai**

Pilih dari bingkai sistem, atur urutan dengan seret. Minimal 1, disarankan 3
(varian 1/2/3 foto). Tiap bingkai menampilkan ringkasan validasi.

**Tab 6 · Sesi & Contoh**

`default_session_config` (lihat dok 03 §5.3) dan `sample_data` untuk pratinjau
etalase.

### 4.3 Pratinjau

Tombol **Pratinjau sebagai tamu** membuka booth sungguhan dengan `sample_data`
di jendela baru, tanpa membuat acara dan tanpa memotong kuota. Ini satu-satunya
cara memastikan template benar — pemeriksaan tipe tidak menangkap teks yang
menabrak foto.

### 4.4 Penerbitan & versi

Gerbang sebelum `published`:

1. Minimal 1 kategori
2. Sampul terisi
3. Sembilan token warna terisi
4. Font terdaftar
5. Minimal 1 bingkai
6. Semua token di bingkai punya variabel padanan
7. `sample_data` lengkap untuk semua variabel wajib
8. Pratinjau tamu sudah dijalankan minimal sekali

Mengubah template terbit menaikkan `version`. **Acara yang sudah `live` tidak
terpengaruh** karena memakai `template_snapshot` (AB-14). Acara `draft` yang
memakai template itu mendapat pemberitahuan bahwa template diperbarui, dengan
pilihan menyegarkan.

### 4.5 Duplikat

Tombol Duplikat membuat salinan `draft` dengan `code` bersufiks. Ini jalur
utama membuat template baru — jarang ada yang mulai dari nol.

---

## 5. Bingkai Sistem

### 5.1 Daftar

Kisi pratinjau dengan latar arsir diagonal supaya lubang transparan terlihat
jelas. Info: nama, ukuran, jumlah slot, status validasi, dipakai template apa.

### 5.2 Unggah

| Field | Kontrol | Validasi |
|---|---|---|
| `name` | teks | 2–80 |
| berkas PNG | unggah | RGBA, ≤ 8 MB, ≥ 600 px sisi terpendek |
| `paper` | pemilih warna | |
| `print_size` | teks | opsional |

Setelah unggah, sistem menjalankan **deteksi slot otomatis** dari area alpha
dan menampilkan hasilnya di atas gambar untuk dikonfirmasi. Admin boleh
menyesuaikan koordinat secara manual.

Detail lengkap validasi ada di dokumen 06 §5.

### 5.3 Editor layer teks

Editor visual: klik posisi di kanvas, atur token, ukuran, warna, perataan,
jarak huruf, lebar maksimum. `locked: true` supaya klien tidak bisa
menggesernya (AB-15).

Peringatan wajib muncul kalau: layer teks bertumpang tindih dengan slot, atau
teks contoh terpanjang melewati tepi kertas.

### 5.4 Larangan

Bingkai yang dipakai template `published` tidak boleh dihapus, hanya
diarsipkan. Menghapusnya berarti template kehilangan bingkai dan acara klien
buntu.

---

## 6. Paket

### 6.1 Daftar

Nama, audience, mode alokasi, strip, harga, masa aktif, jumlah terjual, status.

### 6.2 Form

Seluruh field ada di dokumen 02 §2.1. Validasi yang wajib ditegakkan di form:

- `audience = personal` memaksa `allocation_mode = single_event` dan
  `max_events = 1` (P-04)
- `is_topup = true` mengunci `max_events` dan `active_days`
- `template_scope = selected` mewajibkan minimal 1 template
- `min_strips` tidak boleh melebihi `strips`

### 6.3 Aturan pengubahan

Paket yang `sold_count > 0` hanya bisa diubah `super_admin`, dan formnya
menampilkan peringatan bahwa perubahan **tidak** memengaruhi pesanan lama
(P-02). Untuk mengubah harga secara nyata, jalur yang benar adalah
mengarsipkan paket lama dan menerbitkan yang baru.

---

## 7. Pesanan & Pembayaran

### 7.1 Daftar

Kolom: nomor, akun, paket, strip, total, metode, status, umur. Saring: status,
metode, rentang tanggal. Tab bawaan: **Menunggu Verifikasi**.

### 7.2 Layar verifikasi

Satu layar, tiga bagian:

- **Kiri** — bukti transfer ukuran penuh, bisa diperbesar
- **Tengah** — rincian pesanan, nominal unik, riwayat status
- **Kanan** — profil akun, riwayat pesanan sebelumnya, catatan internal

Dua tombol: **Setujui & masukkan strip**, **Tolak** (wajib alasan).

Menyetujui menjalankan satu transaksi: `status = paid`, tulis jurnal
`purchase`, kalau `single_event` langsung tulis `allocation` ke acara tujuan,
`status = fulfilled`, kirim pemberitahuan. Kalau salah satu gagal, semuanya
dibatalkan dan pesanan tetap `paid` dengan tanda pemenuhan tertunda.

### 7.3 Aksi lain

Perpanjang batas bayar, batalkan, kembalikan dana (super_admin), unduh
kuitansi, kirim ulang instruksi lewat WhatsApp.

---

## 8. Akun Klien

### 8.1 Daftar

Nama, jenis, kota, anggota, saldo dompet, jumlah acara, status, terakhir aktif.

### 8.2 Detail — lima tab

**Ringkasan** — profil, penagihan, saldo dompet, masa berlaku, jumlah acara.

**Anggota** — daftar `account_members` dengan peran dan status. Admin boleh
menonaktifkan anggota tapi tidak boleh mengubah peran (itu wewenang owner).

**Acara** — semua acara akun, status, kuota, tautan cepat.

**Pesanan** — riwayat pembelian.

**Kuota** — jurnal lengkap, bisa diekspor CSV. Ini yang dibuka saat klien
protes soal kuota.

### 8.3 Aksi

| Aksi | Peran | Catatan |
|---|---|---|
| Ubah jenis akun | admin+ | `personal → vendor` boleh; sebaliknya butuh saldo dompet nol |
| Tangguhkan | admin+ | wajib alasan; acara live tetap jalan (dok 01 §6) |
| Hapus akun | super_admin | butuh konfirmasi ketik nama akun |
| Masuk sebagai | super_admin, admin | wajib alasan, batas 30 menit, tercatat |
| Beri strip kompensasi | super_admin | jurnal `adjustment` |

Sesi impersonasi wajib menampilkan bilah merah menetap di seluruh layar:
*"Kamu sedang masuk sebagai [nama]. Sisa 24 menit. Keluar."*

---

## 9. Pengawasan Acara

### 9.1 Daftar

Saring cepat: **Live sekarang**, **Mulai hari ini**, **Kuota kritis**, **Akan
kedaluwarsa**, **Ditangguhkan**.

Kolom: nama acara, akun, kategori, status, jadwal mulai, kadaluarsa, kuota
(pita hitungan), strip terpakai.

### 9.2 Detail

Ringkasan acara, konfigurasi, daftar bingkai aktif, jurnal kuota acara,
statistik sesi (dimulai, selesai, ditinggalkan, ditolak).

Angka **sesi ditinggalkan** adalah metrik kesehatan produk yang paling jujur.
Kalau tinggi di satu acara, biasanya masalah jaringan atau izin kamera —
bukan kurang fitur.

### 9.3 Aksi

| Aksi | Peran | Catatan |
|---|---|---|
| Perpanjang masa aktif | admin+ | +7 hari, maks 2 kali, wajib alasan |
| Tangguhkan | admin+ | tamu melihat pesan netral |
| Buka galeri klien | admin+ / support | hanya lewat tiket aktif, tercatat |
| Hapus media | admin+ | wajib alasan; menghapus tidak mengembalikan kuota (AB-04) |
| Kirim ulang QR & link | semua staf | |

---

## 10. Kuota & Penyesuaian

Hanya `super_admin`.

**Pencari selisih:** tabel akun yang `cached_balance` ≠ hasil penjumlahan
jurnal. Idealnya kosong. Tombol *Bangun ulang cache* memperbaiki angka tapi
**tidak** menghapus catatan selisih — selisih itu bukti ada bug yang perlu
dicari.

**Form penyesuaian:**

| Field | Validasi |
|---|---|
| Akun | wajib |
| Acara | opsional; kosong = dompet |
| Jumlah strip | bilangan bulat ≠ 0, boleh negatif |
| Alasan | wajib, ≥ 20 karakter |
| Rujukan tiket | opsional |

Pratinjau wajib menampilkan saldo sebelum dan sesudah sebelum tombol
konfirmasi menyala.

---

## 11. Pengguna Platform

Hanya `super_admin`. CRUD staf, atur `platform_role`, paksa reset 2FA, akhiri
sesi, nonaktifkan.

Aturan: harus selalu ada minimal dua `super_admin` aktif. Menurunkan yang
terakhir ditolak — ini mencegah situasi tidak ada yang bisa masuk.

---

## 12. Jejak Audit

Tabel hanya-baca. Saring: pelaku, tindakan, jenis entitas, rentang tanggal,
akun. Setiap baris bisa dibuka untuk melihat perbandingan `before` / `after`
berdampingan. Ekspor CSV.

Retensi 24 bulan.

---

## 13. Pengaturan Sistem

Daftar `system_settings` (dok 03 §8.4) dengan kontrol bertipe, nilai bawaan
terlihat, dan riwayat perubahan. Setiap perubahan masuk jejak audit.

Bagian terpisah untuk: nomor WhatsApp dukungan, teks kebijakan pembatalan,
teks syarat & ketentuan, dan templat pesan pemberitahuan.

---

## 14. Gaya antarmuka admin

Arah visual lengkap ada di `ADMIN-DESIGN-BRIEF.md`. Ringkasan yang mengikat:

- Permukaan terang ("meja cahaya"), bukan gelap seperti booth tamu
- Tanpa sidebar — rel atas dengan empat tujuan
- Tanpa bayangan melayang; elevasi lewat beda warna permukaan dan garis rambut
- Radius maksimal 2 px
- Angka memakai `tabular-nums` supaya tidak bergoyang saat diperbarui
- Kuota selalu digambarkan sebagai **pita hitungan**, bukan progress bar atau
  diagram donat
- Hanya data hidup yang boleh beranimasi
