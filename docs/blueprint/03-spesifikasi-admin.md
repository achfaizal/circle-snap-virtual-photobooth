# Blueprint 03 — Spesifikasi Admin

> Rancangan layar per halaman. Semua di bawah route `/admin`, satu aplikasi
> Next.js yang sama dengan playground (bukan project terpisah) — supaya
> preview bisa memakai komponen playground yang asli, bukan tiruan.

---

## Peta Navigasi

```
/admin/login                      gerbang password
/admin                            dashboard — daftar event
/admin/events/new                 wizard buat event
/admin/events/[id]                editor event (bertab)
   ├─ ?tab=info                   identitas acara
   ├─ ?tab=tema                   warna, font, dekorasi
   ├─ ?tab=bingkai                pilih bingkai untuk event ini
   ├─ ?tab=sesi                   perilaku sesi foto
   ├─ ?tab=teks                   override tulisan antarmuka
   └─ ?tab=publish                slug, QR, status
/admin/frames                     pustaka bingkai
/admin/frames/new                 upload + deteksi slot
/admin/frames/[id]                editor bingkai (slot & layer teks)
/admin/events/[id]/moments        galeri momen + unduh
/admin/account                    paket & kuota terpakai
```

Halaman khusus GLYKA (belum prioritas):
```
/admin/staff/clients              daftar klien
/admin/staff/plans                katalog paket
/admin/staff/frames               pustaka bingkai bawaan
```

---

## 1. Dashboard — `/admin`

**Tujuan:** klien tahu status semua eventnya dalam 3 detik.

Isi:
- Kartu per event: nama internal, tanggal, status (`draft`/`live`/`ended`)
- **Bar kuota**: `142 / 200 strip terpakai` — angka paling penting di sini
- Peringatan bila kuota < 20% tersisa
- Tombol: `Buka`, `Lihat Momen`, `Salin Link`, `Unduh QR`
- Tombol utama: `+ Buat Event Baru`

Kalau kuota habis: kartu berubah merah + ajakan tambah paket.

---

## 2. Wizard Event Baru — `/admin/events/new`

Jangan lempar klien langsung ke editor kosong dengan 40 field. Tiga langkah
saja, sisanya bisa disempurnakan belakangan:

**Langkah 1 — Acara apa?**
- Nama acara (untuk klien sendiri)
- Jenis: Pernikahan / Lamaran / Ulang Tahun / Wisuda / Lainnya
  → menentukan `brandLabel` default ("Happy Wedding", "Happy Engagement", …)
- Nama yang ditampilkan (`names`)
- Tanggal acara

**Langkah 2 — Tampilannya seperti apa?**
- Pilih preset tema: **Gelap Elegan** / **Terang Lembut** / **Netral**
  (bukan color picker — itu di editor)
- Preview langsung di samping

**Langkah 3 — Bingkainya?**
- Pilih dari pustaka bawaan Glyka, atau lewati dulu
- Upload bingkai sendiri (kalau paket mengizinkan)

Selesai → masuk editor dengan status `draft`.

---

## 3. Editor Event — `/admin/events/[id]`

**Tata letak: dua kolom.** Kiri form, kanan **preview hidup**.
Di layar sempit, preview jadi tombol mengambang "Lihat Preview".

### Preview hidup — bagian terpenting

Preview **bukan mockup**. Ia me-render `<EventBooth>` yang sama persis
dengan yang dilihat tamu, di dalam bingkai ponsel virtual (390×844).

Cara kerja:
1. Form menulis ke state `draftEvent` (belum tersimpan)
2. `draftEvent` di-inject ke `<EventBooth>` lewat prop, **bukan** lewat
   `getEvent(code)` yang membaca data tersimpan
3. Ada pemilih langkah: `Selamat Datang / Bingkai / Foto / Suara / Struk`
   supaya klien bisa memeriksa semua layar tanpa harus menjalani sesi
4. Kamera dimatikan di mode preview (pakai gambar contoh), supaya tidak
   minta izin kamera terus-menerus

> **Konsekuensi teknis:** `EventBooth` sekarang menerima `code: string` lalu
> memanggil `getEvent()` sendiri. Harus diubah supaya bisa menerima objek
> event langsung. Ini refactor kecil tapi wajib — tanpa itu, preview jujur
> tidak mungkin (melanggar prinsip P3 di dokumen 00).

### Tab: Info
Semua field `EventIdentity`. Validasi:
- `names` wajib; peringatkan kalau tidak mengandung `&` (judul pesan suara
  memecah nama pakai `" & "` — lihat dokumen 01-F5, ini rapuh)
- `greeting` maksimal ±160 karakter dengan penghitung, karena lebih dari
  itu mulai mendorong tombol di layar HP
- `hashtag` otomatis diawali `#`

### Tab: Tema

Tiga bagian:

**a. Preset** — Gelap / Terang / Kustom. Memilih preset menimpa 9 warna.

**b. Warna** — 9 color picker, tapi **dikelompokkan berdasarkan peran, bukan
nama teknis**:

| Label untuk klien | Token sebenarnya |
|---|---|
| Latar halaman | `ink` |
| Teks utama | `paper` |
| Teks redup | `smoke` |
| Garis & bingkai | `edge` |
| Warna aksen | `flash` |
| Latar kartu | `film` |
| Gradasi tombol (2 warna) | `brandPurple`, `brandGold` |
| Warna status merekam | `live` |

**Wajib ada: pemeriksa kontras.** Hitung rasio `paper` vs `ink` dan
`smoke` vs `ink`. Kalau di bawah 4.5:1, tampilkan peringatan jelas —
bukan sekadar warning kecil. Ini mencegah klien membuat playground yang
tidak terbaca (risiko nyata: `ink`/`paper` bertukar peran antara tema
gelap dan terang).

**c. Aset & efek**
- Upload dekorasi sudut (PNG transparan) — preview 4 sudut langsung
- Upload latar kartu video (1080×1920) — dengan panduan area aman
- Toggle: kelopak jatuh (+ jumlah), bola cahaya, konfeti
- Pilih font display & mono dari katalog

### Tab: Bingkai
- Grid bingkai yang tersedia (pustaka Glyka + milik klien)
- Centang untuk dipakai di event ini → mengisi `frameIds`
- Urutan bisa digeser (menentukan urutan carousel yang dilihat tamu)
- Tombol `+ Upload Bingkai Baru` → ke `/admin/frames/new`
- Indikator batas paket: `2 / 3 bingkai terpakai`

### Tab: Sesi
Semua field `SessionConfig`, dengan bahasa manusia:

| Kontrol | Label |
|---|---|
| `countdownSeconds` | "Hitung mundur sebelum jepret" — 0/3/5/10 detik |
| `autoContinue` | "Lanjut otomatis ke foto berikutnya" |
| `mirror` | "Tampilkan kamera seperti cermin" |
| `maxRetakes` | "Berapa kali tamu boleh mengulang tiap foto" (0–5) |
| `revealMs` | "Durasi animasi cetak" — slider 0–15 detik + tombol pratinjau |
| `cameraAspect` | "Bentuk kamera" — Kotak / Potret |
| `guestNameRequired` | "Wajib isi nama sebelum mulai" |
| `voice.enabled` + `maxSeconds` | "Pesan suara" + durasi maksimal |
| `moments.enabled` | "Galeri momen tamu" |
| `share.*` | Centang tombol berbagi mana yang muncul |

### Tab: Teks
Override `CopyOverrides` — tampilkan **hanya yang masuk akal diubah**
(lihat dokumen 01-F): label langkah, judul & ajakan pesan suara, teks
tombol utama, sapaan galeri. Sisanya pakai default, jangan ditampilkan
supaya tidak membanjiri klien.

Tiap field menampilkan nilai default sebagai placeholder — kosong berarti
pakai default.

### Tab: Publish
- Editor `slug` + cek ketersediaan real-time
- Pratinjau URL final: `glyka.app/e/{slug}`
- **QR code** yang bisa diunduh (PNG & SVG, untuk dicetak di meja)
- Tombol `Publikasikan` (draft → live) dengan checklist pra-publish:
  - [ ] Minimal 1 bingkai dipilih
  - [ ] Nama & tanggal terisi
  - [ ] Kontras warna lolos
  - [ ] Kuota masih tersedia
- Tombol `Akhiri Event` (live → ended): sesi baru ditolak, galeri tetap
  bisa dibuka

---

## 4. Pustaka Bingkai — `/admin/frames`

Grid semua bingkai: milik klien + bawaan Glyka (ditandai badge).
Aksi: Duplikat, Edit, Hapus (tolak kalau sedang dipakai event `live`).

---

## 5. Upload & Editor Bingkai — inti pekerjaan

### `/admin/frames/new` — alur upload

```
1. Drop PNG
   ↓
2. Validasi: PNG? punya alpha? ukuran wajar? (maks ±10MB, maks 4000px)
   ↓
3. Server: baca dimensi + sampling warna kertas + DETEKSI SLOT
   ↓
4. Tampilkan hasil deteksi di atas gambar (kotak semi-transparan bernomor)
   ↓
5. Klien konfirmasi ATAU perbaiki manual
   ↓
6. Simpan sebagai Frame
```

**Umpan balik yang harus jelas di langkah 4:**

| Hasil deteksi | Yang ditampilkan |
|---|---|
| 1–5 slot ditemukan | "Ditemukan 3 area foto" + kotak bernomor + "Sudah benar?" |
| 0 slot | "Tidak menemukan area foto transparan." + tawarkan mode manual + jelaskan PNG harus punya area transparan |
| > 8 slot | Kemungkinan noise — tampilkan semua, sarankan hapus yang kecil |
| Slot sangat kecil | Tandai kuning: "Area ini kecil, yakin ini tempat foto?" |

### `/admin/frames/[id]` — editor slot

Kanvas menampilkan PNG dalam ukuran skala; koordinat disimpan dalam
**piksel asli PNG**, bukan piksel layar (konversi lewat faktor skala).

Kemampuan:
- Geser & resize kotak slot (drag handle di 8 titik)
- Tambah slot manual, hapus slot
- Urutkan slot (menentukan foto ke-1, ke-2, … — sudah benar urut atas-bawah
  dari auto-deteksi, tapi harus bisa diubah)
- Input angka presisi (x/y/w/h) untuk penyesuaian halus
- Tombol `Deteksi Ulang Otomatis` (buang perubahan manual)
- **Pratinjau isi**: tempel foto contoh ke tiap slot supaya klien lihat
  hasil akhirnya — pakai `compose()` yang sama dengan playground

### Editor layer teks

Di editor bingkai yang sama, tab kedua:
- Tambah layer → pilih token (`{{names}}`, `{{date}}`, …) atau teks bebas
- Geser posisi di kanvas, atur ukuran/warna/perataan/spasi huruf
- Pilih font display/mono
- Pratinjau memakai data event nyata (kalau dibuka dari konteks event)

> Ini yang mengubah bisnis dari jasa desain jadi SaaS (lihat dokumen
> 01-C2). Prioritaskan setelah editor slot jadi.

---

## 6. Galeri Momen — `/admin/events/[id]/moments`

Yang klien butuhkan setelah acara selesai:
- Grid semua momen + nama tamu + waktu
- Filter: semua / ada video / tanpa video
- **Unduh massal sebagai ZIP** (fitur paket besar) — ini alasan utama
  panitia mau bayar lebih
- Hapus momen (moderasi — tamu bisa saja mengunggah yang tidak pantas)
- Indikator pemakaian penyimpanan

---

## 7. Akun & Paket — `/admin/account`

- Paket aktif, masa berlaku
- `stripUsed / stripQuota` + grafik pemakaian harian
- Penyimpanan terpakai
- Tombol `Tambah Kuota` (nanti mengarah ke pembayaran)

---

## 8. Login — `/admin/login`

**Fase ini:** satu password dari environment variable, cookie session
sederhana. Cukup untuk melindungi admin lokal.

**Belum:** registrasi mandiri, reset password, multi-user, OAuth.
Semua itu menunggu database (lihat dokumen 05).

---

## Catatan UX yang menentukan berhasil-tidaknya

1. **Autosave sebagai draft.** Klien akan menutup tab di tengah jalan.
   Kehilangan 20 menit kerja = klien hilang.
2. **Preview harus responsif seketika.** Kalau ganti warna butuh 2 detik
   untuk terlihat, klien tidak akan bereksperimen.
3. **Jangan pernah tampilkan istilah teknis.** Bukan "ink/paper/flash",
   tapi "latar halaman / teks utama / aksen". Bukan "slot", tapi "area
   foto". Bukan "textLayer", tapi "tulisan di bingkai".
4. **Setiap batas paket harus terlihat sebelum ditabrak**, bukan muncul
   sebagai error setelah klien mengerjakan sesuatu.
5. **Tombol "kembalikan ke semula"** di tiap bagian tema — klien berani
   bereksperimen kalau tahu bisa membatalkan.
