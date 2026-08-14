# Blueprint 01 — Inventaris Playground

> Daftar lengkap **semua yang sekarang hardcoded** di playground dan harus
> bisa diatur dari admin. Ini adalah daftar pekerjaan yang sesungguhnya.
>
> Kolom **Level** menandai siapa yang seharusnya mengatur:
> - `KLIEN` — klien atur sendiri di admin
> - `GLYKA` — hanya kita (internal/superadmin), klien tidak boleh utak-atik
> - `SISTEM` — tetap di kode, bukan konfigurasi

---

## A. Identitas & Data Acara

Sumber: [`lib/event.ts`](../../lib/event.ts) → `EventConfig`

| Field | Nilai sekarang (contoh) | Level | Catatan untuk admin |
|---|---|---|---|
| `code` | `ENGAGEMENT-SALFAIZAL` | KLIEN | Jadi `slug` URL. Harus unik global, validasi karakter, cek bentrok |
| `names` | `Salma & Faizal` | KLIEN | Dipakai di header, kartu video, token `{{names}}` |
| `date` | `8 Agustus 2026` | KLIEN | **Sekarang string bebas** — sebaiknya jadi date picker + format tampilan terpisah |
| `venue` | `Gedung Pernikahan` | KLIEN | Saat ini hampir tidak tampil di UI, cuma token `{{venue}}` |
| `hashtag` | `#SalmaFaizal` | KLIEN | Dipakai di teks share & kartu video |
| `quota` | `200` | **GLYKA** | ⚠️ Klien TIDAK boleh edit — ini yang dijual. Harus datang dari paket/langganan |
| `greeting` | paragraf sambutan | KLIEN | Textarea, batasi panjang (sekarang muat ~3 baris di HP) |
| `brandLabel` | `Happy Engagement` | KLIEN | Sapaan besar. Default `Happy Wedding` kalau kosong |
| `allowedTemplates[]` | `["eng-1","eng-2","eng-3"]` | KLIEN | Pilih dari pustaka bingkai miliknya |
| `voiceNoteEnabled` | `true` | KLIEN | Toggle |
| `maxVoiceSeconds` | `15` | KLIEN | Slider, tapi **batasi maksimum oleh paket** (durasi = ukuran file = biaya storage) |

**Belum ada, tapi dibutuhkan:**

| Field baru | Kenapa perlu |
|---|---|
| `id` | Identitas stabil yang tidak berubah walau slug diganti |
| `clientId` | Pemilik event — dasar isolasi data antar-klien |
| `status` | `draft` / `live` / `ended` — sekarang semua event otomatis live |
| `createdAt` / `updatedAt` | Audit dasar |
| `activeFrom` / `activeUntil` | Masa aktif event |

---

## B. Tema Visual

Sumber: `EventTheme` di [`lib/event.ts`](../../lib/event.ts), diterapkan lewat
`themeVars()` sebagai CSS custom property.

### B1. Warna (9 token)

| Token | Peran sebenarnya | Nilai wedding | Nilai engagement |
|---|---|---|---|
| `ink` | Latar halaman **dan** warna teks di atas tombol terang | `#2B0508` | `#F3F3E9` |
| `film` | Latar sekunder (kartu, placeholder) | `#3A0A10` | `#EAE7D8` |
| `edge` | Garis tepi, ring, pemisah | `#8C6A3F` | `#C9B78A` |
| `smoke` | Teks sekunder / redup | `#D9BE95` | `#6B5D3F` |
| `paper` | Teks utama **dan** latar tombol sekunder | `#FDF6EC` | `#2E2A1E` |
| `flash` | Aksen utama, fokus, highlight | `#C9A66B` | `#A98D4A` |
| `live` | Status merekam / bahaya | `#C0392B` | `#A63B2E` |
| `brandPurple` | Ujung awal gradasi tombol utama | `#5C1220` | `#7A5E28` |
| `brandGold` | Ujung akhir gradasi | `#C9A66B` | `#D8C08A` |

> ⚠️ **Jebakan untuk editor tema:** `ink` dan `paper` bukan sekadar
> "latar" dan "teks". Keduanya **bertukar peran** antara tema gelap dan
> terang (lihat komentar panjang di `lib/event.ts` pada tema engagement).
> Kalau admin cuma menyediakan color picker polos, klien akan membuat
> kombinasi tidak terbaca. **Admin wajib punya pemeriksa kontras**, atau
> lebih baik: klien pilih *preset* (gelap/terang) lalu sesuaikan aksen.

**Level:** KLIEN, tapi lewat editor yang dipandu — bukan 9 color picker mentah.

### B2. Tipografi

| Item | Sekarang | Level | Masalah |
|---|---|---|---|
| Font display | `--font-playfair` (opsional per event) | KLIEN | **Cuma 3 font tersedia** — di-`import` statis di [`app/layout.tsx`](../../app/layout.tsx): Plus Jakarta Sans, Space Mono, Playfair Display |
| Font mono | Space Mono (tetap) | GLYKA | Belum bisa diganti per event |
| `--canvas-display` / `--canvas-mono` | diekspos di `<html>` | SISTEM | Trik supaya canvas bisa menggambar teks dengan font yang sama persis. **Jangan diubah tanpa paham** — lihat komentar di `layout.tsx` |

**Pekerjaan:** buat katalog font (mis. 10–15 pilihan Google Fonts) yang
di-load dinamis, bukan 3 yang di-hardcode.

### B3. Dekorasi & Aset

| Aset | Sekarang | Level |
|---|---|---|
| `decorDir` → `decor-tl.png` | Satu PNG, dipantulkan ke 4 sudut lewat CSS `-scale-x/y-100` | KLIEN (upload) |
| `videoBg` → `bg-video.png` | Latar penuh 1080×1920 untuk kartu video | KLIEN (upload) |
| Overlay bingkai | PNG per bingkai | KLIEN (upload) |

Semua sekarang **ditaruh manual** ke `public/templates/{Nama Folder}/`.
Harus jadi sistem upload — lihat dokumen 04.

---

## C. Bingkai (Frame / Template)

Sumber: [`lib/templates.ts`](../../lib/templates.ts) → `Template`

| Field | Contoh | Level | Cara pengisian di admin |
|---|---|---|---|
| `id` | `eng-1` | SISTEM | Auto-generate |
| `name` | `Satu Foto Botanical` | KLIEN | Input teks |
| `blurb` | deskripsi 1 kalimat | KLIEN | Input teks, tampil di carousel pemilihan |
| `width` / `height` | `1080 × 1920` | SISTEM | **Auto dari dimensi PNG yang diupload** |
| `printSize` | `3.6 × 6.5"` | SISTEM/KLIEN | Bisa dihitung otomatis dari px (asumsi 300dpi), boleh dioverride |
| `overlay` | path PNG | KLIEN | Hasil upload |
| `paper` | `#F3F3E9` | SISTEM | **Auto-sampling** dari warna dominan PNG (sudah terbukti akurat saat analisis ENG1-3) |
| `slots[]` | `{x,y,w,h}` per lubang | KLIEN | **Auto-deteksi + editor geser** ← inti pekerjaan |
| `textLayers[]` | array layer teks | KLIEN | Editor terpisah (lihat C2) |

### C1. Deteksi Slot — inti teknis

Yang sudah terbukti bekerja (dipakai untuk S4–S7 dan ENG1–3):

1. Baca PNG sebagai RGBA
2. Buat mask boolean `alpha < 10` (toleransi anti-aliasing)
3. Connected-components (8-connectivity) untuk menemukan region transparan
4. Buang region kecil (`area < 5000px`) sebagai noise
5. Ambil bounding box tiap region
6. Urutkan atas→bawah berdasarkan `y`

**Kasus yang harus ditangani admin:**

| Kasus | Contoh nyata | Penanganan |
|---|---|---|
| Lubang transparan normal | S1–S7, ENG1–3 | Auto-deteksi jalan |
| Slot berupa kotak putih opak (bukan transparan) | dugaan awal ENG1-3, ternyata tidak | Fallback: deteksi region near-white, atau minta user gambar manual |
| Teks desain menimpa lubang | ENG3 slot ke-2 (tulisan "SAL & SAL" masuk ke area foto) | Bounding box tetap benar, cukup beri peringatan visual |
| Sudut membulat | semua bingkai | Fill ratio 0.95–0.99, masih terdeteksi benar |
| Tidak ada lubang sama sekali | user salah upload | Tolak dengan pesan jelas + tawarkan mode manual |

**Catatan implementasi:** deteksi ini harus pindah dari Python ke Node.
Kandidat pustaka: `sharp` (cepat, native) atau `pngjs` + implementasi
connected-component sendiri (murni JS, tidak ada binary — lebih aman di
serverless).

### C2. Layer Teks Dinamis

`TextLayer` punya 11 properti: `text`, `x`, `y`, `size`, `align`, `color`,
`face`, `weight`, `tracking`, `uppercase`, `maxWidth`.

Token yang tersedia: `{{names}}`, `{{date}}`, `{{venue}}`, `{{hashtag}}`,
`{{code}}` — di-resolve saat compositing dari data event.

**Kondisi sekarang:** SEMUA bingkai aktif punya `textLayers: []` (kosong),
karena bingkai Sal&Sal sudah punya teks tercetak di dalam PNG-nya.

**Ini keputusan produk penting:**

| Pendekatan | Konsekuensi bisnis |
|---|---|
| Teks dicetak di dalam PNG (yang dipakai sekarang) | Tiap acara butuh desain PNG baru → **jualan jasa desain** |
| Teks sebagai `textLayers` | Satu PNG melayani semua acara → **jualan SaaS** ✅ |

README project ini sudah menyebut prinsip #1: *"Nama pengantin tidak
dibakar ke dalam PNG"* — tapi praktiknya sekarang justru sebaliknya.
**Admin harus mendorong klien ke pendekatan `textLayers`**, mis. dengan
menyediakan pustaka bingkai polos (tanpa teks) + editor teks visual.

---

## D. Perilaku Sesi

Sumber: [`lib/store.ts`](../../lib/store.ts) dan komponen langkah.

| Perilaku | Nilai | Lokasi | Status | Level |
|---|---|---|---|---|
| Hitung mundur | `3` detik | `store.ts` `countdownFrom` | ⚠️ **kode mati** — `setCountdown` tidak pernah dipanggil UI | KLIEN |
| Lanjut otomatis antar foto | `true` | `store.ts` `autoContinue` | ⚠️ **kode mati** — `toggleAuto` tidak dipakai | KLIEN |
| Cermin (mirror) kamera | `true` | `store.ts` `mirror` | ⚠️ **kode mati** — `toggleMirror` tidak dipakai | KLIEN |
| Batas ulang foto per slot | `3` | `store.ts` `MAX_RETAKES` | konstanta hardcoded | KLIEN |
| Durasi animasi "print" | `15000` ms | `FrameAssembly.tsx` `REVEAL_MS` | konstanta hardcoded | KLIEN |
| Filter warna foto | 1 nilai tetap | `lib/filters.ts` `FILTER_CSS` | dulu 6 pilihan, sudah disederhanakan | KLIEN |
| Rasio kamera | `1 / 1` | `StepShoot.tsx` | inline style | KLIEN |
| Wajib isi nama tamu | selalu wajib | `WelcomeScreen.tsx` `canEnter` | hardcoded | KLIEN |
| Galeri Momen aktif | selalu aktif | — | hardcoded | KLIEN |
| Resolusi kamera diminta | ideal 1920×1440 | `lib/camera.ts` | bertingkat, sudah baik | SISTEM |

> **Temuan:** 5 aksi di store (`setCountdown`, `toggleAuto`, `toggleMirror`,
> `newSession`, dan sebelumnya `setFilter`) **didefinisikan tapi tidak pernah
> dipanggil** dari UI mana pun. Ini bukan kebetulan — ini persis daftar
> pengaturan yang dulu direncanakan tapi UI-nya tidak pernah dibuat.
> Sekarang tempat yang benar untuk pengaturan itu adalah **admin**, bukan
> UI tamu.

---

## E. Kartu Video Pesan Suara

Sumber: [`lib/video.ts`](../../lib/video.ts)

| Item | Nilai | Level | Catatan |
|---|---|---|---|
| Dimensi | `1080 × 1920` | SISTEM | Format Reels/TikTok, jangan diubah |
| Bitrate | `6.000.000` bps | GLYKA | Menentukan ukuran file → biaya storage |
| `BG` latar | `#FFFFFF` | KLIEN | ⚠️ **Hardcoded, tidak ikut tema event** |
| `INK` teks utama | `#1A1610` | KLIEN | ⚠️ Hardcoded |
| `FLASH` gelombang aktif | `#EC4899` (pink) | KLIEN | ⚠️ Hardcoded — **tidak cocok** dengan tema emas engagement |
| `SMOKE` teks redup | `#8A8478` | KLIEN | ⚠️ Hardcoded |
| `TRACK` gelombang pasif | `#E7E2D8` | KLIEN | ⚠️ Hardcoded |
| Gradasi judul | ungu→pink→emas | KLIEN | ⚠️ Hardcoded, warna brand Glyka lama |
| Jumlah bucket gelombang | `72` | SISTEM | |
| Posisi & ukuran strip | 2 mode: dengan/tanpa `bgVideo` | SISTEM | Sudah dikalibrasi manual, riskan diserahkan ke klien |
| Caption | `pesan suara dari {nama}` | KLIEN | Teks bisa dikustom |

> **Temuan penting:** kartu video **tidak mengikuti tema event sama
> sekali**. Warna gelombangnya pink Glyka, padahal tema acara emas. Saat
> ini tertutupi karena `bgVideo` custom menimpa sebagian besar tampilan —
> tapi klien yang tidak upload `bgVideo` akan dapat kartu video dengan
> warna yang tidak nyambung dengan playground-nya.

---

## F. Teks Antarmuka (Copy)

Semua teks Indonesia **hardcoded di dalam komponen**. Ini daftar yang
sudah teridentifikasi:

### F1. Layar Selamat Datang — `WelcomeScreen.tsx`
- `"Virtual Photobooth"` (label kecil)
- `"Nama kamu"` (placeholder input)
- `"Mulai sesi foto"` (tombol utama)
- `"Lihat Momen"` (tombol sekunder)
- Monogram inisial — dihitung otomatis dari `names` dipisah `&`

### F2. Header Sesi — `EventBooth.tsx`
- `STEP_LABEL`: `Pilih Bingkai` / `Sesi Foto` / `Pesan Suara` / `Selesai`
- Pesan kuota habis: *"Sesi foto belum bisa dibuka / Paket untuk acara ini sudah terpakai semua..."*

### F3. Pilih Bingkai — `StepFrame.tsx`
- `"Pilih bingkai ini"`
- Format info: `"{n} foto · {printSize}"`
- Catatan token otomatis (muncul hanya bila ada `textLayers`)

### F4. Sesi Foto — `StepShoot.tsx`
- aria-label: `"Jepret foto"`, `"Lanjut..."`, `"Bingkai sebelumnya/berikutnya"`
- Pesan error kamera — dari `lib/camera.ts` `describe()`, 5 varian

### F5. Pesan Suara — `StepVoice.tsx`
- Judul: `"Titip Pesan untuk {A} dan {B}"` ← **memecah `names` pakai `" & "`**, rapuh kalau format nama beda
- Paragraf ajakan (2 kalimat)
- `"Mulai merekam"` / `"Berhenti merekam"` / `"Rekam ulang"`
- `"{nn} / {max} detik"` / `"rekaman tersimpan"` / `"belum merekam"`
- `"Lanjut ke hasil"` / `"Lewati, langsung ke hasil"`
- Pesan error mikrofon

### F6. Hasil — `StepResult.tsx`
- `"Download"`, `"Unduh PNG"`, `"Unduh JPG"`, `"Unduh Video"`
- `"Instagram"`, `"WhatsApp"`, `"Lainnya"`
- `"Lihat Momen Lainnya"`
- Pesan status: *"Tersimpan {w}×{h} px"*, *"Video siap. Unggah ke Reels atau TikTok apa adanya."*, dsb.
- Instruksi share IG/WA

### F7. Galeri Momen — `MomentsGallery.tsx`
- `"Momen Tamu Lainnya"`
- `"memuat momen…"`
- *"Belum ada momen tersimpan. Jadilah tamu pertama yang muncul di sini!"*
- `"dari {nama}"`

**Rekomendasi:** jangan buru-buru bikin sistem i18n penuh. Cukup:
1. Kumpulkan semua string ke satu file (`lib/copy.ts`) sebagai default
2. Event boleh override sebagian (mis. sapaan, judul pesan suara)
3. Sisanya tetap default sampai ada permintaan nyata

Prioritas override yang paling masuk akal untuk klien: **F1, F2 (step
label), F5 (judul & ajakan pesan suara)**. Sisanya jarang perlu diubah.

---

## G. Animasi & Efek

| Efek | Lokasi | Nilai | Level |
|---|---|---|---|
| Kelopak jatuh | `WelcomeScreen.tsx` `PETALS` | 7 kelopak, posisi/warna/durasi hardcoded | KLIEN (on/off + jumlah) |
| Bola cahaya ambien | `layout.tsx` + `.blob` | 3 bola, warna dari tema | KLIEN (on/off) |
| Konfeti | `StepResult.tsx` | 24 potong, warna dari tema | KLIEN (on/off) |
| Butir film (grain) | `globals.css` `body::before` | opacity 0.035 | GLYKA |
| Cuci film (`develop`) | `globals.css` | 900ms | SISTEM |
| Print reveal | `globals.css` + `FrameAssembly` | 15 detik | KLIEN (durasi) |
| Kilat blitz | `globals.css` `flashfire` | 420ms | SISTEM |
| Transisi antar langkah | `globals.css` `step-enter` | 420ms | SISTEM |
| `prefers-reduced-motion` | `globals.css` | dihormati | SISTEM ✅ |

> ⚠️ **Jangan hapus `.step-enter`** tanpa membaca catatannya: animasi ini
> meninggalkan `transform` permanen (`fill-mode: both`) yang menciptakan
> containing-block baru — itu sebabnya semua modal **wajib** pakai
> `createPortal` ke `document.body`. Sudah pernah jadi bug nyata.

---

## H. Penyimpanan Momen

Sumber: [`lib/moments.ts`](../../lib/moments.ts) + `app/api/moments/*`

| Aspek | Sekarang | Level |
|---|---|---|
| Mode penyimpanan | Auto: `local` saat dev, `blob` saat di Vercel | SISTEM |
| Struktur path | `moments/{EVENT_CODE}/{uuid}.{png\|mp4\|json}` | SISTEM |
| Nama tamu | Sidecar `.json` terpisah | SISTEM |
| Batas ukuran | 30MB per file | GLYKA |
| Galeri | Grid masonry, video jadi thumbnail bila ada | KLIEN (on/off) |
| Unduh massal | **belum ada** | KLIEN (fitur paket besar) |
| Moderasi / hapus momen | **belum ada** | KLIEN — penting, tamu bisa upload foto tidak pantas |

---

## I. Hal yang Sudah Benar — Jangan Dirusak

Beberapa keputusan di kode sekarang lahir dari bug nyata. Saat refactor
untuk admin, **pertahankan**:

1. **`compose()` dipakai bersama preview & ekspor** — beda cuma `scale`.
   Ini yang membuat "hasil unduhan beda dengan di layar" mustahil terjadi.
2. **Sizing elemen replaced** (`<img>`/`<canvas>` pakai `max-height` +
   `width:auto`, tanpa properti `aspect-ratio` pada div pembungkus).
   Arah `aspect-ratio` + `max-height` + `width:auto` **rusak di Safari**.
3. **Modal lewat `createPortal(document.body)`** — lihat catatan G.
4. **`themeVars()` diterapkan ulang di komponen berportal** — CSS variable
   tidak menembus portal.
5. **Kuota dipotong sekali di struk**, dijaga `useRef` supaya React Strict
   Mode tidak memotong dua kali.
6. **momentId = UUID acak**, terpisah dari nomor struk. Nomor struk berasal
   dari localStorage tamu, jadi bentrok antar-device. Ini sudah pernah
   menyebabkan data tamu tertimpa dan hilang permanen.
7. **`allowOverwrite: true` + `allowedContentTypes` wildcard** di Vercel
   Blob — `MediaRecorder` mengirim contentType berikut parameter codec.
8. **Fallback berlapis di `openCamera()`** — turunkan resolusi, jangan
   tolak mentah.
