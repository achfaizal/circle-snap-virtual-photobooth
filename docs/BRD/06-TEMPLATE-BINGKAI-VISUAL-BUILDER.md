# BRD — Circle Snap Virtual Booth
## 06 · Template, Bingkai & Visual Builder

---

## 1. Model mental: kelas dan instans

Ini bagian yang paling sering salah dipahami, jadi ditulis eksplisit.

```
TEMPLATE (milik admin)                ACARA (milik klien)
────────────────────────              ────────────────────────
kanvas, tema, font                →   diwarisi, terkunci
definisi variabel                 →   diisi nilainya oleh klien
bingkai bawaan                    →   diaktifkan / dinonaktifkan
konfigurasi sesi bawaan           →   disesuaikan dalam batas paket
data contoh (etalase)             →   TIDAK ikut, jangan pernah bocor
                                      + bingkai unggahan klien sendiri
```

**Template adalah kelas. Acara adalah instans.** Satu template dipakai ratusan
acara sekaligus, dan tidak satu pun perubahan di acara boleh mengubah
templatenya (AB-13).

Konsekuensi yang harus dipatuhi di kode: tidak ada satu pun operasi klien yang
menulis ke tabel `templates`, `template_variables`, atau `template_frames`.
Semua tulisan klien jatuh ke `event_*`.

---

## 2. Apa yang dibawa template

### 2.1 Kontrak minimum

Template `published` wajib punya:

| Bagian | Aturan |
|---|---|
| Sembilan token warna | semua terisi |
| Font display | terdaftar di katalog |
| Kartu video | enam token + gradasi judul 3 warna |
| Minimal 1 bingkai | disarankan 3 varian: 1, 2, 3 foto |
| Definisi variabel | mencakup semua token yang dipakai bingkai |
| Data contoh | lengkap untuk semua variabel wajib |
| `brand_label` | teks sapaan besar di layar sambutan |
| Folder aset | `public/templates/<folder>/` |

### 2.2 Satu template = satu jenis acara

`brand_label` ("WEDDING", "ENGAGEMENT") ditulis sebagai teks tetap di layar
sambutan, dan sering ikut jadi ornamen di bingkai. Karena itu satu template
melayani satu jenis acara.

Template netral yang tidak menyebut jenis acara boleh dipetakan ke beberapa
kategori — itulah gunanya `is_primary` di `template_categories`.

### 2.3 Variabel berbeda per template

Inilah yang membuat Visual Builder terasa menyesuaikan template. Contoh:

| Template | Variabel |
|---|---|
| Wedding Klasik | `names`, `date`, `venue`, `hashtag` |
| Lamaran Manis | `names`, `date`, `hashtag` |
| Wisuda Formal | `student_name`, `major`, `university`, `year` |
| Ulang Tahun Anak | `child_name`, `age`, `date` |

Builder membaca `template_variables` dan membangun formnya sendiri. Tidak ada
form yang di-hardcode.

---

## 3. Visual Builder — enam langkah

Rute `/app/events/{id}/builder`. Pratinjau HP menetap di sisi kanan (di bawah
form pada layar sempit) dan **selalu memakai `compose()` yang sama** dengan
booth tamu — bukan tiruan CSS. Ini yang membuat "hasilnya beda dengan yang di
layar" mustahil terjadi.

### Langkah 1 — Selamat Datang

Isi: sapaan (`brand_label`, terkunci dari template), nama yang ditampilkan,
tanggal tampil, sambutan, monogram/foto acara bila template mendukungnya,
sakelar nama tamu wajib.

### Langkah 2 — Bingkai

Pilih bingkai aktif dan urutannya. Unggah bingkai sendiri. Peringatan bila
tidak ada yang aktif (AB-17).

### Langkah 3 — Sesi Foto

Hitung mundur, lanjut sendiri, cermin, batas ulang, animasi cetak, filter
yang tersedia, rasio kamera. Semua dibatasi plafon paket.

### Langkah 4 — Pesan Suara

Aktif/nonaktif, durasi maksimal (dibatasi `max_voice_seconds` paket), teks
ajakan. Bila paket tidak mendukung, langkah ini tampil tapi terkunci dengan
penjelasan dan tautan naik paket — bukan disembunyikan. Klien perlu tahu fitur
itu ada.

### Langkah 5 — Hasil & Bagikan

Tombol yang muncul untuk tamu: unduh PNG, JPG, video, Instagram, WhatsApp,
bagikan bawaan.

Validasi: **minimal satu tombol unduh wajib menyala.** Kalau semua dimatikan,
tamu tidak bisa membawa pulang apa pun. Builder menolak menyimpan dengan pesan
jelas.

### Langkah 6 — Ringkasan

Daftar periksa kelengkapan, pratinjau strip akhir dengan data sungguhan, dan
peringatan yang belum beres. Dari sini langsung ke Publikasi.

### 3.1 Batasan builder

Yang **tidak** dilakukan builder (AB-15):

- Memindahkan posisi elemen
- Mengubah warna atau font
- Menambah atau menghapus layer teks
- Mengubah ukuran kanvas atau slot

Kalau klien meminta salah satu di atas, jawabannya template baru — bukan
tombol baru di builder. Menambah satu kebebasan saja akan berujung pada
permintaan berikutnya, dan produk berubah jadi editor grafis dengan kualitas
hasil yang tak bisa dijamin.

---

## 4. Bingkai

### 4.1 Anatomi

| Bagian | Aturan |
|---|---|
| PNG | RGBA, lubang foto benar-benar transparan (alpha 0), bukan putih |
| Tanpa teks tercetak | AB-18 |
| `slots[]` | `{x, y, w, h}` piksel, terdeteksi otomatis dari area alpha |
| `text_layers[]` | bertoken, `locked: true` |
| `paper` | warna dasar di balik foto |
| `width`/`height` | dari dimensi PNG, tanpa penskalaan paksa |

### 4.2 Urutan menggambar

```
1. Latar       → frame.paper
2. Foto tamu   → ke tiap slot, kena filter & cermin
3. PNG bingkai → ditumpuk di atas foto
4. Layer teks  → token diganti nilai variabel acara
```

Teks digambar paling akhir supaya nama pengantin tidak pernah tertutup
ornamen bingkai.

### 4.3 Token

| Token | Sumber |
|---|---|
| `{{names}}` | `events.display_names` |
| `{{date}}` | `events.date_display` |
| `{{venue}}` | `events.venue` |
| `{{hashtag}}` | `events.hashtag` |
| `{{code}}` | `events.slug` |
| `{{<key>}}` | variabel kustom template mana pun |

Token yang tidak punya nilai dirender kosong, bukan menampilkan `{{venue}}`
mentah di hasil foto tamu.

### 4.4 Penyusutan otomatis

Ukuran font mengecil bertahap kalau teks melebihi `maxWidth`. Ini bukan kasus
tepi — nama seperti "Nur Aisyah Rahmadhani & Muhammad Fadhlurrahman" pasti
muncul, dan tanpa penyusutan teksnya keluar dari kertas.

---

## 5. Validasi unggahan bingkai

Dijalankan otomatis saat unggah, sebelum bingkai tersimpan. Hasilnya disimpan
di `frames.validation_report`.

### 5.1 Pemeriksaan wajib — gagal berarti tolak

| # | Pemeriksaan | Ambang |
|---|---|---|
| V1 | Berkas PNG dengan kanal alpha | wajib |
| V2 | Ukuran berkas | ≤ 8 MB |
| V3 | Dimensi | sisi terpendek ≥ 600 px, terpanjang ≤ 6000 px |
| V4 | Ada area transparan | ≥ 1 wilayah alpha < 10 dengan luas ≥ 3% kanvas |
| V5 | Jumlah slot terdeteksi | 1–6 |
| V6 | Transparansi slot | setiap slot ≥ 95% piksel beralpha < 10 |
| V7 | Slot tidak bertumpang tindih | toleransi 2 px |
| V8 | Slot di dalam kanvas | wajib |

V6 adalah yang menyelamatkan acara. Bingkai yang terlihat berlubang tapi
sebenarnya punya lapisan semi-transparan akan menghasilkan foto tamu yang
buram tertutup kabut — dan baru ketahuan saat acara berjalan.

### 5.2 Peringatan — boleh lanjut, tapi ditampilkan

| # | Peringatan |
|---|---|
| W1 | Terdeteksi kemungkinan teks tercetak di dalam bingkai (AB-18) |
| W2 | Slot sangat kecil (< 15% tinggi kanvas) — wajah tamu akan mungil |
| W3 | Rasio slot ekstrem (< 0,4 atau > 2,5) — pemotongan agresif |
| W4 | Ukuran berbeda dari bingkai lain di acara yang sama |
| W5 | Tanpa layer teks — nama acara tidak akan muncul di hasil |

### 5.3 Deteksi slot

1. Ambil kanal alpha, ambang < 10
2. Beri label komponen terhubung
3. Buang komponen dengan luas < 1% kanvas
4. Ambil kotak pembatas tiap komponen
5. Urutkan atas→bawah, lalu kiri→kanan
6. Tampilkan hasilnya di atas gambar untuk dikonfirmasi

Klien boleh menyesuaikan kotak secara manual kalau deteksi meleset. Pratinjau
memakai foto contoh supaya hasilnya terlihat sebelum disimpan.

### 5.4 Layer teks pada bingkai klien

Rilis 1: bingkai unggahan klien **tidak** mendapat layer teks. Nama acara tidak
tercetak di bingkai itu.

Ini dipilih sadar. Membiarkan klien menempatkan layer teks berarti membangun
editor tipografi lengkap dengan pemilihan font, dan hasilnya akan buruk di
sebagian besar kasus. Peringatan W5 memberi tahu konsekuensinya dengan jujur.

Rilis 2 bisa menawarkan penempatan otomatis: sistem mencari pita kosong di
bagian bawah bingkai dan menawarkan satu layer nama di sana.

---

## 6. Pembekuan snapshot

Saat acara dipublikasikan, sistem menyimpan `events.template_snapshot`:

```jsonc
{
  "template_id": "…",
  "version": 3,
  "theme_colors": { … },
  "font_display_id": "…",
  "theme_effects": { … },
  "video_card_theme": { … },
  "brand_label": "WEDDING",
  "variables": [ … ],
  "frames": [ { "frame_id": "…", "slots": [ … ], "text_layers": [ … ] } ]
}
```

Booth tamu membaca snapshot, bukan tabel template. Efeknya: admin bisa
memperbaiki template kapan saja tanpa risiko mengubah acara yang sedang
berjalan (AB-14).

Snapshot tidak dibuat ulang saat acara `live`. Kalau ada perbaikan mendesak
yang harus masuk ke acara berjalan, itu tindakan admin eksplisit dengan alasan
tertulis dan tercatat di jejak audit.

---

## 7. Aturan tambah/kurang aset template

Menambah field baru ke tema atau konfigurasi sesi **wajib opsional dengan nilai
bawaan yang menyamai perilaku sebelumnya** (AB-14 turunan). Acara lama tidak
boleh berubah tampilannya hanya karena ada field baru di skema.

Menambah font baru butuh tiga langkah sinkron:

1. Impor di `next/font`
2. Variabel `--canvas-font-*` supaya kanvas bisa membacanya
3. Entri di katalog font

Ketiganya harus dalam satu perubahan. Font yang terdaftar di katalog tapi tidak
punya variabel kanvas akan jatuh diam-diam ke serif bawaan saat compositing,
dan itu baru ketahuan di hasil cetak tamu.

---

## 8. Daftar periksa template baru

**Desain**

- [ ] Folder `public/templates/<Nama>/` dibuat
- [ ] PNG bingkai varian 1, 2, 3 foto — lubang transparan, **tanpa tulisan**
- [ ] Ornamen sudut & latar kartu video bila ada

**Data**

- [ ] Aset terdaftar dengan `account_id = null`
- [ ] Bingkai terdaftar: `slots` + `text_layers` bertoken + `is_locked = true`
- [ ] Entri template: 9 warna, font, efek, kartu video, folder, data contoh
- [ ] `template_variables` mencakup semua token yang dipakai bingkai
- [ ] `template_frames` terisi dan berurutan

**Uji — jalankan sesi tamu sungguhan sampai keluar hasil.** Jangan berhenti di
pemeriksaan tipe.

- [ ] Pratinjau etalase memakai data contoh
- [ ] Pasang ke acara uji → semua bingkai bawaan ikut terpasang
- [ ] Nama & tanggal klien muncul benar di strip
- [ ] **Nama contoh template tidak bocor ke acara klien**
- [ ] Foto tamu terlihat penuh, tidak tertutup bingkai
- [ ] Teks tidak menabrak foto, ornamen, atau tepi kertas
- [ ] Nama panjang tersusut dengan benar, tidak keluar kertas
- [ ] Kartu video terbaca dan audio tersinkron
- [ ] Diuji di Safari iOS **dan** WebView Android, bukan hanya Chrome desktop
