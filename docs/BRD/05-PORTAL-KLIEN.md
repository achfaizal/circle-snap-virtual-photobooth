# BRD — Circle Snap Virtual Booth
## 05 · Portal Klien

Basis URL: `/app`. Dipakai `owner`, `manager`, `operator`.

---

## 1. Perjalanan utama

```
Daftar → Verifikasi email → Buat acara (3 langkah) → Pilih paket & bayar
   → Pilih template → Visual Builder → Atur bingkai → Publikasi
   → Hari-H: pantau kuota → Setelah acara: Momen → Sudahi
```

Titik paling rawan gugur ada di antara "Daftar" dan "Publikasi". Karena itu
dasbor selalu menampilkan **satu langkah berikutnya** yang jelas, bukan daftar
menu yang harus ditebak sendiri urutannya.

---

## 2. Pendaftaran & masuk

### 2.1 Daftar — `/register`

Sesuai rancangan yang sudah ada. Satu layar, tanpa langkah bertingkat.

| Field | Kontrol | Wajib | Validasi |
|---|---|:--:|---|
| Jenis akun | dua kartu pilihan | ✔ | **Acara Sendiri** (1 acara, mis. nikahan kamu) atau **Vendor / EO** (kelola banyak acara klien) |
| Nama | teks | ✔ | 2–100 |
| Nama usaha | teks | ◐ | wajib bila Vendor/EO |
| Nomor WhatsApp | telepon | ✔ | normalisasi ke `+62…`; teks bantuan: "Dipakai untuk konfirmasi pembayaran dan kabar soal acaramu" |
| Email | email | ✔ | unik |
| Kata sandi | sandi + tombol lihat | ✔ | min 8, bukan sandi bocoran umum |
| Persetujuan | kotak centang | ✔ | syarat & kebijakan privasi |
| Kabar promosi | kotak centang | — | **tidak dicentang secara bawaan** |

Masuk dengan Google boleh ada sebagai jalur tambahan, tapi email + kata sandi
tetap jalur utama.

**Setelah daftar:** akun dibuat dengan `type` sesuai pilihan, pengguna menjadi
`owner`, email verifikasi terkirim. Pengguna **boleh langsung masuk** dan
menyiapkan acara — verifikasi email baru diwajibkan sebelum **publikasi**.
Memblokir di depan hanya menambah gugur tanpa menambah keamanan yang berarti.

### 2.2 Masuk — `/login`

Email + kata sandi. Tautan lupa sandi. Setelah 5 gagal dalam 15 menit, jeda
bertingkat dengan pesan jelas berapa lama harus menunggu.

### 2.3 Lupa & atur ulang sandi

Tautan sekali pakai berlaku 60 menit. Halaman atur ulang meminta sandi baru dua
kali. Setelah berhasil, semua sesi lain diakhiri dan pemberitahuan dikirim ke
email — kalau bukan pemiliknya yang melakukan, ia harus tahu.

---

## 3. Dasbor

Isi berbeda menurut jenis akun.

**Perorangan:** langsung menampilkan acaranya. Kalau belum ada, satu kartu
besar "Buat acara pertama". Kalau sudah ada dan `draft`, tampilkan daftar
langkah yang belum selesai dengan tautan langsung ke masing-masing.

**Vendor:** ringkasan dompet strip (saldo, masa berlaku), lalu daftar acara
tersusun menurut waktu — **Berlangsung sekarang**, **Minggu ini**, **Akan
datang**, **Arsip**. Acara yang sedang berjalan mengambil lebar penuh dengan
pita hitungan dan tombol tunggal "Buka mode lokasi".

**Operator:** hanya acara yang ditugaskan padanya, tanpa angka rupiah apa pun.

---

## 4. Membuat acara — wizard 3 langkah

Prinsip: wizard hanya menanyakan yang **dibutuhkan untuk membuat**. Sisanya
diisi belakangan di Detail Acara, dan kelengkapannya dijaga gerbang publikasi.

### Langkah 1 — Jenis & Nama

| Field | Kontrol | Wajib | Catatan |
|---|---|:--:|---|
| Kategori | kartu pilihan | ✔ | Pernikahan, Lamaran, Wisuda, Ulang Tahun, Lainnya |
| Nama acara (internal) | teks | ✔ | nama kerja, hanya kamu yang lihat |

Teks bantuan di bawah kategori: *"Menentukan sapaan & sambutan awal — bisa
diganti nanti."*

### Langkah 2 — Jadwal & Lokasi

| Field | Kontrol | Wajib | Catatan |
|---|---|:--:|---|
| Jadwal mulai | tanggal + jam | ✔ | **jadwal sungguhan acara** |
| Zona waktu | pilih | ✔ | bawaan `Asia/Jakarta` |
| Lokasi | teks | — | boleh diisi nanti |

Peringatan menetap di bawah kolom jadwal:

> ⏰ Masa aktif dihitung dari jadwal mulai, bukan dari kapan kamu
> mempublikasikan. Salah isi berarti acaramu kedaluwarsa sebelum waktunya.

Ini bukan hiasan. Salah isi jadwal adalah kesalahan klien paling mahal di
produk ini, dan satu-satunya obat sebelum kejadian adalah peringatan yang
tidak bisa dilewatkan.

### Langkah 3 — Kuota

Berbeda menurut jenis akun:

**Perorangan** — pilih paket dari etalase. Kartu paket menampilkan strip,
masa aktif, harga, dan apa yang termasuk. Setelah dipilih, pesanan dibuat dan
klien diarahkan ke pembayaran. Acara berstatus `draft` dan **sudah bisa
disiapkan** sambil menunggu pembayaran — hanya publikasi yang menunggu lunas.

**Vendor** — alokasikan dari dompet. Penggeser atau kolom angka dengan sisa
saldo terlihat. Kalau saldo kurang, tautan langsung ke top-up. Alokasi bisa
diubah kapan saja selama acara belum `live`.

---

## 5. Menyiapkan acara

Setelah wizard, klien masuk ke ruang kerja acara dengan tujuh menu.

### 5.1 Template — `/app/events/{id}/template`

Etalase template yang cocok dengan kategori acara. Tiap kartu: sampul, nama,
tagline, jumlah bingkai, dan tombol **Pratinjau** yang membuka simulasi HP
dengan `sample_data`.

Tombol **Pakai Template Ini** memasang: tema, font, efek, konfigurasi sesi
bawaan, definisi variabel, dan seluruh bingkai bawaan sekaligus.

Mengganti template setelah terpasang menampilkan konfirmasi jelas: nilai
variabel yang namanya sama akan dipertahankan, bingkai bawaan lama dilepas,
bingkai unggahan sendiri tetap ada.

### 5.2 Detail Acara — `/app/events/{id}/details`

| Field | Kontrol | Wajib untuk publikasi |
|---|---|:--:|
| Nama yang ditampilkan | teks | ✔ |
| Tanggal tampil | teks | ✔ |
| Jadwal mulai | tanggal+jam | ✔ |
| Lokasi | teks | — |
| Tagar | teks | — |
| Sambutan | area teks | ✔ |
| Nama tamu wajib diisi | sakelar | — |

"Tanggal tampil" sengaja teks bebas, bukan pemilih tanggal — klien sering
menulis "Sabtu, 12 Oktober 2026" atau "12 · 10 · 26" dan itu bagian dari
desain undangan mereka.

### 5.3 Visual Builder — `/app/events/{id}/builder`

Enam langkah, dijelaskan lengkap di dokumen 06 §3.

### 5.4 Bingkai — `/app/events/{id}/frames`

Daftar bingkai acara: bawaan template dan unggahan sendiri, dalam satu kisi
yang bisa diurut seret. Urutan di sini = urutan yang dilihat tamu.

| Aksi | Bingkai template | Bingkai sendiri |
|---|:--:|:--:|
| Aktif/nonaktifkan | ✔ | ✔ |
| Ubah urutan | ✔ | ✔ |
| Hapus | — (AB-16) | ✔ |
| Ubah layer teks | — | — |

**Unggah bingkai sendiri:** area jatuh dengan pola arsir diagonal supaya jelas
mana yang akan jadi lubang foto. Validasi lengkap di dokumen 06 §5. Batas
bawaan 10 bingkai kustom per acara.

Kalau klien menonaktifkan bingkai terakhir, tindakan ditolak dengan pesan:
*"Minimal satu bingkai harus aktif — tanpa itu tamu tidak punya pilihan apa
pun saat berfoto."*

### 5.5 Publikasi — `/app/events/{id}/publish`

Sesuai rancangan yang sudah ada, dengan gerbang diperluas.

**Kartu status** menampilkan status sekarang dan penjelasan apa artinya bagi
tamu.

**Checklist pra-publikasi** — tombol Publikasikan terkunci sampai semua hijau:

| # | Gerbang | Alasan |
|---|---|---|
| 1 | Minimal 1 bingkai aktif | AB-17 — tanpa ini tamu buntu |
| 2 | Nama yang ditampilkan terisi | muncul di strip |
| 3 | Tanggal tampil terisi | muncul di strip |
| 4 | Sambutan terisi | layar pembuka |
| 5 | Jadwal mulai terisi | menentukan masa aktif |
| 6 | Template sudah dipilih | |
| 7 | Semua variabel wajib template terisi | berbeda per template |
| 8 | Kuota acara > 0 | |
| 9 | Pesanan sudah lunas | untuk paket `single_event` |
| 10 | Email sudah diverifikasi | |
| 11 | Minimal satu tombol unduh menyala | tamu harus bisa bawa pulang |

Gerbang 7 dan 11 tidak ada di implementasi sekarang dan wajib ditambahkan.

**Setelah publikasi:** status `draft → live`, `expires_at` dihitung,
`template_snapshot` dibekukan (AB-14), QR dan tautan aktif.

**Blok Link & QR:** tautan `/e/{slug}` dengan tombol salin, QR untuk diunduh
PNG dan PDF siap cetak (A4 dan A5 dengan petunjuk singkat untuk tamu).

> QR versi PDF siap cetak bukan tambahan kecil. Tanpa itu, panitia akan
> memotret QR dari layar dan menempelnya buram di meja tamu — dan pemindaian
> gagal adalah kegagalan produk di mata tamu, bukan kegagalan panitia.

### 5.6 Momen — `/app/events/{id}/moments`

Galeri hasil tamu. Kisi rapat, strip terbaru di depan, muncul dengan animasi
"cuci film" yang sama dengan booth tamu.

Tiap entri: strip, nama tamu, waktu, indikator ada pesan suara.

| Aksi | Owner | Manager | Operator |
|---|:--:|:--:|:--:|
| Unduh satu | ✔ | ✔ | ✔ |
| Unduh semua (zip) | ✔ | ✔ | ✔ |
| Putar pesan suara | ✔ | ✔ | ✔ |
| Sembunyikan | ✔ | ✔ | ✔ |
| Hapus permanen | ✔ | ✔ | — |

Menyembunyikan harus **satu klik** dan bisa dibatalkan. Kalau butuh tiga
klik, panitia tidak akan memakainya saat acara ramai.

Pengaturan galeri: bisa dilihat tamu atau tidak (bawaan **tidak**), butuh kode
akses atau tidak.

### 5.7 Mode Lokasi — `/app/events/{id}/live`

Layar terpisah untuk dipegang panitia di lokasi. Satu layar penuh: nama acara,
sisa strip dalam angka besar, pita hitungan, jumlah foto masuk, waktu foto
terakhir, satu tombol ke galeri.

Aturan: teks minimal 16 px, target sentuh minimal 48 px, angka menyegarkan
sendiri, tidak ada form. Rincian di `ADMIN-DESIGN-BRIEF.md` §7.4.

---

## 6. Paket & Penagihan — `/app/billing`

Hanya `owner`.

| Bagian | Isi |
|---|---|
| Dompet strip | saldo, masa berlaku, peringatan bila < 30 hari |
| Alokasi | tabel acara dan kuota masing-masing, tombol tarik kembali |
| Beli paket | etalase sesuai `audience` akun |
| Top-up | paket `is_topup` |
| Riwayat pesanan | status, unduh kuitansi, unggah bukti |
| Riwayat kuota | jurnal lengkap, bisa diekspor |
| Data penagihan | nama, NPWP, alamat, email penagihan |

Riwayat kuota terbuka untuk klien secara sengaja. Klien yang bisa memeriksa
sendiri jarang menghubungi dukungan, dan transparansi ini yang mencegah
sengketa berubah jadi tuduhan.

---

## 7. Tim — `/app/team`

Hanya untuk akun vendor, hanya `owner`.

Daftar anggota: nama, email, peran, status, terakhir aktif.

**Undang anggota:** email + peran (`manager` atau `operator`). Undangan
berlaku 7 hari. Tautan sekali pakai.

**Penugasan operator:** dari halaman acara, pilih operator yang bertugas.
Operator hanya melihat acara yang ditugaskan padanya (dok 01 §4).

---

## 8. Pengaturan Akun — `/app/settings`

### 8.1 Profil

Nama lengkap, nomor WhatsApp (verifikasi ulang bila diubah), foto profil,
bahasa.

### 8.2 Keamanan

| Aksi | Aturan |
|---|---|
| Ganti kata sandi | wajib sandi lama; semua sesi lain berakhir |
| Ubah email | verifikasi ke email lama **dan** baru |
| 2FA | opsional; kode cadangan bisa diunduh |
| Perangkat aktif | daftar sesi, tombol akhiri satu atau semua |

### 8.3 Pemberitahuan

Sakelar per jenis dan per saluran (dalam aplikasi, email, WhatsApp).

Dua jenis **tidak bisa dimatikan**: `quota.empty` dan `retention.warning`.
Keduanya berakibat kehilangan yang tidak bisa dipulihkan — kuota habis di
tengah acara, dan foto terhapus permanen.

### 8.4 Akun & Data

- Ekspor data saya (zip: profil, acara, jurnal kuota, media)
- Hapus akun — hanya `owner`, butuh ketik ulang nama akun, jeda 7 hari
  sebelum benar-benar dihapus, dan **ditolak** kalau masih ada acara `live`

---

## 9. Bantuan

Halaman bantuan berisi: SOP pemakaian, daftar masalah umum dan solusinya
(tabel di `ALUR-PLAYGROUND.md` §7), materi siap cetak untuk tamu, dan tombol
hubungi dukungan lewat WhatsApp dengan konteks acara terisi otomatis.

---

## 10. Kondisi kosong & gagal

Setiap layar kosong wajib memberi arah, bukan sekadar memberitahu kekosongan.

| Layar | Teks kosong |
|---|---|
| Dasbor tanpa acara | "Belum ada acara. Buat acara pertamamu — butuh sekitar 5 menit." |
| Momen sebelum acara | "Belum ada foto masuk. Strip pertama akan muncul di sini begitu ada tamu berfoto." |
| Bingkai kosong | "Belum ada bingkai aktif. Tamu tidak bisa berfoto tanpa minimal satu bingkai." |
| Dompet kosong (vendor) | "Saldo strip habis. Top-up untuk melanjutkan acara berikutnya." |
| Template tidak cocok | "Belum ada template untuk kategori ini. Coba kategori Lainnya, atau hubungi kami." |

Pesan gagal menjelaskan apa yang terjadi dan langkah berikutnya, tanpa kode
teknis dan tanpa meminta maaf berlebihan.
