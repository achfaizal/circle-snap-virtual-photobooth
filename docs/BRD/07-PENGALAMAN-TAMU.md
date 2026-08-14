# BRD — Circle Snap Virtual Booth
## 07 · Pengalaman Tamu

Rute publik: `/e/{slug}`. Tanpa akun, tanpa pemasangan aplikasi.

---

## 1. Prinsip

Tamu adalah pengguna yang paling tidak sabar di seluruh sistem. Ia berdiri di
keramaian, memegang HP dengan satu tangan, dan memberi produk ini kesempatan
sekitar sepuluh detik sebelum menyerah dan kembali ke percakapan.

Konsekuensinya:

- Tidak ada pendaftaran, tidak ada masuk, tidak ada persetujuan berlapis
- Izin kamera diminta **saat dibutuhkan**, bukan di layar pertama
- Setiap kegagalan menjelaskan langkah berikutnya dengan bahasa manusia
- Gagal pelan, jangan gagal total: filter tidak didukung bukan alasan foto
  hilang

---

## 2. Peta fase

```
        buka /e/{slug}
              │
    ┌─────────▼─────────┐
    │ FASE 0 · Sambutan │  gerbang akses + nama tamu
    └─────────┬─────────┘
    ┌─────────▼─────────┐
    │ FASE 1 · Bingkai  │  step = "bingkai"
    └─────────┬─────────┘
    ┌─────────▼─────────┐
    │ FASE 2 · Potret   │  step = "potret"
    └─────────┬─────────┘
    ┌─────────▼─────────┐
    │ FASE 3 · Suara    │  step = "suara"  (bisa dimatikan)
    └─────────┬─────────┘
    ┌─────────▼─────────┐
    │ FASE 4 · Hasil    │  step = "struk"
    └─────────┬─────────┘
        tiga berkas keluar
```

Struktur empat fase ini **tetap untuk semua template**. Yang boleh berbeda
hanya warna, font, ornamen, bingkai, dan teks. Kalau sebuah kebutuhan
menuntut alur berbeda, itu produk baru — bukan template baru.

---

## 3. Fase 0 — Sambutan

### 3.1 Gerbang akses

Dicek berurutan. Kalau salah satu terpenuhi, tamu berhenti di sini.

| Kondisi | Pesan ke tamu | Galeri Momen |
|---|---|---|
| Slug tidak ditemukan | "Halaman acara tidak ditemukan." | — |
| `status = draft` | "Acara ini belum dibuka." | tertutup |
| `status = suspended` | "Acara ini sedang tidak tersedia." | tertutup |
| `status = ended` | "Acara sudah selesai. Kamu masih bisa melihat hasilnya." | **terbuka** |
| `status = expired` | "Masa aktif acara sudah berakhir." | tertutup |
| Sisa kuota = 0 | "Kuota foto sudah habis. Hubungi panitia." | terbuka bila `ended`, selain itu tertutup |

Perbedaan `ended` dan `expired` disengaja dan tidak boleh disamakan (AB-11).
`ended` adalah keputusan panitia — tamu masih boleh melihat kenangannya.
`expired` adalah batas komersial — semuanya terkunci.

Pesan untuk tamu tidak menyebut alasan komersial. Tamu tidak perlu tahu
kliennya belum bayar; itu urusan antara Circle Snap dan klien.

### 3.2 Yang tampil

Sapaan besar (`brand_label`), nama acara, tanggal, sambutan, monogram atau
foto acara bila ada, kolom nama tamu, tombol mulai, dan tombol "Lihat Momen"
bila galeri terbuka untuk tamu.

### 3.3 Nama tamu

Wajib atau tidak diatur `guest_name_required`. Kalau wajib, minimal 2 karakter.

Nama ini dipakai untuk menandai entri di galeri sehingga panitia bisa mencari,
dan ditampilkan di Momen. Tidak dipakai untuk apa pun selain itu, dan tidak
disimpan sebagai identitas permanen.

---

## 4. Fase 1–3

### 4.1 Pilih bingkai

Carousel berisi `event_frames` yang `is_enabled`, berurutan sesuai
`sort_order`. Tiap kartu: PNG bingkai, nama, jumlah slot, ukuran cetak,
keterangan singkat.

Yang tampil adalah **PNG mentah** — layer teks belum digambar. Nama dan tanggal
baru muncul saat compositing di Fase 4. Artinya bingkai harus tetap terbaca
komposisinya walau teksnya kosong.

Kalau tidak ada bingkai aktif, tamu buntu total. Ini dicegah di dua tempat:
gerbang publikasi dan penolakan menonaktifkan bingkai terakhir (AB-17).

### 4.2 Sesi foto

Jumlah jepretan = jumlah slot pada bingkai yang dipilih. Perilaku diatur
`session_config` (dok 03 §5.3).

`filterId` sengaja satu nilai yang menghasilkan satu string CSS, dipakai di
dua tempat: `style.filter` pada `<video>` untuk pratinjau dan `ctx.filter`
saat compositing. Kalau dipisah, yang dilihat tamu tidak sama dengan yang
tercetak — keluhan nomor satu di produk sejenis.

**Izin kamera** diminta di sini, bukan sebelumnya. Kalau ditolak, tampilkan
langkah pemulihan yang konkret: buka ikon gembok di address bar, izinkan
kamera, muat ulang.

**Ulang jepretan** dibatasi `maxRetakes` per sesi dan tidak memotong kuota
tambahan (AB-01). Mengulang mengisi slot yang sama, bukan menambah slot baru.

### 4.3 Pesan suara

Dilewati kalau `voice.enabled = false`. Durasi dibatasi `voice.maxSeconds`,
yang sendiri dibatasi plafon paket. Butuh izin mikrofon.

Meteran level wajib ditampilkan saat merekam. Tanpa itu tamu tidak tahu
mikrofonnya menangkap suara sampai rekaman selesai dan terlambat diperbaiki.

Hasil rekaman dipakai menyusun kartu video di Fase 4.

---

## 5. Fase 4 — Hasil, klaim kuota, penyimpanan

Tiga hal terjadi berurutan. Urutannya penting.

### 5.1 Klaim kuota lebih dulu

```
POST /api/quota/claim
{ "session_id": "…", "event_slug": "…" }
```

Server yang memutuskan, bukan perangkat tamu (AB-02). Prosesnya:

1. Buka transaksi, kunci baris acara (`SELECT … FOR UPDATE`)
2. Periksa: `status = live`, `now() < expires_at`, sisa kuota > 0
3. Periksa kunci idempoten — kalau `session_id` ini sudah pernah mengklaim,
   kembalikan hasil yang sama tanpa memotong lagi
4. Tulis jurnal `consumption` −1 dengan `idempotency_key = session_id`
5. Perbarui `cached_consumed`
6. Commit

Kalau gagal karena kuota habis, tamu melihat pesan yang jujur dan sesi ditandai
`rejected` dengan `reject_reason = quota_empty`. Fotonya tidak jadi, dan itu
lebih baik daripada memberi hasil lalu menagih klien di luar paket.

Dua tamu yang menekan bersamaan saat sisa 1 tidak boleh lolos berdua. Kunci
baris di langkah 1 yang menjaminnya — bukan pemeriksaan di lapisan aplikasi.

### 5.2 Compositing

Setelah klaim berhasil, `compose()` menyusun strip final: kertas → foto per
slot → PNG bingkai → layer teks (dok 06 §4.2). Seluruhnya di perangkat tamu.

### 5.3 Simpan ke galeri

Otomatis, **tidak menunggu tamu menekan unduh**. Supaya semua yang sudah
berfoto benar-benar tercatat di Momen, termasuk tamu yang lupa mengunduh.

Yang diunggah: strip final, foto mentah per slot, rekaman suara, kartu video.
Foto mentah disimpan supaya strip bisa disusun ulang bila ada kesalahan yang
tidak bisa diulang.

### 5.4 Struk

Menampilkan nomor strip, bingkai, jumlah foto, ada pesan suara atau tidak, dan
sisa kuota acara. Nomor strip berguna saat tamu menghubungi panitia mencari
fotonya.

### 5.5 Tombol berbagi

Diatur `session_config.share`. Minimal satu tombol unduh wajib menyala —
divalidasi di Visual Builder dan gerbang publikasi.

Berbagi bawaan memakai Web Share API dengan berkas. Kalau browser tidak
mendukung, tampilkan arahan: unduh dulu, lalu unggah dari galeri. Jangan
tampilkan tombol yang tidak melakukan apa-apa.

---

## 6. Output

| # | Berkas | Isi | Kapan |
|---|---|---|---|
| 1 | Strip PNG/JPG | kertas → foto → bingkai → layer teks | tiap sesi |
| 2 | Kartu video | strip + gelombang suara + audio tamu | bila ada rekaman |
| 3 | Entri Momen | strip + video + nama tamu | otomatis |

Kartu video dirender 1080×1920 di perangkat tamu tanpa server encoding. Format
ini bisa langsung diunggah ke Reels dan TikTok, dan itu jalur penyebaran
termurah untuk produk ini.

---

## 7. Galeri Momen untuk tamu

Rute `/e/{slug}/moments`. Muncul hanya bila `gallery_enabled` dan
`gallery_public`.

Bawaan `gallery_public = false`. Ini keputusan privasi, bukan kelalaian:
galeri acara ulang tahun berisi foto anak-anak, dan galeri yang terbuka
secara bawaan berarti klien harus ingat menutupnya. Yang aman adalah
kebalikannya.

Bila dibuka, klien bisa mensyaratkan kode akses sederhana.

Tamu melihat strip yang tidak disembunyikan. Setiap strip punya tombol **"Ini
foto saya, tolong hapus"** yang memakai `guest_delete_token_hash` — tamu yang
menyesal berfoto berhak menariknya kembali tanpa harus menghubungi panitia.
Permintaan ini menyembunyikan strip seketika dan memberi tahu klien.

---

## 8. Perilaku saat jaringan buruk

Rilis 1 tidak punya antrean luring penuh, tapi wajib punya perilaku yang
tidak merusak:

| Situasi | Perilaku |
|---|---|
| Unggah gagal | Coba ulang otomatis 3 kali dengan jeda menaik |
| Tetap gagal | Strip tetap bisa diunduh tamu; tandai entri Momen `pending_upload` |
| Klaim kuota gagal karena jaringan | Tampilkan tombol coba lagi; **jangan** susun strip sebelum klaim berhasil |
| Halaman dimuat ulang di tengah sesi | Sesi dianggap `abandoned`, kuota tidak terpotong |

Aturan penting: **jangan pernah menyusun dan menyerahkan strip sebelum klaim
kuota berhasil.** Kalau urutannya terbalik, tamu mendapat foto yang tidak
tercatat dan klien merasa kuotanya bocor.

---

## 9. Aksesibilitas & perangkat

| Hal | Aturan |
|---|---|
| Konteks aman | Kamera dan mikrofon hanya jalan di HTTPS |
| Ukuran teks | Minimal 16 px di seluruh booth |
| Target sentuh | Minimal 48 px |
| Gerak | `prefers-reduced-motion` dihormati |
| Kontras | Minimal AA untuk seluruh teks di atas tema template |
| Uji wajib | Safari iOS dan WebView Android, bukan hanya Chrome desktop |

`ctx.filter` absen di sebagian WebView lama. Foto tetap tersusun, hanya tanpa
filter. `MediaRecorder` untuk video memilih MIME berurutan: MP4 dulu, lalu
WebM. Bila tidak ada yang didukung, tombol video tidak muncul dan unduhan foto
tetap jalan.

---

## 10. Yang tidak boleh dilakukan booth

- Meminta email atau nomor telepon tamu
- Memasang pelacak pihak ketiga di halaman tamu
- Menampilkan merek Circle Snap lebih menonjol daripada identitas acara klien
- Menyimpan pengenal perangkat permanen
- Mengunggah foto sebelum tamu menyelesaikan sesi
- Menampilkan angka kuota tersisa ke tamu — itu informasi komersial klien
