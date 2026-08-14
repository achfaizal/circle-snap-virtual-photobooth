# BRD — Circle Snap Virtual Booth
## 00 · Ringkasan, Glosarium & Aturan Bisnis Inti

| | |
|---|---|
| **Produk** | Circle Snap Virtual Booth |
| **Pemilik** | Vlass Studio |
| **Versi dokumen** | 1.0 |
| **Tanggal** | 14 Agustus 2026 |
| **Status** | Baseline — dokumen ini yang menang kalau bertentangan dengan kode |

---

## 1. Kenapa dokumen ini ada

Produk sudah setengah jalan tapi belum punya patokan tertulis. Akibatnya
keputusan diambil saat coding, dan sebagian saling bertentangan — contoh
paling nyata: `ALUR-PLAYGROUND.md` mengunci *"Acara Sendiri = 1 acara seumur
akun"*, sementara arah bisnis sekarang justru klien perorangan boleh membeli
event berikutnya.

Mulai sekarang aturannya satu arah:

> **BRD adalah patokan. Kode menyesuaikan BRD, bukan sebaliknya.**
> Kalau saat coding ternyata ada aturan BRD yang tidak masuk akal, ubah
> BRD-nya lebih dulu lewat catatan revisi — jangan diam-diam menyimpang.

Daftar pertentangan antara BRD ini dan implementasi sekarang ada lengkap di
dokumen **09 · Delta**. Baca itu sebelum menyentuh kode.

---

## 2. Peta dokumen

| Dok | Isi | Untuk |
|---|---|---|
| **00** | Ringkasan, glosarium, aturan bisnis inti *(dokumen ini)* | Semua |
| **01** | Aktor, peran, matriks hak akses | PM, BE |
| **02** | Model komersial: paket, dompet strip, buku besar kuota, order | PM, BE, Finance |
| **03** | Model data: ERD + seluruh tabel & field | BE, DBA |
| **04** | Portal Admin (CMS) — modul & CRUD | BE, FE, Admin |
| **05** | Portal Klien — perjalanan, wizard, pengaturan akun | PM, FE |
| **06** | Template, bingkai, Visual Builder | FE, Desainer |
| **07** | Pengalaman tamu & klaim kuota | FE, BE |
| **08** | Non-fungsional: keamanan, privasi, retensi, performa | BE, DevOps |
| **09** | Delta dari implementasi sekarang | Semua — **baca duluan** |

---

## 3. Ringkasan bisnis dalam satu halaman

Circle Snap Virtual Booth menjual **strip** — satu strip adalah satu hasil
cetak digital yang dibawa pulang tamu. Klien membeli sejumlah strip, memasang
QR di lokasi acara, dan tamu berfoto lewat browser tanpa memasang aplikasi.

Ada dua jenis pembeli, dan perbedaannya bukan sekadar harga:

**Klien Perorangan (Acara Sendiri).** Punya satu hajat. Membeli paket yang
terikat ke satu acara — misalnya 200 strip untuk resepsi pernikahannya.
Setelah acara selesai, ia boleh membeli paket lagi untuk acara berikutnya
(lamaran adik, ulang tahun anak). Setiap pembelian melahirkan satu acara.

**Klien Vendor/EO.** Punya banyak klien. Membeli saldo strip dalam jumlah besar
(minimal 600) yang masuk ke **dompet akun**, lalu membagikannya sendiri ke
beberapa acara sesuai kebutuhan — 200 ke acara A, 150 ke acara B, sisanya
disimpan. Saldo yang belum terpakai bisa ditarik kembali dari acara yang batal.

Satu mekanisme melayani keduanya: setiap pembelian masuk ke dompet, dan yang
membedakan hanya **mode alokasi** paketnya (`single_event` vs `flexible`). Ini
disengaja — dua sistem terpisah untuk hal yang sama adalah sumber bug abadi.

**Admin** menyiapkan bahan bakunya: kategori acara, template playground beserta
bingkai bawaannya, paket harga, dan pengawasan operasional.

---

## 4. Glosarium

Istilah di bawah dipakai konsisten di seluruh dokumen, kode, dan antarmuka.
Kalau di kode namanya berbeda, kode yang salah.

| Istilah | Definisi | Bukan |
|---|---|---|
| **Strip** | Satu hasil cetak digital final yang dibawa pulang tamu. Unit yang dijual. | Bukan satu jepretan. Strip 4 foto tetap 1 strip. |
| **Sesi** | Satu kali pemakaian booth oleh satu tamu, dari buka link sampai hasil jadi. | — |
| **Dompet Strip** | Saldo strip milik akun yang belum dialokasikan ke acara. | Bukan uang. |
| **Alokasi** | Pemindahan strip dari dompet ke satu acara. | — |
| **Kuota Acara** | Jumlah strip yang dialokasikan ke satu acara. | — |
| **Konsumsi** | Pengurangan kuota acara karena satu strip berhasil dibuat. | — |
| **Template Playground** | Paket pengalaman booth buatan admin: kanvas, tema, bingkai bawaan, definisi variabel. | Bukan bingkai. Template memuat banyak bingkai. |
| **Bingkai** | Satu berkas PNG transparan + definisi slot + layer teks. | — |
| **Slot** | Kotak tempat satu foto jatuh di dalam bingkai. | — |
| **Layer Teks** | Teks bertoken yang digambar saat compositing, bukan dicetak ke PNG. | — |
| **Acara / Event** | Instans milik klien, hasil dari memilih template lalu menyesuaikan isinya. | — |
| **Visual Builder** | Alat klien untuk mengubah **isi** acara. | Bukan alat desain. Klien tidak memindahkan elemen. |
| **Momen** | Galeri hasil foto tamu untuk satu acara. | — |
| **Akun** | Wadah penagihan & kepemilikan. Perorangan = 1 pengguna. Vendor = banyak pengguna. | Bukan sinonim "pengguna". |
| **Operator** | Anggota tim vendor yang bertugas di lokasi. Akses terbatas. | — |

---

## 5. Aturan bisnis inti

Ini aturan yang mengikat seluruh sistem. Penomoran `AB-xx` dipakai sebagai
rujukan di dokumen lain dan di komentar kode.

### Kuota & komersial

**AB-01 — Satu sesi selesai = satu strip = satu kuota.**
Tamu boleh mengulang jepretan berkali-kali dalam satu sesi tanpa memotong
kuota tambahan. Kuota berkurang saat strip final berhasil disusun, bukan saat
tombol jepret ditekan.

**AB-02 — Kuota diputuskan server, tidak pernah oleh perangkat tamu.**
Klaim kuota bersifat atomik. Dua tamu yang menekan bersamaan saat sisa kuota 1
tidak boleh lolos berdua.

**AB-03 — Kuota adalah buku besar, bukan penghitung.**
Setiap pergerakan strip (beli, alokasi, tarik kembali, konsumsi, kedaluwarsa,
penyesuaian admin) tercatat sebagai baris jurnal yang tidak bisa diubah. Saldo
= hasil penjumlahan. Angka saldo yang disimpan hanya cache. Alasannya: saat
klien protes "kok kuota saya habis padahal tamu cuma 80", kamu harus bisa
menunjukkan riwayatnya baris per baris.

**AB-04 — Strip yang sudah dikonsumsi tidak dikembalikan karena moderasi.**
Menyembunyikan foto dari galeri tidak mengembalikan kuota. Pengembalian hanya
terjadi untuk kegagalan teknis yang terbukti, dan wajib lewat penyesuaian admin
dengan alasan tertulis.

**AB-05 — Paket menentukan mode alokasi.**
`single_event`: strip terikat ke satu acara saat pembelian, tidak bisa
dipindahkan. `flexible`: strip masuk dompet, bebas dialokasikan. Akun
perorangan hanya boleh membeli paket `single_event`; akun vendor boleh keduanya.

**AB-06 — Minimum pembelian vendor adalah 600 strip.**
Angka ini properti paket (`min_strips`), bukan konstanta di kode.

**AB-07 — Saldo dompet punya masa berlaku.**
Bawaan 12 bulan sejak pembayaran lunas. Saldo kedaluwarsa dicatat sebagai
jurnal `expiry`, dan klien diberi tahu H-30, H-7, dan H-1.

**AB-08 — Alokasi bisa ditarik kembali selama acara belum `live`.**
Setelah acara `live`, sisa kuota terkunci di acara itu sampai acara `ended`.
Setelah `ended`, sisa kuota kembali ke dompet otomatis untuk akun `flexible`.
Untuk `single_event`, sisa hangus dan dicatat sebagai jurnal `forfeit`.

### Acara & masa aktif

**AB-09 — Masa aktif dihitung dari jadwal mulai, bukan dari tanggal publikasi.**
Bawaan 7 hari, properti paket. Klien boleh mempublikasikan jauh hari tanpa
memotong masa aktif.

**AB-10 — Jadwal mulai terkunci setelah acara benar-benar berjalan.**
Yaitu ketika status `live` **dan** waktu mulai sudah lewat. Sebelum itu, boleh
diubah bebas.

**AB-11 — `ended` dan `expired` berbeda dan tidak boleh disamakan.**
`ended` = keputusan klien; sesi baru ditolak tapi **galeri Momen tetap
terbuka**. `expired` = masa aktif komersial habis; semuanya terkunci termasuk
galeri.

**AB-12 — Acara tidak bisa dipublikasikan sebelum lolos seluruh gerbang.**
Daftar gerbang ada di dokumen 05 §6. Tombol Publikasikan tetap nonaktif sampai
semuanya hijau.

### Template & bingkai

**AB-13 — Satu template melayani banyak klien; kustomisasi milik acara.**
Template tidak pernah berubah karena klien menyesuaikan acaranya. Yang berubah
adalah nilai variabel dan daftar bingkai aktif pada acara tersebut.

**AB-14 — Acara yang sudah `live` memakai template yang dibekukan.**
Saat dipublikasikan, sistem menyimpan snapshot definisi template. Admin
memperbaiki template tidak boleh mengubah tampilan acara yang sedang berjalan.

**AB-15 — Klien mengubah isi, bukan desain.**
Warna, font, dan posisi elemen terkunci mengikuti template. Klien mengubah
nilai variabel (nama, tanggal, lokasi, tagar, sambutan) dan memilih bingkai.
Kalau klien butuh tampilan lain, jawabannya template baru — bukan tombol baru
di Visual Builder.

**AB-16 — Bingkai bawaan template tidak bisa dihapus klien, hanya dinonaktifkan.**
Menonaktifkan berlaku untuk acara itu saja. Bingkai unggahan klien sepenuhnya
milik klien dan boleh dihapus.

**AB-17 — Setiap acara wajib punya minimal satu bingkai aktif.**
Tanpa ini tamu buntu total di layar Pilih Bingkai. Divalidasi di gerbang
publikasi dan saat menonaktifkan bingkai terakhir.

**AB-18 — Bingkai tidak boleh memuat teks tercetak.**
Nama dan tanggal selalu lewat layer teks bertoken. Menghapus teks yang
terlanjur dibakar ke PNG membutuhkan pipeline pengolahan citra tersendiri —
jauh lebih murah mencegahnya.

**AB-19 — Lubang foto wajib benar-benar transparan.**
Divalidasi otomatis saat unggah. Bingkai yang menutup slot ditolak sebelum
tersimpan, bukan ditemukan saat acara berjalan.

### Data & privasi

**AB-20 — Foto tamu adalah data pribadi milik tamu, dititipkan ke klien.**
Klien boleh mengunduh dan memakai untuk keperluan acaranya. Circle Snap tidak
memakai foto tamu untuk promosi tanpa izin tertulis terpisah.

**AB-21 — Retensi bawaan 90 hari setelah acara `ended`.**
Setelah itu berkas media dihapus; metadata dan jumlah strip tetap disimpan
untuk keperluan audit penagihan. Klien diberi tahu H-14 sebelum penghapusan.

**AB-22 — Setiap tindakan yang mengubah uang, kuota, atau status acara wajib
tercatat di jejak audit** dengan pelaku, waktu, nilai sebelum, dan nilai
sesudah.

---

## 6. Ruang lingkup

### Termasuk (rilis 1)

- Pendaftaran & masuk dengan email + kata sandi
- Dua jenis akun: perorangan dan vendor, dengan anggota tim untuk vendor
- Portal Admin sebagai CMS: kategori, template, bingkai, paket, pengguna,
  pesanan, pengawasan acara
- Portal Klien: wizard buat acara, pilih template, Visual Builder, bingkai,
  publikasi, Momen, penagihan, pengaturan akun
- Unggah bingkai sendiri oleh klien dengan validasi otomatis
- Booth tamu: pilih bingkai → sesi foto → pesan suara → hasil & bagikan
- Buku besar kuota dan penagihan dengan verifikasi pembayaran

### Tidak termasuk (rilis 1)

Dicatat supaya tidak diam-diam masuk saat coding:

- White label penuh (domain sendiri, logo vendor menggantikan Circle Snap)
- API publik untuk integrasi pihak ketiga
- Cetak fisik / integrasi printer
- Filter AI generatif, penghapusan latar, GIF, boomerang
- Aplikasi native
- Multi bahasa selain Indonesia
- Mode luring penuh dengan antrean sinkronisasi

---

## 7. Asumsi & risiko

| # | Asumsi | Kalau salah |
|---|---|---|
| A1 | Klien bersedia bayar di muka sebelum acara | Perlu skema tempo untuk vendor besar |
| A2 | WiFi lokasi cukup untuk unggah foto | Perlu mode luring — biaya besar, masuk rilis 2 |
| A3 | Vendor mau mengelola alokasi kuota sendiri | Perlu alokasi otomatis |
| A4 | Template buatan admin cukup memenuhi selera klien | Perlu marketplace desainer pihak ketiga |
| A5 | Verifikasi pembayaran manual sanggup melayani volume awal | Perlu payment gateway lebih cepat dari rencana |

| # | Risiko | Mitigasi |
|---|---|---|
| R1 | Kuota dobel-klaim saat jaringan buruk | Klaim atomik + kunci idempoten per sesi (dok 07 §5) |
| R2 | Klien salah isi jadwal mulai → acara kedaluwarsa duluan | Peringatan eksplisit di gerbang publikasi + admin bisa memperpanjang |
| R3 | Bingkai unggahan klien merusak hasil foto | Validasi alpha otomatis (AB-19) + pratinjau wajib |
| R4 | Admin mengubah template yang sedang dipakai acara live | Snapshot template saat publikasi (AB-14) |
| R5 | Foto anak-anak di acara ulang tahun tersebar | Galeri privat secara bawaan, moderasi satu klik, retensi terbatas |
| R6 | Sengketa "kuota saya habis padahal tamu sedikit" | Buku besar kuota yang bisa ditunjukkan baris per baris (AB-03) |
