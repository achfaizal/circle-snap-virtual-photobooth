# Alur Playground — Aturan Main

Dokumen ini adalah **patokan** untuk membuat template baru. Semua template
memakai alur, struktur, dan kontrak data yang **sama persis** — yang boleh
berbeda hanya desainnya (warna, font, ornamen, bingkai).

Kalau sebuah template butuh alur yang berbeda, itu bukan template baru —
itu produk baru, dan harus dibicarakan dulu.

---

## 1. Peta singkat

```
                        ┌──────────────────────────┐
   tamu buka /e/{slug}  │  FASE 0 · Selamat Datang │  gerbang + isi nama
                        └────────────┬─────────────┘
                                     │
                        ┌────────────▼─────────────┐
                        │  FASE 1 · Pilih Bingkai  │  step = "bingkai"
                        └────────────┬─────────────┘
                                     │
                        ┌────────────▼─────────────┐
                        │  FASE 2 · Sesi Foto      │  step = "potret"
                        └────────────┬─────────────┘
                                     │
                        ┌────────────▼─────────────┐
                        │  FASE 3 · Pesan Suara    │  step = "suara"  (bisa dimatikan)
                        └────────────┬─────────────┘
                                     │
                        ┌────────────▼─────────────┐
                        │  FASE 4 · Hasil & Bagikan│  step = "struk"
                        └────────────┬─────────────┘
                                     │
                          ┌──────────▼──────────┐
                          │  OUTPUT (3 berkas)  │
                          └─────────────────────┘
```

Empat nilai `step` itu didefinisikan di `lib/store.ts`:

```ts
export type Step = "bingkai" | "potret" | "suara" | "struk";
```

Fase 0 bukan `step` — ia layar pembuka sebelum sesi dimulai.

---

## 2. Fase demi fase

### FASE 0 — Selamat Datang

**Tujuan:** memastikan sesi boleh dibuka, lalu mengambil nama tamu.

**Gerbang (dicek berurutan, di `components/EventBooth.tsx`).** Kalau salah
satu terpenuhi, tamu berhenti di sini dan sesi foto tidak bisa dibuka:

| Kondisi | Arti | Galeri Momen |
| --- | --- | --- |
| `status = "draft"` | Belum dipublikasikan panitia | tertutup |
| `status = "ended"` | Panitia menyudahi acara | **tetap terbuka** |
| `status = "expired"` | Masa aktif paket habis | tertutup |
| `sisa kuota = 0` | Strip terpakai semua | tertutup |

Bedanya `ended` vs `expired` disengaja: `ended` keputusan panitia (tamu
masih boleh melihat-lihat hasil), `expired` batas komersial (semua
terkunci).

**Yang tampil:**

- Sapaan besar (`brandLabel`) — mis. "Happy Engagement"
- Nama acara (`names`) dengan font display template
- Tanggal (`dateDisplay`)
- Sambutan (`greeting`)
- Monogram / logo / foto acara (opsional, lihat §4)
- Kolom nama tamu + tombol mulai
- Tombol "Lihat Momen" (kalau galeri aktif)

**Input tamu:** nama. Wajib atau tidak diatur `session.guestNameRequired`.

---

### FASE 1 — Pilih Bingkai (`step = "bingkai"`)

**Tujuan:** tamu memilih tata letak strip.

- Menampilkan carousel `event.frameIds` **berurutan** — urutan array =
  urutan yang dilihat tamu.
- Tiap kartu menampilkan: PNG bingkai, nama, jumlah slot, ukuran cetak,
  dan keterangan singkat.
- Yang tampil di sini **PNG mentah** — layer teks belum digambar. Nama &
  tanggal baru muncul saat compositing di Fase 4. Ini disengaja, tapi
  artinya bingkai harus tetap terbaca komposisinya walau teksnya kosong.

> ⚠️ **`frameIds` kosong = tamu buntu total.** Mereka sampai di layar ini
> dan tidak menemukan apa pun. Template WAJIB membawa minimal satu
> bingkai.

---

### FASE 2 — Sesi Foto (`step = "potret"`)

**Tujuan:** mengisi setiap slot bingkai dengan satu jepretan.

Jumlah jepretan = **jumlah slot** pada bingkai yang dipilih. Bingkai 3
slot berarti 3 kali jepret, berselang dengan layar konfirmasi.

Yang mengatur perilakunya (`SessionConfig`):

| Setelan | Nilai | Keterangan |
| --- | --- | --- |
| `countdownSeconds` | `0 \| 3 \| 5 \| 10` | 0 = langsung jepret |
| `autoContinue` | boolean | lanjut sendiri ke slot berikutnya |
| `mirror` | boolean | cermin, seperti kamera depan HP |
| `maxRetakes` | angka | batas ulang per sesi |
| `revealMs` | ms | animasi "cetak"; 0 = tanpa animasi |
| `filterCss` | string CSS | dipakai **bersama** preview & hasil |
| `cameraAspect` | `1:1 \| 4:5 \| 3:4` | rasio pengambilan |

> `filterCss` sengaja satu string yang dipakai di dua tempat — preview
> `<video>` dan `ctx.filter` saat compositing. Kalau dipisah, yang dilihat
> tamu tidak sama dengan yang tercetak.

**Butuh izin kamera.** Kalau ditolak, tamu tidak bisa lanjut.

---

### FASE 3 — Pesan Suara (`step = "suara"`) — opsional

**Tujuan:** tamu merekam ucapan singkat.

- Dimatikan lewat `session.voice.enabled` → tamu langsung lompat ke Fase 4.
- Durasi maksimal `session.voice.maxSeconds`, dibatasi plafon paket
  (`Subscription.maxVoiceSeconds`).
- Butuh izin mikrofon.
- Hasil rekaman dipakai membuat **kartu video** di Fase 4.

---

### FASE 4 — Hasil & Bagikan (`step = "struk"`)

**Tujuan:** menyusun output, mengklaim kuota, menyimpan ke galeri.

Tiga hal terjadi di sini, berurutan:

1. **Klaim kuota** — `POST /api/quota/claim`. Server yang memutuskan,
   bukan HP tamu. Klaim ini atomik (`mutateOne`), jadi dua tamu yang
   menekan bersamaan saat sisa kuota 1 tidak bisa lolos berdua.
2. **Compositing** — `compose()` menggambar strip final (lihat §3).
3. **Simpan ke galeri Momen** — otomatis, tidak menunggu tamu menekan
   unduh. Supaya "semua yang sudah berfoto" benar-benar tercatat.

Tombol yang tampil diatur `session.share`: `downloadPng`, `downloadJpg`,
`downloadVideo`, `instagram`, `whatsapp`, `nativeShare`.

> ⚠️ Mematikan **semua** tombol unduh membuat tamu tidak bisa membawa
> pulang apa pun. Visual Builder memperingatkan ini di langkah Ringkasan.

---

## 3. Output — apa yang benar-benar dihasilkan

| # | Berkas | Isi | Kapan |
| --- | --- | --- | --- |
| 1 | **Strip PNG/JPG** | kertas → foto per slot → PNG bingkai → layer teks | tiap sesi |
| 2 | **Kartu video** | strip + gelombang suara + audio tamu | kalau ada rekaman |
| 3 | **Entri Momen** | foto + video + nama tamu | otomatis |

### Urutan menggambar strip (`lib/compositor.ts`)

```
1. Latar        → template.paper  (warna dasar kertas)
2. Foto tamu    → digambar ke tiap Slot {x, y, w, h}, kena filterCss & mirror
3. PNG bingkai  → ditumpuk di atas foto (bagian transparan = lubang foto)
4. Layer teks   → drawTextLayers(), token diganti nilai asli
```

Ukuran kanvas = `template.width × template.height`, yaitu **dimensi asli
PNG bingkai**. Tidak ada penskalaan paksa.

### Token teks

Layer teks pada bingkai boleh memakai token berikut — diganti otomatis
dari Detail Acara (`lib/event.ts` → `tokensFor`):

| Token | Sumber |
| --- | --- |
| `{{names}}` | `identity.names` |
| `{{date}}` | `identity.dateDisplay` |
| `{{venue}}` | `identity.venue` |
| `{{hashtag}}` | `identity.hashtag` |
| `{{code}}` | `event.slug` |

> **Tidak ada token untuk sapaan (`brandLabel`).** Label acara di bingkai
> ("ENGAGEMENT", "WEDDING") harus ditulis sebagai teks tetap — artinya
> satu template = satu jenis acara.

---

## 4. Yang harus disediakan sebuah template

Ini kontraknya. Semua wajib kecuali yang ditandai opsional.

### 4.1 Folder bundel

Satu folder di `public/templates/<Nama>/` berisi seluruh berkasnya.
Namanya dicatat di field `folder`. Lihat `public/templates/README.md`.

### 4.2 Bingkai — minimal 1, disarankan 3

Disarankan tiga varian: **1 foto**, **2 foto**, **3 foto** — supaya tamu
punya pilihan tanpa membingungkan.

Tiap bingkai butuh:

| Bagian | Aturan |
| --- | --- |
| **PNG** | Lubang foto **benar-benar transparan** (alpha 0), bukan putih |
| **Tanpa tulisan tercetak** | Nama/tanggal jangan dicetak ke gambar |
| `slots[]` | `{x, y, w, h}` px, terdeteksi otomatis dari area transparan |
| `textLayers[]` | Pakai token; `locked: true` supaya klien tidak menggeser |
| `paper` | Warna dasar di balik foto |
| `width` / `height` | Diambil dari dimensi PNG |

> Pelajaran mahal: bingkai `ENG*.png` awalnya punya "Sal & Sal" tercetak
> permanen. Menghapusnya butuh pipeline pengolahan citra sendiri
> (deteksi komponen, pelindung cincin, pemulihan lubang alpha). **Jauh
> lebih murah mendesain PNG tanpa teks sejak awal.**

### 4.3 Tema playground

**Sembilan token warna** (`ThemeColors`) — semuanya wajib terisi:

| Token | Dipakai untuk |
| --- | --- |
| `ink` | latar utama layar |
| `film` | permukaan sekunder / kartu |
| `edge` | garis tepi |
| `smoke` | teks sekunder |
| `paper` | teks utama & tombol utama |
| `flash` | aksen / sorotan |
| `live` | tombol rekam & indikator aktif |
| `brandPurple` | gradasi tombol (awal) |
| `brandGold` | gradasi tombol (akhir) |

**Font:** `fontDisplayId` (judul) — harus sudah terdaftar di
peta font di `lib/adapters/legacy.ts`. Menambah font baru butuh **3 langkah sinkron**:
impor `next/font`, variabel `--canvas-font-*`, dan entri katalog.

**Efek latar** (`ThemeEffects`): `petals {enabled, count}`, `blobs`,
`confetti`, `bokeh?`, `sparkle?`.

**Kartu video** (`VideoCardTheme`): `bg`, `ink`, `smoke`, `waveActive`,
`waveTrack`, `headingGradient [awal, tengah, akhir]`.

**Aset bersama** (opsional): `decorAssetId` (ornamen sudut),
`videoBgAssetId` (latar kartu video).

**Elemen** (`ThemeElements`, opsional): `buttonShape`
(`pill | rounded | square`), `monogram`, `heroPhoto`.

### 4.4 Data contoh (`sample`)

Nama, tanggal, lokasi, tagar, sambutan, dan sapaan **fiktif** untuk
pratinjau di menu Template. Ini yang dilihat calon pembeli sebelum
memilih.

> Hanya untuk pratinjau. Saat template dipasang, identitas acara klien
> **tidak** ditimpa.

---

## 5. Aturan yang tidak boleh dilanggar

1. **Struktur layar tetap.** Empat fase, urutan itu. Yang boleh berbeda:
   warna, font, ornamen, bingkai, teks. Bukan tata letaknya.

2. **Klien hanya mengubah isi, bukan desain.** Nama & tanggal terisi
   otomatis lewat token. Warna/font/posisi terkunci mengikuti template.
   Kalau klien butuh tampilan lain → **template baru**, bukan tombol baru
   di Visual Builder.

3. **Satu template = satu jenis acara.** Karena label acara di bingkai
   adalah teks tetap.

4. **Kuota diputuskan server.** Jangan pernah memindahkan penghitungan
   strip ke sisi klien.

5. **Lubang foto harus transparan.** Kalau putih-opak, foto tamu
   tertutup bingkai.

6. **Bingkai tanpa tulisan tercetak.** Selalu pakai layer teks bertoken.

7. **Perubahan tema tidak boleh merusak event lama.** Field baru wajib
   opsional dengan default yang menyamai perilaku sebelumnya.

---

## 6. Daftar periksa template baru

Desain:

- [ ] Folder `public/templates/<Nama>/` dibuat
- [ ] PNG bingkai 1/2/3 foto, lubang transparan, **tanpa tulisan**
- [ ] Ornamen sudut & latar kartu video (kalau ada)

Data:

- [ ] Aset didaftarkan di `data/assets.json` (`clientId: null`)
- [ ] Bingkai didaftarkan di `data/frames.json` — `slots` + `textLayers`
      bertoken + `locked: true`
- [ ] Entri baru di `PLAYGROUND_TEMPLATES`
      (`lib/services/playgroundTemplates.ts`): 9 warna, font, efek,
      `videoCard`, `folder`, `sample`, `frameIds`

Uji — **jalankan sesi tamu sungguhan sampai keluar cetakan**, jangan
berhenti di pengecekan tipe:

- [ ] Pratinjau di menu Template memakai data `sample`
- [ ] Pasang template → 3 bingkai ikut terpasang
- [ ] Nama & tanggal klien muncul benar di strip
- [ ] Nama contoh template **tidak** bocor ke acara klien
- [ ] Foto tamu terlihat penuh, tidak tertutup bingkai
- [ ] Teks tidak menabrak foto, ornamen, atau tepi kertas
- [ ] Kartu video terbaca

---

## 7. SOP — tata cara klien memakai playground

Bagian sebelumnya menjelaskan apa yang dialami **tamu**. Bagian ini
prosedur untuk **klien/panitia**: dari beli sampai acara selesai.

### Tahap A — Daftar & beli paket

| # | Langkah | Di mana | Catatan |
| --- | --- | --- | --- |
| A1 | Daftar akun | `/admin/register` | Pilih **Acara Sendiri** atau **Vendor/EO**. Wajib: nama, WhatsApp, email, password. Vendor + nama usaha. |
| A2 | Buat acara pertama | Dashboard → **Buat Event** | Wizard menanyakan **paket** di sini — paket menentukan kuota strip & jatah acara. |
| A3 | Bayar | Transfer manual | Kirim bukti ke WhatsApp. Staff menandai lunas; kuota aktif setelah itu. |

> **Acara Sendiri = 1 acara seumur akun.** Vendor/EO boleh beberapa,
> sebanyak jatah paketnya.

### Tahap B — Menyiapkan tampilan

Urutan ini disarankan, bukan dipaksa sistem. Tapi memilih template
**lebih dulu** menghemat pekerjaan: template memasang warna, font, dan
bingkai sekaligus.

| # | Langkah | Menu | Yang dikerjakan |
| --- | --- | --- | --- |
| B1 | Pilih template | **Template** | Klik kartu → pratinjau di layar HP → **Pakai Template Ini**. Bingkainya ikut terpasang otomatis. |
| B2 | Isi detail acara | **Detail Acara** | Nama ditampilkan, tanggal, **jadwal mulai**, lokasi, tagar, sapaan, sambutan. |
| B3 | Atur isi layar | **Visual Builder** | 6 langkah: Selamat Datang → Bingkai → Sesi Foto → Pesan Suara → Hasil → Ringkasan. **Hanya isi**, bukan desain. |
| B4 | Periksa bingkai | **Bingkai** | Pastikan minimal 1 terpasang; urutan di sini = urutan yang dilihat tamu. |

> **Nama & tanggal tidak perlu diketik ulang di bingkai.** Diisi sekali di
> Detail Acara, otomatis tercetak di hasil foto lewat token (§3).

### Tahap C — Publikasi

| # | Langkah | Catatan |
| --- | --- | --- |
| C1 | Buka menu **Publish** | Ada checklist 5 poin |
| C2 | Lengkapi checklist | Tombol Publikasikan terkunci sampai semuanya hijau |
| C3 | Tekan **Publikasikan** | Status `draft` → `live` |
| C4 | Ambil QR & link | Unduh QR (PNG) atau salin link `/e/{slug}` |

**Checklist wajib** (dari `EventPublishEditor.tsx`):

1. Minimal 1 bingkai terpasang
2. Nama yang ditampilkan sudah diisi
3. Tanggal sudah diisi
4. Sambutan sudah diisi
5. **Jadwal mulai (tanggal & jam sungguhan) sudah diisi**

> ⏰ **Masa aktif 7 hari dihitung dari jadwal mulai**, bukan dari kapan
> ditekan Publikasikan. Salah isi jadwal = acara kedaluwarsa sebelum
> waktunya. Setelah acara benar-benar berjalan (`live` **dan** waktunya
> sudah lewat), jadwal **tidak bisa** diubah lagi.

### Tahap D — Hari-H

| # | Langkah | Catatan |
| --- | --- | --- |
| D1 | Pasang QR di lokasi | Meja tamu, standing banner, atau layar |
| D2 | Pastikan sinyal memadai | Playground jalan di browser HP tamu |
| D3 | Pantau kuota | Notifikasi lonceng menyala saat sisa ≤ 20% |
| D4 | Kalau kuota menipis | **Paket & Billing** → beli Top-up Strip |

**Yang perlu diberitahukan ke tamu** (cukup ini):

1. Pindai QR → terbuka di browser, **tidak perlu pasang aplikasi**
2. Isi nama → **Mulai sesi foto**
3. Pilih bingkai
4. Berfoto sesuai jumlah slot bingkai (izinkan **kamera**)
5. Rekam pesan suara — kalau diaktifkan (izinkan **mikrofon**)
6. Unduh hasil / bagikan ke media sosial

> Satu sesi = satu strip = satu kuota. Tamu boleh mengulang jepretan
> sebelum sesi selesai tanpa memotong kuota tambahan.

### Tahap E — Setelah acara

| # | Langkah | Menu |
| --- | --- | --- |
| E1 | Lihat & unduh semua foto tamu | **Momen** |
| E2 | Tutup acara | **Publish** → ubah status ke `ended` |

> `ended` = sesi foto baru ditolak, **galeri Momen tetap terbuka** supaya
> tamu masih bisa melihat hasilnya. Beda dari `expired` (masa aktif
> habis) yang mengunci semuanya.

### Kalau ada masalah

| Gejala | Sebab paling mungkin | Tindakan |
| --- | --- | --- |
| Tamu lihat "belum bisa dibuka" | Status masih `draft` | Publikasikan lewat menu Publish |
| Tamu buntu di Pilih Bingkai | `frameIds` kosong | Pasang minimal 1 bingkai |
| Sesi ditolak padahal baru mulai | Kuota habis | Top-up di Paket & Billing |
| Semua terkunci, galeri juga | `expired` — lewat 7 hari | Perpanjang masa aktif |
| Nama di hasil foto salah | Detail Acara belum diperbarui | Ubah di Detail Acara, tidak perlu sentuh bingkai |
| Kamera tidak jalan | Izin ditolak / bukan HTTPS | Izinkan kamera; pastikan link `https` |

---

## 8. Rujukan kode

| Bagian | Berkas |
| --- | --- |
| Urutan fase | `lib/store.ts` (`Step`) |
| Gerbang & perutean layar | `components/EventBooth.tsx` |
| Layar per fase | `components/StepFrame · StepShoot · StepVoice · StepResult` |
| Compositing & token | `lib/compositor.ts` |
| Kontrak template | `lib/services/playgroundTemplates.ts` |
| Model bingkai | `lib/models/frame.ts` |
| Model tema | `lib/models/theme.ts` |
| Perilaku sesi | `lib/models/event.ts` (`SessionConfig`) |
| Teks bawaan | `lib/copy.ts` |
| Klaim kuota | `app/api/quota/claim/route.ts` |
| Bundel berkas | `public/templates/README.md` |
