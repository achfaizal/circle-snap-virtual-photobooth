# BRD — Circle Snap Virtual Booth
## 09 · Delta dari Implementasi Sekarang

**Baca dokumen ini sebelum menyentuh kode.**

Produk sudah setengah jalan. Sebagian sudah sesuai BRD, sebagian bertentangan.
Yang bertentangan berbahaya justru karena kelihatan jalan — bug-nya baru
muncul saat ada klien kedua atau saat ada sengketa kuota.

Sumber pembanding: `ALUR-PLAYGROUND.md` dan tiga tangkapan layar yang ada.

---

## 1. Pertentangan aturan bisnis

### D-01 · "Acara Sendiri = 1 acara seumur akun" — **BATAL**

| | |
|---|---|
| Sekarang | Klien perorangan hanya boleh punya satu acara selamanya |
| BRD | Perorangan boleh membeli paket lagi untuk acara berikutnya |
| Kenapa berubah | Klien yang puas di lamaran akan memakai lagi untuk resepsi. Mengunci satu acara membuang pendapatan berulang yang paling murah didapat |
| Dampak kode | Cabut validasi "sudah punya acara". Batas jatah acara pindah ke `packages.max_events` per pembelian, bukan per akun |
| Prioritas | **Tinggi** |

### D-02 · Paket dipilih di dalam wizard buat acara — **DIPINDAH**

| | |
|---|---|
| Sekarang | Langkah 2 wizard menanyakan paket |
| BRD | Wizard langkah 3 menanyakan **kuota**. Perorangan memilih paket di sana; vendor mengalokasikan dari dompet |
| Kenapa berubah | Vendor tidak membeli paket per acara. Ia sudah punya saldo dan hanya membaginya |
| Dampak kode | Langkah 3 wizard bercabang menurut `accounts.type` |
| Prioritas | **Tinggi** |

### D-03 · Kuota sebagai penghitung — **GANTI KE BUKU BESAR**

| | |
|---|---|
| Sekarang | Kuota terpakai disimpan sebagai angka; klaim memakai `mutateOne` |
| BRD | Buku besar `quota_ledger` yang hanya bisa ditambah; saldo dihitung dari jurnal (AB-03) |
| Kenapa berubah | Saat klien protes "kuota saya habis padahal tamu 80", angka tunggal tidak bisa membuktikan apa pun. Ini juga prasyarat dompet vendor |
| Dampak kode | Tabel baru, penulisan ulang jalur klaim, migrasi data yang ada jadi jurnal `adjustment` awal |
| Prioritas | **Tinggi — kerjakan sebelum klien berbayar bertambah** |

### D-04 · Tidak ada dompet strip — **BARU**

| | |
|---|---|
| Sekarang | Kuota melekat langsung ke acara |
| BRD | Strip masuk dompet akun, lalu dialokasikan ke acara |
| Dampak kode | `accounts.cached_wallet_balance`, layar alokasi, jurnal `allocation`/`deallocation` |
| Prioritas | **Tinggi** — ini inti perbedaan vendor vs perorangan |

### D-05 · Penyimpanan berbasis berkas JSON — **PINDAH KE DATABASE**

| | |
|---|---|
| Sekarang | `data/assets.json`, `data/frames.json`, `PLAYGROUND_TEMPLATES` di kode |
| BRD | Tabel database sesuai dokumen 03 |
| Kenapa berubah | Menambah template lewat berkas kode berarti setiap template baru butuh deploy. Admin tidak bisa bekerja. Klien juga tidak bisa mengunggah bingkai sendiri |
| Dampak kode | Migrasi skema + skrip pemindahan data + CMS pengganti |
| Prioritas | **Tinggi** — memblokir seluruh Portal Admin |

---

## 2. Yang belum ada sama sekali

| # | Hal | Prioritas | Catatan |
|---|---|---|---|
| D-06 | Portal Admin / CMS | Tinggi | Seluruh dokumen 04 |
| D-07 | Jenis akun `personal` / `vendor` di data | Tinggi | Sekarang hanya pilihan saat daftar, belum berdampak |
| D-08 | Anggota tim & peran `manager`/`operator` | Sedang | Vendor akan berbagi kata sandi owner tanpa ini |
| D-09 | Penugasan operator ke acara | Sedang | |
| D-10 | Unggah bingkai oleh klien | **Tinggi** | Diminta eksplisit; butuh validator dok 06 §5 |
| D-11 | Validasi bingkai otomatis | Tinggi | Tanpa ini unggahan klien bisa merusak acara |
| D-12 | `template_variables` sebagai data | Tinggi | Sekarang variabel tetap; builder tidak bisa menyesuaikan template |
| D-13 | `template_snapshot` saat publikasi | Tinggi | Tanpa ini perbaikan template merusak acara live |
| D-14 | Jejak audit | Sedang | |
| D-15 | Pemberitahuan (email/WA) | Sedang | Minimal `quota.low` dan `quota.empty` |
| D-16 | Retensi & penghapusan media | Sedang | Kewajiban privasi |
| D-17 | Pembersihan EXIF | **Tinggi** | Murah dikerjakan, risikonya nyata |
| D-18 | Galeri privat secara bawaan | **Tinggi** | Periksa nilai bawaan sekarang |
| D-19 | Tombol tamu hapus fotonya sendiri | Sedang | |
| D-20 | Mode Lokasi | Sedang | Layar terpisah, bukan responsif |
| D-21 | QR versi PDF siap cetak | Rendah | Berdampak besar pada keberhasilan pindai |
| D-22 | Voucher | Rendah | |
| D-23 | 2FA staf platform | Sedang | Wajib sebelum ada staf selain kamu |

---

## 3. Yang sudah benar — pertahankan

Ini keputusan yang sudah tepat dan tidak boleh diubah tanpa alasan kuat:

| Hal | Kenapa dipertahankan |
|---|---|
| Empat fase booth tetap untuk semua template | Menjaga alur bisa diprediksi & diuji |
| Bingkai tanpa teks tercetak | AB-18; pelajaran mahal dari `ENG*.png` |
| Layer teks bertoken | Satu bingkai melayani semua acara |
| `filterCss` satu string untuk pratinjau & compositing | Mencegah "hasil beda dengan layar" |
| Kuota diputuskan server | AB-02 |
| Compositing di perangkat tamu | Biaya marginal mendekati nol |
| `ended` ≠ `expired` | AB-11 |
| Masa aktif dihitung dari jadwal mulai | AB-09 |
| Checklist pra-publikasi | Sudah ada; tinggal ditambah gerbang |
| Slot terdeteksi otomatis dari area alpha | Koordinat tidak bisa desync dari gambar |
| Klien mengubah isi, bukan desain | AB-15 |

---

## 4. Perubahan kecil yang perlu

| # | Perubahan | Dari | Ke |
|---|---|---|---|
| D-24 | Gerbang publikasi | 5 poin | 11 poin (dok 05 §5.5) |
| D-25 | Rute admin klien | `/admin/*` | `/app/*` — `/admin` untuk staf platform |
| D-26 | Pembayaran | Transfer manual tanpa alur | Pesanan + nominal unik + unggah bukti + verifikasi |
| D-27 | Peringatan jadwal mulai | Teks biasa | Peringatan menetap yang tidak bisa dilewatkan |
| D-28 | Momen | Galeri dasar | Moderasi satu klik + unduh massal + status unggah |
| D-29 | Nomor strip | Belum ada | `receipt_no` unik per acara |
| D-30 | Simpan foto mentah per slot | Hanya strip final | Simpan juga mentahnya untuk susun ulang |

D-25 perlu ditegaskan: sekarang portal klien ada di `/admin/register`, dan itu
akan bertabrakan begitu CMS staf dibangun. Pindahkan lebih awal — makin lama
makin mahal karena tautan sudah tersebar.

---

## 5. Urutan pengerjaan yang disarankan

Diurutkan menurut ketergantungan, bukan menurut yang paling menarik dikerjakan.

### Tahap 1 — Fondasi data (memblokir semuanya)

1. Skema database sesuai dokumen 03
2. Pindahkan template & bingkai dari JSON/kode ke tabel (D-05)
3. `accounts` + `account_members` + jenis akun (D-07)
4. Buku besar kuota + dompet (D-03, D-04)
5. Migrasi data yang ada, verifikasi saldo cocok

> Jangan lanjut sebelum uji serentak klaim kuota lulus: 50 permintaan
> bersamaan saat sisa 1 harus menghasilkan tepat 1 sukses.

### Tahap 2 — Portal Admin minimum

6. Kategori acara
7. Template: CRUD + variabel + bingkai + penerbitan
8. Bingkai sistem + validator (D-11)
9. Paket
10. Pesanan & verifikasi pembayaran (D-26)

### Tahap 3 — Portal Klien sesuai BRD

11. Rute pindah ke `/app` (D-25)
12. Wizard 3 langkah dengan cabang kuota (D-02)
13. Cabut kunci satu acara (D-01)
14. Alokasi dompet → acara
15. Visual Builder membaca `template_variables` (D-12)
16. Unggah bingkai klien (D-10)
17. Gerbang publikasi 11 poin (D-24)
18. `template_snapshot` saat publikasi (D-13)

### Tahap 4 — Operasional & kepercayaan

19. Pembersihan EXIF (D-17)
20. Galeri privat bawaan (D-18)
21. Momen: moderasi + unduh massal (D-28)
22. Pemberitahuan kuota (D-15)
23. Jejak audit (D-14)
24. Retensi & penghapusan (D-16)

### Tahap 5 — Tim & lapangan

25. Anggota tim & peran (D-08)
26. Penugasan operator (D-09)
27. Mode Lokasi (D-20)
28. QR PDF siap cetak (D-21)

---

## 6. Empat hal yang jangan ditunda

Kalau waktu terbatas, empat ini yang paling mahal kalau dikerjakan belakangan:

**Buku besar kuota (D-03).** Migrasi dari penghitung ke jurnal makin sulit
seiring bertambahnya data transaksi. Kerjakan saat data masih sedikit.

**Multi-akun & jenis akun (D-07).** Menyisipkan `account_id` ke seluruh kueri
setelah aplikasi jadi adalah salah satu refactor termahal yang ada, dan setiap
kueri yang terlewat adalah kebocoran data antar-klien.

**Snapshot template (D-13).** Tanpa ini, satu perbaikan kecil di template bisa
mengubah tampilan acara yang sedang berjalan malam itu juga. Bug seperti ini
tidak bisa dibatalkan — stripnya sudah tercetak di HP tamu.

**Pembersihan EXIF & galeri privat bawaan (D-17, D-18).** Murah dikerjakan
sekarang. Kalau ditunda dan terjadi kebocoran lokasi rumah tamu atau galeri
acara anak terbuka, kerusakan reputasinya tidak sebanding dengan usaha yang
dihemat.

---

## 7. Catatan revisi BRD

Setiap kali BRD diubah, catat di sini.

| Tanggal | Versi | Perubahan | Oleh |
|---|---|---|---|
| 14 Agu 2026 | 1.0 | Dokumen awal | — |
| 14 Agu 2026 | 1.1 | Tambah `frames.blurb` (text, opsional) — di luar dok 03 §3.5. Ditemukan saat migrasi Langkah 5 Tahap 1: `Frame.blurb` lama dipakai nyata di `components/StepFrame.tsx` untuk tamu saat memilih bingkai, tapi tabel `frames` versi BRD tidak punya kolom penjelas apa pun. Menghapusnya berarti kehilangan teks yang sedang dipakai tamu sungguhan, bukan sekadar metadata usang — jadi ditambah sebagai kolom di luar skema resmi, bukan didiamkan. | Pemilik produk |
