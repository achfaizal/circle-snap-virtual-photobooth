# Blueprint 10 — Struktur Menu & Field (detail layar)

> Turunan teknis dari [dokumen 09 (BRD)](09-brd-model-bisnis.md). Kalau 09
> menjawab "dijual apa & aturannya apa", dokumen ini menjawab
> **"layarnya apa saja, dan di tiap layar field apa yang diisi siapa"**.
>
> Dipakai sebagai daftar periksa saat membangun — bukan wacana.
> Disusun 12 Agustus 2026.

---

## 0. Notasi

**Status pembangunan:**

| Tanda | Arti |
|---|---|
| ✅ | Field ada di model **dan** UI-nya sudah jalan |
| 🔧 | Field ada di model, **UI belum ada** atau perlu diubah |
| 🆕 | **Field baru** — belum ada di model, harus ditambah |

**Siapa yang mengisi:**

| Tanda | Arti |
|---|---|
| 👤 | Klien (Personal/Vendor) mengetik sendiri |
| 🏢 | Staff Circle Snap |
| ⚙️ | Otomatis oleh sistem — **tidak pernah ada input manualnya** |

Kolom **W** = wajib diisi.

---

## 1. Peta menu lengkap

### 1.1 Panel Klien — `/admin/*`

Tab `?tab=` sudah **diganti rute sungguhan** — tiap layar punya URL sendiri
supaya bisa di-bookmark, di-refresh, dan dijaga satu `layout.tsx`
(pemeriksa kepemilikan event ada di sana, satu tempat untuk semuanya).

| Route | Layar | Status |
|---|---|---|
| `/admin` | Dashboard — **daftar event saja** | ✅ ada |
| `/admin?action=create` | Wizard buat event (modal) | ✅ ada |
| `/admin/events/[id]` | Ringkasan event (kuota, bingkai, status) | ✅ ada |
| `/admin/events/[id]/info` | Detail Acara | ✅ ada |
| `/admin/events/[id]/visual` | **Visual Builder** (5 sesi) | ✅ ada |
| `/admin/events/[id]/frames` | Bingkai | ✅ ada |
| `/admin/events/[id]/moments` | Momen | 🆕 belum ada |
| `/admin/events/[id]/publish` | Publish | ✅ ada |
| `/admin/frames` | Pustaka bingkai | ✅ ada |
| `/admin/billing` | Paket, kuota, top-up, riwayat | 🆕 belum ada |
| `/admin/account` | Profil & password | 🆕 belum ada |

### 1.2 Panel Staff — `/admin/staff/*` (semua 🆕)

| Route | Layar |
|---|---|
| `/admin/staff` | Ringkasan bisnis |
| `/admin/staff/clients` | Pendaftar — daftar & cari |
| `/admin/staff/clients/[id]` | Detail klien |
| `/admin/staff/plans` | Katalog paket |
| `/admin/staff/plans/[id]` | Editor paket |
| `/admin/staff/orders` | Transaksi |
| `/admin/staff/templates` | Pustaka template global |
| `/admin/staff/templates/[id]` | **Frame Builder** |

**Aturan akses:** seluruh `/admin/staff/*` wajib memeriksa
`client.isStaff === true`. Klien biasa yang mengetik URL-nya harus dapat
**404**, bukan 403 — jangan bocorkan bahwa halaman itu ada.

---

## 2. PANEL KLIEN

### 2.1 Dashboard — `/admin`

Tidak ada input selain pencarian. Isinya kartu per event.

| Elemen | Sumber | Status |
|---|---|---|
| Kotak cari | lokal, tidak disimpan | ✅ |
| Kartu: emoji + label jenis | `identity.kind` | ✅ |
| Kartu: badge status | `status` | ✅ |
| Kartu: nama internal | `identity.internalName` | ✅ |
| Kartu: nama tampil · tanggal | `identity.names`, `dateDisplay` | ✅ |
| Kartu: slug | `slug` | ✅ |
| Kartu: bar strip | `subscription.stripUsed / stripQuota` | ✅ |
| **Kartu: sisa masa aktif** | hitung dari `subscription.expiresAt` | 🆕 |
| **Kartu: tombol Perpanjang** | muncul bila sisa < 2 hari atau sudah lewat | 🆕 |
| Tombol Buka / Playground / Hapus | — | ✅ |
| Kartu "Buat Event Baru" | tampil bila `canCreateMore` | ✅ |

**Sisa masa aktif ditampilkan bagaimana:**

| Kondisi | Tampilan |
|---|---|
| Belum publish | `Draft — belum berjalan` |
| Sisa > 2 hari | `Aktif · sisa 5 hari` |
| Sisa ≤ 2 hari | `Aktif · sisa 1 hari` (warna peringatan) |
| Lewat | `Kedaluwarsa · momen terkunci` + tombol Perpanjang |

### 2.2 Wizard Buat Event

Empat langkah. Prinsipnya: **jangan lempar klien ke 40 field kosong.**

**Langkah 1 — Acara apa?**

| Field | Model | Tipe | W | Siapa | Default | Status |
|---|---|---|:--:|:--:|---|---|
| Jenis acara | `identity.kind` | pilih 5 | ✔ | 👤 | — | ✅ |
| Nama internal | `identity.internalName` | teks | ✔ | 👤 | — | ✅ |
| Nama yang ditampilkan | `identity.names` | teks | ✔ | 👤 | — | ✅ |
| **Tanggal & jam mulai** | **`startAt`** | datetime | ✔ | 👤 | — | 🆕 |

⚠️ **Perubahan penting:** wizard sekarang mengumpulkan `date` (tanggal
saja). Harus jadi **tanggal + jam** karena masa aktif 7 hari dihitung dari
sini (BRD §5.3). Zona waktu default WIB, tersimpan beserta offset.

Memilih jenis acara mengisi otomatis `brandLabel` & `greeting`
(`lib/services/eventKind.ts`) — klien tetap bebas mengubahnya nanti.

**Langkah 2 — Tampilannya?**

| Field | Model | Tipe | W | Siapa | Status |
|---|---|---|:--:|:--:|---|
| Preset tema | `theme.preset` | Gelap/Terang | ✔ | 👤 | ✅ |

**Langkah 3 — Detail acara**

| Field | Model | Tipe | W | Siapa | Default | Status |
|---|---|---|:--:|:--:|---|---|
| Sapaan besar | `identity.brandLabel` | teks | – | 👤 | dari jenis acara | ✅ |
| Tanggal tampil | `identity.dateDisplay` | teks bebas | – | 👤 | diformat dari `startAt` | ✅ |
| Lokasi | `identity.venue` | teks | – | 👤 | kosong | ✅ |
| Tagar | `identity.hashtag` | teks | – | 👤 | kosong | ✅ |
| Sambutan | `identity.greeting` | teks panjang | – | 👤 | dari jenis acara | ✅ |
| Kode acara (slug) | `slug` | teks | ✔ | 👤 | dari `names` | ✅ |

**Langkah 4 — Ringkasan**, lalu simpan.

**Yang otomatis saat simpan** — tidak ada input manualnya:

| Field | Nilai | Status |
|---|---|---|
| `id` | `evt_<uuid>` | ✅ ⚙️ |
| `clientId` | dari sesi login | ✅ ⚙️ |
| `status` | `"draft"` | ✅ ⚙️ |
| `frameIds` | `[]` | ✅ ⚙️ |
| `theme.colors/font/effects/videoCard` | dari preset terpilih | ✅ ⚙️ |
| `session` | `DEFAULT_SESSION` | ✅ ⚙️ |
| `copy` | `{}` | ✅ ⚙️ |
| `createdAt` / `updatedAt` | sekarang | ✅ ⚙️ |
| Subscription | dari Plan yang dibeli | 🔧 sekarang masih hardcoded |
| `identity.date` | diturunkan dari `startAt` | 🆕 ⚙️ |

🔧 **Catat:** sekarang `STARTER_QUOTA` di-hardcode di
`app/api/admin/events/route.ts`. Harus diganti: kuota berasal dari Plan
yang benar-benar dibeli klien.

### 2.3 Editor · Info

| Field | Model | W | Siapa | Aturan | Status |
|---|---|:--:|:--:|---|---|
| Nama internal | `identity.internalName` | ✔ | 👤 | | ✅ |
| Kode acara | `slug` | ✔ | 👤 | unik lintas semua event | ✅ |
| Sapaan besar | `identity.brandLabel` | – | 👤 | | ✅ |
| Nama yang ditampilkan | `identity.names` | ✔ | 👤 | | ✅ |
| Tanggal tampil | `identity.dateDisplay` | – | 👤 | teks bebas, hiasan | ✅ |
| Lokasi | `identity.venue` | – | 👤 | | ✅ |
| Tagar | `identity.hashtag` | – | 👤 | | ✅ |
| Sambutan | `identity.greeting` | – | 👤 | | ✅ |
| **Tanggal & jam mulai** | **`startAt`** | ✔ | 👤 | **terkunci setelah masa aktif berjalan** | 🆕 |

Aturan `startAt` (BRD §8 poin 11): bebas diubah selama `status === "draft"`.
Begitu event `live` dan `now >= startAt`, field jadi **hanya-baca** dengan
keterangan *"Masa aktif sudah berjalan — hubungi dukungan bila jadwal
berubah."* Tanpa ini, klien bisa memundurkan tanggal terus-menerus dan
paketnya tidak pernah habis.

### 2.4 Editor · Visual Builder ✅

**Disusun PER SESI, bukan per jenis pengaturan.** Klien menyunting
acaranya layar demi layar mengikuti alur yang dilalui tamu, dan pratinjau
HP di kanan ikut melompat ke layar yang sedang disunting lewat
`?preview=<langkah>`.

Kenapa bukan pengelompokan lama (Tampilan / Sesi / Teks)? Pengelompokan
itu benar secara teknis — ia mencerminkan bentuk model datanya — tapi
memaksa klien membayangkan hasilnya. "Ubah warna tombol di layar Selamat
Datang" jauh lebih mudah dikerjakan daripada "cari toggle warna di antara
40 field". Model datanya tidak berubah; hanya cara menyajikannya.

Layout: kontrol kiri (400px, sticky, tombol Simpan selalu terlihat),
pratinjau iframe 390×844 di kanan (§15.27 Device Mockup).

#### Sesi 1 — 👋 Selamat Datang (`previewStep: null`)

| Field | Model | Kontrol | Siapa |
|---|---|---|:--:|
| Preset warna | `theme.preset` + `theme.colors` | Gelap/Terang (berlaku semua layar) | 👤 |
| Monogram: mode | `theme.elements.monogram.mode` | Inisial / Logo sendiri / Sembunyikan | 👤 |
| Monogram: berkas | `theme.elements.monogram.assetId` | unggah PNG | 👤 |
| Monogram: ukuran | `theme.elements.monogram.size` | 40–140 px | 👤 |
| Monogram: cincin | `theme.elements.monogram.ring` | toggle | 👤 |
| Teks kicker | `copy.welcomeKicker` | teks | 👤 |
| Placeholder nama | `copy.guestNamePlaceholder` | teks | 👤 |
| Tombol mulai | `copy.welcomeCta` | teks | 👤 |
| Tombol lihat momen | `copy.welcomeMomentsCta` | teks | 👤 |
| Nama tamu wajib | `session.guestNameRequired` | toggle | 👤 |
| Font nama acara | `theme.fontDisplayId` | 12 font, dirender dalam fontnya sendiri | 👤 |
| Warna latar/nama/redup/aksen | `theme.colors.{ink,paper,smoke,flash}` | color picker | 👤 |
| Pemeriksa kontras | — | otomatis, peringatan | ⚙️ |
| Bentuk tombol | `theme.elements.buttonShape` | Pil / Membulat / Kotak — **berlaku semua layar** | 👤 |
| Gradasi tombol | `theme.colors.{brandPurple,brandGold}` | 2 color picker | 👤 |
| Kelopak / jumlah / blob | `theme.effects.*` | toggle + angka | 👤 |
| Dekorasi sudut | `theme.decorAssetId` | unggah PNG (semua layar) | 👤 |

#### Sesi 2 — 🖼️ Pilih Bingkai (`?preview=bingkai`)

| Field | Model | Kontrol | Siapa |
|---|---|---|:--:|
| Daftar bingkai | `event.frameIds` | ringkasan + tautan ke menu Bingkai | 👤 |
| Label langkah | `copy.stepFrame` | teks | 👤 |
| Warna kartu/tepi/indikator | `theme.colors.{film,edge,flash}` | color picker | 👤 |

Isi carousel-nya sendiri sengaja **tidak** diduplikasi di sini — satu
tempat pengelolaan (menu Bingkai) supaya tidak ada pertanyaan "yang mana
yang menang".

#### Sesi 3 — 📸 Sesi Foto (`?preview=potret`, butuh kamera)

| Field | Model | Kontrol | Siapa |
|---|---|---|:--:|
| Label langkah | `copy.stepShoot` | teks | 👤 |
| Hitung mundur | `session.countdownSeconds` | 0/3/5/10 | 👤 |
| Bentuk area kamera | `session.cameraAspect` | 1:1 / 4:5 / 3:4 | 👤 |
| Cermin pratinjau | `session.mirror` | toggle | 👤 |
| Lanjut otomatis | `session.autoContinue` | toggle | 👤 |
| Batas ulang foto | `session.maxRetakes` | 0–10 | 👤 |
| Filter warna | `session.filterCss` | 8 preset bergambar + kolom CSS | 👤 |
| Durasi animasi cetak | `session.revealMs` | 0–30000 ms | 👤 |
| Warna indikator/tepi/shutter | `theme.colors.{live,edge,brandPurple}` | color picker | 👤 |

#### Sesi 4 — 🎙️ Pesan Suara (`?preview=suara`, butuh mikrofon)

| Field | Model | Kontrol | Siapa | Batas |
|---|---|---|:--:|---|
| Aktifkan | `session.voice.enabled` | toggle | 👤 | terkunci bila paket tidak mencakup |
| Durasi maksimal | `session.voice.maxSeconds` | angka | 👤 | plafon `subscription.maxVoiceSeconds` |
| Label langkah | `copy.stepVoice` | teks | 👤 | |
| Judul ajakan | `copy.voiceTitle` | teks + token | 👤 | |
| Kalimat pengantar | `copy.voiceIntro` | teks panjang | 👤 | |
| Warna rekam / putar | `theme.colors.{live,paper}` | color picker | 👤 | |
| Warna kartu video (5) | `theme.videoCard.*` | color picker | 👤 | |
| Gradasi judul video (3) | `theme.videoCard.headingGradient` | 3 color picker | 👤 | |
| Latar kartu video | `theme.videoBgAssetId` | unggah 1080×1920 | 👤 | |

Saat layar ini dimatikan, panelnya menyembunyikan seluruh kontrol tampilan
dan hanya menyisakan togglenya — menata layar yang tidak akan pernah
dilihat tamu itu pekerjaan sia-sia.

#### Sesi 5 — 🎉 Hasil & Bagikan (`?preview=struk`)

| Field | Model | Kontrol | Siapa |
|---|---|---|:--:|
| Label langkah | `copy.stepResult` | teks | 👤 |
| Unduh PNG / JPG / Video | `session.share.download*` | 3 toggle | 👤 |
| Bagikan IG / WA / bawaan HP | `session.share.{instagram,whatsapp,nativeShare}` | 3 toggle | 👤 |
| Galeri momen aktif | `session.moments.enabled` | toggle (terkunci per paket) | 👤 |
| Nama tamu di galeri | `session.moments.showGuestName` | toggle | 👤 |
| Judul & teks kosong galeri | `copy.{momentsTitle,momentsEmpty}` | teks | 👤 |
| Konfeti | `theme.effects.confetti` | toggle | 👤 |
| Warna tombol unduh/tepi | `theme.colors.{paper,edge}` | color picker | 👤 |
| Pesan kuota habis | `copy.{quotaExhaustedTitle,quotaExhaustedBody}` | teks | 👤 |

Mematikan **semua** tombol unduh memunculkan peringatan, bukan diam-diam
diterima: klien yang tidak sengaja melakukannya baru sadar saat acara
sudah berjalan dan tamu tidak bisa membawa pulang apa pun.

#### Aturan lintas-sesi

- **Fitur terkunci tetap tampil**, dimatikan, berlencana `PRO`. Jangan
  disembunyikan — klien tidak bisa menginginkan sesuatu yang tidak dia
  ketahui ada.
- **Struktur tiap layar tetap** (bukan kanvas drag-and-drop bebas). Yang
  bisa diubah: isi, warna, font, bentuk, dan tampil/tidaknya tiap elemen.
  Playground ini dipakai acara sungguhan; tata letak yang sudah teruji di
  layar HP lebih berharga daripada kebebasan menggeser yang gampang
  menghasilkan layar rusak.
- **`?preview=` diperiksa di server.** Selain melompati layar awal, ia juga
  melewati gerbang draft/selesai/kuota-habis — tanpa itu klien tidak akan
  pernah bisa menata acaranya SEBELUM dipublikasikan. Karena itu
  `app/e/[slug]/page.tsx` memastikan pemanggilnya pemilik event yang
  sedang login (atau staff); tamu yang menempel `?preview=` di URL tetap
  kena gerbang seperti biasa.
- **Belum ada UI:** `theme.fontMonoId` (font kode/label kecil).

### 2.5 Editor · Bingkai

| Elemen | Model | Siapa | Status |
|---|---|:--:|---|
| Daftar bingkai terpilih + urutan | `frameIds` | 👤 | ✅ |
| Naik/turun urutan | `frameIds` | 👤 | ✅ |
| Lepas bingkai | `frameIds` | 👤 | ✅ |
| Pustaka tersedia (bawaan + milik sendiri) | — | 👤 | ✅ |
| Tombol "Upload bingkai sendiri" | — | 👤 | 🔧 harus dikunci bila `!features.customFrameUpload` |
| Batas jumlah bingkai | `subscription.maxFrames` | ⚙️ | 🔧 belum ditegakkan |

Urutan `frameIds` = urutan carousel yang dilihat tamu. Bukan detail
sepele — bingkai pertama yang paling sering dipakai.

### 2.6 Editor · Momen 🆕

| Elemen | Model | Siapa | Status |
|---|---|:--:|---|
| Grid momen | `Moment[]` | — | 🆕 |
| Filter: ada video / foto saja | — | 👤 | 🆕 |
| Cari nama tamu | `guestName` | 👤 | 🆕 |
| Sembunyikan momen (moderasi) | `hidden` | 👤 | 🆕 |
| Unduh satu | `photoUrl`/`videoUrl` | 👤 | 🆕 |
| **Unduh semua (ZIP)** | — | 👤 | 🆕, kunci bila `!features.bulkDownload` |
| Indikator penyimpanan | `subscription.storageUsedMb / storageMb` | ⚙️ | 🆕 |

**Wajib:** kalau `now > expiresAt`, seluruh layar ini terkunci dan
menampilkan ajakan perpanjang (BRD §8 poin 9). Momen tidak dihapus.

### 2.7 Editor · Publish

| Elemen | Model | Siapa | Status |
|---|---|:--:|---|
| Status draft/live/ended | `status` | 👤 | ✅ |
| Checklist pra-publish | — | ⚙️ | ✅ |
| QR code + unduh PNG | dari `slug` | ⚙️ | ✅ |
| Salin link | dari `slug` | 👤 | ✅ |
| **Ringkasan masa aktif** | `startAt` → `expiresAt` | ⚙️ | 🆕 |

🆕 Tambahan checklist pra-publish: **`startAt` sudah diisi**. Publish
tanpa jadwal mulai berarti masa aktif tidak pernah berjalan.

⚙️ Saat status berubah `draft → live`: `publishedAt` diisi, dan
`subscription.startsAt = event.startAt`,
`expiresAt = startAt + plan.activeDays`.

### 2.8 Pustaka Bingkai — `/admin/frames`

| Elemen | Model | Siapa | Status |
|---|---|:--:|---|
| Grid bingkai (bawaan + milik sendiri) | `Frame` | — | ✅ |
| Cari nama | `name` | 👤 | ✅ |
| Hapus (hanya milik sendiri) | — | 👤 | 🔧 belum dicek kepemilikan |
| Buat bingkai baru | wizard | 👤 | ✅ |

> ### 🔴 Celah keamanan terverifikasi — `app/api/admin/frames/[id]/route.ts`
>
> Diperiksa 12 Agustus 2026. Ketiga handler (`GET`, `PATCH`, `DELETE`)
> **hanya memanggil `requireAdminSession()`** — tidak ada satu pun
> pemeriksaan kepemilikan. Akibatnya siapa pun yang punya akun bisa:
>
> 1. **Melihat & mengubah bingkai klien lain** (`GET`, `PATCH`) asal tahu
>    id-nya.
> 2. **Menghapus bingkai bawaan Circle Snap** (`clientId === null`) — aset
>    kita sendiri yang dipakai semua klien.
> 3. **Merusak event klien lain.** Ini yang paling parah: rutin pembersih
>    di `DELETE` memanggil `repo.events.list()` **tanpa filter klien**,
>    lalu membuang id bingkai itu dari `frameIds` **semua event milik
>    siapa pun**. Jadi satu klien menghapus satu bingkai bisa mencopot
>    bingkai dari acara klien lain yang sedang berjalan.
>
> Rutin pembersihnya sendiri benar dan memang perlu (mencegah id basi) —
> yang salah adalah tidak adanya gerbang kepemilikan sebelum sampai ke
> sana.
>
> **Perbaikan:** samakan dengan pola yang sudah dipakai di
> `app/api/admin/events/[id]/route.ts` (`requireEventOwner`) — buat
> `requireFrameOwner`: staff boleh semua; klien biasa hanya `clientId`
> miliknya; bingkai bawaan (`clientId === null`) **hanya-baca** bagi klien.
> Kembalikan **404**, bukan 403.

**Wizard bingkai baru** (3 langkah, ✅ sudah ada):

| Langkah | Field | Model | Siapa | Status |
|---|---|---|:--:|---|
| 1 | Unggah PNG | → `Asset` + `overlayAssetId` | 👤 | ✅ |
| 1 | Lebar/tinggi | `width`, `height` | ⚙️ dari PNG | ✅ |
| 1 | Warna dasar | `paper` | ⚙️ sampling PNG | ✅ |
| 2 | Slot: x, y, w, h | `slots[]` | 👤 koreksi hasil deteksi | ✅ |
| 2 | Asal slot | `slotSource` | ⚙️ | ✅ |
| 3 | Nama bingkai | `name` | 👤 ✔ | ✅ |
| 3 | Keterangan | `blurb` | 👤 | ✅ |
| 3 | Ukuran cetak | `printSize` | 👤 | ✅ |
| — | Layer teks | `textLayers[]` | 🏢 **staff saja** | 🆕 Frame Builder |

### 2.9 Billing — `/admin/billing` 🆕

Tidak ada field yang diketik klien selain memilih paket. Isinya:

| Bagian | Sumber |
|---|---|
| Paket aktif per event | `Subscription` |
| Sisa strip | `stripQuota - stripUsed` |
| Sisa masa aktif | `expiresAt - now` |
| Sisa jatah event (Vendor) | `client.eventSlotsTotal - eventSlotsUsed` |
| Penyimpanan terpakai | `storageUsedMb / storageMb` |
| Katalog paket yang bisa dibeli | `Plan[]` dengan `isActive` |
| Tombol: Beli paket / Top-up strip / Perpanjang akses / Tambah jatah event | membuat `Order` |
| Riwayat transaksi | `Order[]` |

**Alur beli (fase manual):** klien pilih paket → `Order` dibuat berstatus
`pending` + instruksi transfer → klien transfer → staff konfirmasi di
`/admin/staff/orders` → kuota bertambah.

### 2.10 Account — `/admin/account` 🆕

| Field | Model | W | Siapa | Status |
|---|---|:--:|:--:|---|
| Nama | `client.name` | ✔ | 👤 | 🆕 |
| Email | `client.email` | ✔ | 👤 | 🆕 (harus cek unik) |
| Password lama | — | ✔ | 👤 | 🆕 |
| Password baru | `client.passwordHash` | ✔ | 👤 | 🆕 min 8 karakter |
| Tipe akun | `client.type` | – | ⚙️ hanya-baca | 🆕 |

Tipe akun **tidak boleh** diubah sendiri oleh klien — Personal yang
mengubah dirinya jadi Vendor langsung melewati batas 1 event. Kalau
memang perlu naik, itu pembelian (upgrade), bukan penyuntingan profil.

---

## 3. PANEL STAFF

### 3.1 Ringkasan — `/admin/staff` 🆕

Angka saja, tanpa input:

| Kartu | Hitungan |
|---|---|
| Klien aktif | `clients` dengan `status === "active"` |
| Event berjalan | `events` dengan `status === "live"` & belum expired |
| Strip terjual bulan ini | jumlah `stripQuota` dari Order lunas bulan ini |
| Pendapatan bulan ini | jumlah `amountIdr` Order lunas |
| **Order menunggu konfirmasi** | Order `pending` — ini yang paling perlu tindakan |
| Event kedaluwarsa 7 hari terakhir | peluang tawaran perpanjangan |

### 3.2 Pendaftar — `/admin/staff/clients` 🆕

**Daftar:** tabel dengan kolom nama, email, tipe, jumlah event, status,
tanggal daftar. Filter: tipe, status. Cari: nama/email.

**Detail `/admin/staff/clients/[id]`:**

| Bagian | Isi | Aksi staff |
|---|---|---|
| Profil | nama, email, tipe, tanggal daftar | — |
| Status akun | `client.status` | 🏢 Suspend / Aktifkan |
| Jatah event | `eventSlotsUsed / eventSlotsTotal` | 🏢 Tambah jatah manual (+ alasan) |
| Daftar event | event milik klien + status + kuota | 🏢 Buka event |
| Riwayat transaksi | Order klien | 🏢 Buka order |
| Catatan internal 🆕 | `client.internalNote` | 🏢 Tulis catatan |

🆕 **`client.internalNote`** — catatan staff yang tidak pernah dilihat
klien ("minta invoice atas nama PT X", "sering telat bayar"). Sepele tapi
sangat berguna begitu klien mulai banyak.

⚠️ Tambah jatah event manual **wajib** meninggalkan jejak (Order dengan
metode `manual_adjustment` + alasan). Jangan pernah ada jalan menaikkan
kuota tanpa catatan siapa dan kenapa.

### 3.3 Katalog Paket — `/admin/staff/plans` 🆕

| Field | Model | W | Siapa | Catatan | Status |
|---|---|:--:|:--:|---|---|
| Nama paket | `name` | ✔ | 🏢 | | ✅ model |
| Untuk siapa | `audience` | ✔ | 🏢 | personal / vendor | 🆕 |
| Harga | `priceIdr` | ✔ | 🏢 | | ✅ model |
| Jumlah strip/event | `stripQuota` | ✔ | 🏢 | | ✅ model |
| Jatah event | `eventSlots` | ✔ | 🏢 | 1 utk personal | 🆕 |
| Masa aktif (hari) | `activeDays` | ✔ | 🏢 | usulan 7 / 14 | ✅ model |
| Maks bingkai | `maxFrames` | ✔ | 🏢 | | ✅ model |
| Maks durasi suara | `maxVoiceSeconds` | ✔ | 🏢 | 5 / 15 / 30 | ✅ model |
| Penyimpanan (MB) | `storageMb` | ✔ | 🏢 | | ✅ model |
| Fitur: pesan suara | `features.voiceNote` | – | 🏢 | | ✅ model |
| Fitur: galeri momen | `features.momentsGallery` | – | 🏢 | | ✅ model |
| Fitur: unduh massal | `features.bulkDownload` | – | 🏢 | | ✅ model |
| Fitur: tanpa branding | `features.removeCircleSnapBranding` | – | 🏢 | | ✅ model |
| Fitur: upload bingkai | `features.customFrameUpload` | – | 🏢 | | ✅ model |
| Masih dijual | `isActive` | – | 🏢 | | 🆕 |
| Urutan tampil | `sortOrder` | – | 🏢 | | 🆕 |

⚠️ **Paket yang sudah dibeli tidak boleh berubah isinya.** Nilai Plan
**disalin** ke Subscription saat pembelian (`subscriptionFromPlan()` sudah
melakukan ini). Menaikkan harga bulan depan tidak boleh mengubah
kesepakatan klien lama. Karena itu paket lama **dinonaktifkan**
(`isActive: false`), bukan dihapus.

### 3.4 Transaksi — `/admin/staff/orders` 🆕

**Daftar:** tanggal, klien, jenis, jumlah, status, metode. Filter status.
Yang `pending` naik ke atas — itu yang menunggu tindakan.

| Field Order | Tipe | Siapa | Status |
|---|---|:--:|---|
| `id` | `ord_<uuid>` | ⚙️ | 🆕 |
| `clientId` | rujukan | ⚙️ | 🆕 |
| `kind` | `plan` / `topup_strip` / `extend_access` / `add_event_slot` / `manual_adjustment` | ⚙️ | 🆕 |
| `planId` | rujukan (bila `kind = plan`) | ⚙️ | 🆕 |
| `subscriptionId` | rujukan (bila top-up/perpanjang) | ⚙️ | 🆕 |
| `amountIdr` | angka | ⚙️ dari Plan | 🆕 |
| `status` | `pending`/`paid`/`cancelled`/`refunded` | 🏢 | 🆕 |
| `method` | `manual_transfer`/`payment_gateway`/`manual_adjustment` | 🏢 | 🆕 |
| `note` | teks | 🏢 | 🆕 |
| `createdAt` / `paidAt` | waktu | ⚙️ | 🆕 |

**Aksi "Konfirmasi Lunas"** menjalankan efeknya sesuai `kind`:

| `kind` | Efek |
|---|---|
| `plan` | Buat Subscription baru + `eventSlotsTotal += plan.eventSlots` |
| `topup_strip` | `subscription.stripQuota += n` |
| `extend_access` | `subscription.expiresAt += n hari` |
| `add_event_slot` | `client.eventSlotsTotal += 1` |
| `manual_adjustment` | sesuai isi, wajib ada `note` |

⚠️ Harus **idempoten**: menekan "Konfirmasi Lunas" dua kali tidak boleh
menambah kuota dua kali. Cek `status === "pending"` sebelum bertindak.

### 3.5 Template Global — `/admin/staff/templates` 🆕

Sama seperti Pustaka Bingkai klien, tapi dilingkupi `clientId === null`
dan punya kemampuan lebih:

| Aksi | Klien | Staff |
|---|:--:|:--:|
| Upload PNG + koreksi slot | ✅ (bila paket izinkan) | ✅ |
| Atur `textLayers` (Frame Builder) | ❌ | ✅ |
| Terbitkan ke pustaka global | ❌ | ✅ |
| Hapus bingkai bawaan | ❌ | ✅ |

### 3.6 Frame Builder — `/admin/staff/templates/[id]` 🆕

Rancangan penuh di [dokumen 07](07-canvas-designer.md). Field per layer:

| Field | Model | Kontrol | W |
|---|---|---|:--:|
| Isi teks | `text` | teks + sisipan token | ✔ |
| Posisi X, Y | `x`, `y` | geser di kanvas / angka | ✔ |
| Ukuran font | `size` | angka | ✔ |
| Perataan | `align` | kiri/tengah/kanan | ✔ |
| Warna | `color` | color picker | ✔ |
| Jenis huruf | `face` | display / mono | ✔ |
| Ketebalan | `weight` | angka | – |
| Jarak antarhuruf | `tracking` | angka | – |
| Huruf besar semua | `uppercase` | toggle | – |
| Lebar maksimal | `maxWidth` | angka | – |
| Nama layer | `label` | teks | – |
| Tinggi baris | `lineHeight` | angka | – |
| Sembunyikan | `hidden` | toggle | – |
| **Kunci posisi** | `locked` | toggle | – |

Token tersedia: `{{names}}` `{{date}}` `{{venue}}` `{{hashtag}}` `{{code}}`
(sudah ada di `tokensForEvent()`).

`locked: true` = klien boleh ganti isi/warna, **tidak boleh menggeser**.
Ini yang menjaga komposisi template tetap rapi di tangan ratusan klien.

---

## 4. Rangkuman field baru yang harus ditambah ke model

### `Event`
```ts
startAt: string;   // 🆕 ISO 8601 + offset, mis. "2026-08-08T19:00:00+07:00"
```

### `Client`
```ts
eventSlotsTotal: number;   // 🆕
eventSlotsUsed: number;    // 🆕
status: "active" | "suspended";  // 🆕
internalNote?: string;     // 🆕 hanya staff
```

### `Plan`
```ts
audience: "personal" | "vendor";  // 🆕
eventSlots: number;               // 🆕
isActive: boolean;                // 🆕
sortOrder: number;                // 🆕
```

### `Order` — model baru seluruhnya
```ts
id, clientId, kind, planId?, subscriptionId?,
amountIdr, status, method, note?, createdAt, paidAt?
```

### `Event.status`
```ts
"draft" | "live" | "ended" | "expired"   // 🆕 "expired"
```
Catatan: `expired` **dihitung dari waktu**, bukan disimpan — begitu
`now > expiresAt`. Jangan mengandalkan cron; kalau cron gagal sekali,
event terlanjur bocor terbuka (BRD §8.1).

---

## 5. Urutan bangun layar

Mengikuti urutan di BRD §9, dipecah per layar:

| # | Layar | Prasyarat |
|---|---|---|
| 0 | **Tambal celah kepemilikan bingkai** (§2.8) | — · **dahulukan, bukan layar baru** |
| 1 | Penjaga `/admin/staff/*` + Ringkasan | `client.isStaff` (sudah ada) |
| 2 | Pendaftar (daftar + detail) | `Client.status`, `internalNote` |
| 3 | Katalog Paket | field Plan baru |
| 4 | Transaksi | model `Order` |
| 5 | Billing klien | Order + katalog sudah jalan |
| 6 | `startAt` + penegakan masa aktif | field Event baru |
| 7 | Penegakan kuota & fitur | Subscription sudah nyata |
| 8 | ~~Visual Builder~~ ✅ **selesai** — 5 sesi + pratinjau melompat | — |
| 9 | Momen | — |
| 10 | Frame Builder — editor teks 🔧 sebagian selesai (drag+panel, belum snapping/undo) | dokumen 07 |
| 11 | Account | — |

Layar 1–5 adalah **rantai penagihan**: tanpa kelimanya, tidak ada uang
yang bisa masuk. Layar 6–7 adalah **penegakan**: tanpa keduanya, yang
sudah dibayar tidak dibatasi apa-apa.
