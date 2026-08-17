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
| D-08 | Anggota tim & peran `manager`/`operator` | **BATAL (di luar cakupan)** | Model bisnis: akun `personal`/`vendor` tetap satu pengguna (owner), tidak ada tim lapangan sebagai pengguna platform — lihat §7 v1.4 |
| D-09 | Penugasan operator ke acara | **BATAL (di luar cakupan)** | Sama alasan D-08 — lihat §7 v1.4 |
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
| D-20 | Mode Lokasi | **BATAL (di luar cakupan)** | Sama alasan D-08/D-09 — lihat §7 v1.4 |
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

> Butir 25-27 (D-08, D-09, D-20) dibatalkan §7 v1.4 — di luar cakupan model
> bisnis. Numbering asli dipertahankan (bukan diisi ulang) supaya rujukan
> "butir 28" di tempat lain dokumen ini tetap valid.

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
| 17 Agu 2026 | 1.2 | `quota_ledger.session_id` (dok 03 §6.1/§7.1) masih BUKAN foreign key sungguhan ke `sessions`, sejak `sessions` dibuat di Tahap 4. Sebabnya: baris jurnal uji regresi lama sudah punya `session_id` acak yang tidak pernah jadi baris `sessions` (tabelnya belum ada saat baris-baris itu ditulis) — menambah FK sekarang gagal migrasi karena referensi yatim. Perlu dibereskan SEBELUM data produksi sungguhan bertambah banyak, alasan sama persis dengan kenapa buku besar kuota (D-03) tidak ditunda di Tahap 1 (§6): migrasi database makin mahal dan makin berisiko seiring data bertambah. | Pemilik produk |
| 17 Agu 2026 | 1.3 | Gateway pembayaran (dok 02 §4.3 "Rilis 2 — payment gateway") **DICOBA** ditarik maju dari jadwal awal atas permintaan pemilik produk (kredensial sandbox Midtrans sudah disiapkan sendiri), **TAPI DITUNDA** setelah Langkah 2 dari rencana 9-langkah: `MIDTRANS_SERVER_KEY` ditolak Midtrans (`401 Access denied due to unauthorized transaction`), dibuktikan lewat panggilan `curl` langsung ke `https://app.sandbox.midtrans.com/snap/v1/transactions` dengan Basic Auth yang benar — bukan bug kode, kredensialnya sendiri belum tervalidasi di sisi Midtrans (dugaan: key sandbox vs produksi tertukar, atau belum aktif). Pemilik produk memutuskan menunda sampai kredensial diurus sendiri, bukan melanjutkan di atas kredensial yang belum terbukti jalan. **Alur transfer manual (dok 02 §4.3 "Rilis 1") TETAP satu-satunya jalur aktif** — `paymentMethod` masih hardcode `"manual_transfer"` di kedua titik pembuatan order (`app/api/app/events/route.ts`, `app/api/app/orders/route.ts`), TIDAK sempat diubah (baru Langkah 5 dari rencana). Sisa percobaan disimpan sebagai draft TIDAK AKTIF (tidak dipanggil kode manapun yang berjalan): nilai enum `payment_method` bertambah `"midtrans"` (migrasi `lib/db/migrations/0014_fancy_lucky_pierre.sql`, SUDAH dijalankan — additive, aman dibiarkan walau belum dipakai), `lib/services/midtrans.ts` (klien Snap + verifikasi signature + pemetaan status — bagian signature/pemetaan status LULUS uji murni, bagian panggilan sandbox sungguhan GAGAL karena kredensial), `scripts/test-midtrans-integration.ts` (skrip regresi — bagian kredensial akan GAGAL sampai kredensial diperbaiki, ini DIHARAPKAN bukan regresi). **Titik berhenti kalau dilanjutkan nanti**: tepat SEBELUM Langkah 3 (`approveOrder()`/`rejectOrder()` belum diperkeras untuk idempotensi webhook — celah dobel-insert `quota_ledger` kalau dipanggil ulang pada order `fulfilled` masih ADA, belum ditutup); Langkah 4-9 (rute token Snap, UI pembayaran, webhook, panel staf, verifikasi akhir) semua belum dikerjakan. Langkah pertama saat resume: validasi ulang kredensial lewat `scripts/test-midtrans-integration.ts` bagian (a) sampai lulus. | Pemilik produk |
| 17 Agu 2026 | 1.4 | D-08 (anggota tim & peran `manager`/`operator`), D-09 (penugasan operator ke acara), dan D-20 (Mode Lokasi) — dok 09 §2 (prioritas "Sedang") dan §5 Tahap 5 (butir 25-27) — **DIBATALKAN sebagai keputusan cakupan model bisnis, bukan sekadar "belum giliran Tahap 5"**. Alasan pemilik produk: baik akun `personal` maupun `vendor` di model bisnis ini tetap satu pengguna (owner) — tidak ada tim lapangan yang jadi pengguna platform sungguhan, jadi fitur mengundang anggota tim & menugaskan operator per acara tidak berlaku. Dampak kode: `account_members`/`AccountRole` (owner/manager/operator) dan `requireAccountRole()` yang sudah dibangun di Tahap 3 **TETAP DIPERTAHANKAN** (dipakai gerbang izin internal yang sudah berjalan & teruji `scripts/test-account-migration.ts`) — yang dibatalkan cuma UI/alur mengundang anggota baru dan penugasan operator per acara (D-08/D-09), bukan mekanisme perannya sendiri. §2 (baris D-08/D-09/D-20, kolom Prioritas jadi "BATAL (di luar cakupan)") dan §5 (butir 25-27 Tahap 5 dicabut, digantikan catatan rujukan ke entri ini) diperbarui konsisten pada tanggal yang sama — bukan penyimpangan diam-diam yang baru ketahuan belakangan. | Pemilik produk |
