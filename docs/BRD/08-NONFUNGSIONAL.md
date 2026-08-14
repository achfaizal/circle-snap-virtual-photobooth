# BRD — Circle Snap Virtual Booth
## 08 · Non-Fungsional

---

## 1. Keamanan

### 1.1 Autentikasi

| Hal | Ketentuan |
|---|---|
| Simpan kata sandi | Argon2id, parameter mengikuti rekomendasi OWASP terkini |
| Panjang minimum | 8 karakter; tolak kata sandi dari daftar bocoran umum |
| Percobaan gagal | 5 dalam 15 menit → jeda bertingkat, bukan kunci permanen |
| Token sesi | Cookie `HttpOnly`, `Secure`, `SameSite=Lax` |
| Masa sesi | 30 hari klien, **8 jam staf platform** |
| 2FA | Wajib `super_admin` & `admin`, opsional klien |
| Token reset | Sekali pakai, 60 menit, hanya hash yang disimpan |
| Token undangan | Sekali pakai, 7 hari, hanya hash yang disimpan |

### 1.2 Otorisasi

Seluruh kueri data klien **wajib** ter-scope ke `account_id`. Bukan lewat
pemeriksaan di controller, tapi di lapisan akses data — sehingga rute baru
tidak bisa lupa memeriksanya.

Pemeriksaan berlapis untuk setiap permintaan:

1. Pengguna terautentikasi?
2. Anggota aktif akun ini?
3. Perannya mengizinkan tindakan ini? (matriks dok 01 §3)
4. Untuk `operator`: ditugaskan ke acara ini?
5. Objek yang diminta benar milik akun ini?

Langkah 5 sering dilupakan dan merupakan sumber kebocoran data paling umum:
memeriksa peran tapi lupa memeriksa kepemilikan objek.

### 1.3 Batas laju

| Endpoint | Batas |
|---|---|
| `POST /login` | 10 per 15 menit per IP, 5 per akun |
| `POST /register` | 5 per jam per IP |
| `POST /forgot-password` | 3 per jam per email |
| `POST /api/quota/claim` | 30 per menit per acara |
| Unggah aset | 20 per jam per akun |
| Booth publik | 120 per menit per IP |

Batas booth publik dibuat longgar dengan sengaja — 300 tamu di satu gedung
sering berbagi satu NAT, dan batas yang ketat akan memblokir acara sungguhan.

### 1.4 Berkas & unggahan

- Validasi tipe berdasarkan **isi berkas**, bukan ekstensi atau `Content-Type`
- Bersihkan metadata EXIF dari semua gambar, termasuk koordinat GPS
- Hasilkan ulang gambar (re-encode) untuk menghilangkan muatan tersembunyi
- Simpan di object storage terpisah dari domain aplikasi
- Nama berkas dihasilkan sistem, tidak pernah memakai nama dari pengguna
- Media privat hanya diakses lewat URL bertanda tangan berumur pendek (15 menit)

Membersihkan EXIF penting secara nyata: foto dari HP tamu membawa koordinat
lokasi, dan galeri yang bisa diunduh berarti lokasi rumah orang ikut tersebar.

### 1.5 Pengerasan lain

| Area | Ketentuan |
|---|---|
| Header | CSP ketat, HSTS, `X-Content-Type-Options`, `Referrer-Policy` |
| CSRF | Token untuk semua mutasi berbasis cookie |
| Injeksi SQL | Kueri berparameter; tidak ada penyusunan string |
| Rahasia | Di manajer rahasia, tidak pernah di repositori |
| Ketergantungan | Pemindaian otomatis; perbaikan kritis dalam 7 hari |
| Log | Tidak pernah memuat kata sandi, token, atau URL bertanda tangan |
| Webhook | Verifikasi tanda tangan + pemrosesan idempoten |

---

## 2. Privasi & data pribadi

### 2.1 Klasifikasi

| Data | Sensitivitas | Catatan |
|---|---|---|
| Foto & suara tamu | **Tinggi** | Data pribadi milik tamu (AB-20) |
| Nama tamu | Sedang | Diketik sendiri, boleh nama panggilan |
| Email & WhatsApp klien | Sedang | |
| Data penagihan | Sedang | |
| Kata sandi | Tinggi | Hanya hash |
| Jurnal kuota | Rendah | Tapi wajib utuh untuk audit |

### 2.2 Peran menurut regulasi

Untuk foto tamu, **klien adalah pengendali data dan Circle Snap adalah
pemroses**. Artinya klien yang bertanggung jawab memberi tahu tamunya, dan
Circle Snap menyediakan alat untuk itu.

Kewajiban yang harus difasilitasi produk:

- Pemberitahuan singkat di layar sambutan booth tentang apa yang terjadi
  dengan fotonya
- Tombol tamu menghapus fotonya sendiri (dok 07 §7)
- Ekspor data untuk klien
- Penghapusan data saat akun dihapus

### 2.3 Retensi

| Data | Masa simpan |
|---|---|
| Media acara (strip, foto mentah, suara, video) | 90 hari setelah `ended` (AB-21) |
| Metadata acara & jumlah strip | 7 tahun — kebutuhan audit penagihan |
| Jurnal kuota | Permanen |
| Jejak audit | 24 bulan |
| Log aplikasi | 30 hari |
| Akun dihapus | Media dihapus segera; metadata penagihan dianonimkan |

Peringatan retensi dikirim H-14. Klien boleh membeli perpanjangan.

Penghapusan media harus benar-benar menghapus objek di storage, bukan hanya
menandai baris di database. Ini diverifikasi lewat tugas terjadwal yang
membandingkan objek yatim di storage dengan referensi di database.

### 2.4 Anak-anak

Acara ulang tahun anak dan acara sekolah pasti melibatkan foto anak di bawah
umur. Ketentuan yang mengikat:

- Galeri **selalu privat secara bawaan** (`gallery_public = false`)
- Circle Snap tidak pernah memakai media acara untuk promosi tanpa izin
  tertulis terpisah dari klien
- Moderasi satu klik tersedia untuk semua peran termasuk `operator`
- Akses staf platform ke galeri hanya lewat tiket aktif dan tercatat di jejak
  audit (dok 01 §3.1 catatan 3)
- Tidak ada fitur pengenalan wajah, penandaan otomatis, atau pencarian orang
  di rilis mana pun

Butir terakhir adalah keputusan produk, bukan keterbatasan teknis. Kemampuan
mencari wajah seseorang di seluruh galeri acara adalah kemampuan yang tidak
sebanding risikonya dengan nilainya.

---

## 3. Performa

### 3.1 Sasaran

| Metrik | Sasaran |
|---|---|
| Booth: waktu sampai kamera siap (p95) | ≤ 8 detik dari pindai QR |
| Booth: waktu susun strip (p95) | ≤ 3 detik di HP kelas menengah |
| Klaim kuota (p95) | ≤ 400 ms |
| Portal klien: muat halaman (p95) | ≤ 2 detik |
| Galeri Momen 500 entri | ≤ 2 detik sampai baris pertama terlihat |
| Ketersediaan booth publik | 99,5% bulanan |

Sasaran booth diukur di HP Android kelas menengah dengan jaringan 4G yang
ramai, bukan di laptop pengembang.

### 3.2 Beban puncak

Pola beban produk ini sangat tidak merata: nyaris nol sepanjang minggu, lalu
melonjak Sabtu malam ketika beberapa resepsi berjalan bersamaan.

| Skala | Kondisi | Strategi |
|---|---|---|
| 1 acara | 300 tamu, 3 jam | Cukup satu instans |
| 10 acara serentak | ~3.000 tamu | Autoscaling + CDN untuk aset statis |
| 50 acara serentak | ~15.000 tamu | Antrean unggah + pemrosesan asinkron |

Compositing di perangkat tamu membuat beban server tetap ringan — yang berat
hanya unggahan media, dan itu bisa diserap dengan URL unggah langsung ke object
storage tanpa melewati aplikasi.

### 3.3 Caching

| Objek | Strategi |
|---|---|
| Aset template & bingkai | CDN, cache panjang, nama berversi |
| Snapshot acara | Cache tepi, invalidasi saat status berubah |
| Etalase template | Cache 5 menit |
| Kuota & galeri | **Tidak pernah di-cache** — data hidup |

---

## 4. Ketersediaan & pemulihan

| Hal | Ketentuan |
|---|---|
| Cadangan database | Harian penuh + PITR 7 hari |
| Cadangan object storage | Versioning aktif, cross-region untuk media |
| RPO | 1 jam |
| RTO | 4 jam |
| Uji pemulihan | Kuartalan, dicatat hasilnya |

Uji pemulihan yang tidak pernah dijalankan sama dengan tidak punya cadangan.

**Prioritas saat gangguan:** booth publik dipulihkan lebih dulu daripada portal
klien. Acara yang sedang berjalan tidak bisa ditunda; menyiapkan acara bisa.

---

## 5. Pemantauan

### 5.1 Peringatan yang membangunkan orang

| Kondisi | Ambang |
|---|---|
| Klaim kuota gagal | > 1% dalam 5 menit |
| Booth publik error 5xx | > 0,5% dalam 5 menit |
| Unggah media gagal | > 5% dalam 15 menit |
| Selisih jurnal kuota | > 0 akun |
| Antrean pemrosesan tertahan | > 500 pekerjaan |

### 5.2 Metrik produk yang dipantau harian

| Metrik | Kenapa penting |
|---|---|
| Sesi ditinggalkan / sesi dimulai | Indikator kesehatan paling jujur |
| Waktu sampai foto pertama | Mengukur gesekan awal |
| Rasio izin kamera ditolak | Masalah instruksi atau konteks tidak aman |
| Strip per acara vs kuota dibeli | Apakah paket sesuai kebutuhan nyata |
| Acara `draft` yang tidak pernah terbit | Di mana klien menyerah |

Angka terakhir adalah yang paling berharga untuk perbaikan produk. Acara yang
dibuat tapi tidak pernah dipublikasikan menunjukkan persis di langkah mana
klien buntu.

---

## 6. Kualitas & pengujian

### 6.1 Wajib sebelum rilis

| Area | Ketentuan |
|---|---|
| Klaim kuota | Uji serentak: 50 permintaan bersamaan saat sisa 1 harus menghasilkan tepat 1 sukses |
| Buku besar | Uji properti: saldo hasil penjumlahan selalu = cache setelah rangkaian operasi acak |
| Otorisasi | Uji setiap sel matriks hak akses, terutama yang bertanda `—` |
| Validasi bingkai | Uji dengan bingkai rusak yang disengaja |
| Booth lintas perangkat | Minimal 8 perangkat nyata: iPhone lama & baru, Android kelas bawah & menengah |

Uji perangkat nyata tidak bisa digantikan emulator. Perilaku `getUserMedia` dan
`MediaRecorder` di WebView Android bawaan berbeda cukup jauh dari Chrome.

### 6.2 Uji penerimaan sebelum jualan

Jalankan satu acara nyata dari awal sampai akhir dengan minimal 30 tamu
sungguhan sebelum menjual ke klien pertama. Bukan uji internal — acara
betulan dengan orang yang tidak tahu cara kerjanya.

---

## 7. Batasan yang diketahui di rilis 1

Dicatat supaya tidak dijanjikan ke klien:

| Batasan | Dampak | Rencana |
|---|---|---|
| Tidak ada mode luring | Sesi gagal bila jaringan putus total | Rilis 2 |
| Verifikasi pembayaran manual | Jeda sampai beberapa jam | Gateway di rilis 2 |
| Bingkai klien tanpa layer teks | Nama tidak tercetak di bingkai kustom | Rilis 2 |
| Satu bahasa | Hanya Indonesia | Sesuai kebutuhan |
| Tanpa white label | Merek Circle Snap tetap tampil | Rilis 3 |
| Tanpa API publik | Tidak bisa integrasi pihak ketiga | Rilis 3 |

Batasan pertama yang paling perlu dikomunikasikan jujur ke klien: gedung dengan
WiFi buruk akan bermasalah, dan lebih baik mereka tahu sebelum membeli daripada
kecewa di hari-H.
