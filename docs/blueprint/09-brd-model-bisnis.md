# Blueprint 09 — BRD & Model Bisnis

> Dokumen acuan **produk & bisnis**, bukan teknis. Kalau dokumen 02–08
> menjawab "dibangun bagaimana", dokumen ini menjawab **"dijual apa,
> ke siapa, dengan aturan apa"** — dan dari situ menurunkan struktur menu
> serta field data yang belum ada.
>
> Status: **draft hasil diskusi 12 Agustus 2026.** Angka harga & beberapa
> keputusan bertanda ⚠️ masih menunggu keputusan pemilik produk.

---

## 1. Produk dalam satu kalimat

**Circle Snap Virtual Booth** menjual **sesi photobooth berbasis browser**
untuk acara — tamu memindai QR, berfoto, menitipkan pesan suara, lalu
mengunduh strip fotonya sendiri. Tanpa aplikasi, tanpa perangkat keras.

Yang dijual **bukan** aplikasinya, melainkan **kapasitas pakai**: strip.

---

## 2. Dua panel, dua pengguna berbeda

Ini keputusan struktural paling penting di dokumen ini. Yang sekarang
tercampur di satu `/admin` sebenarnya dua produk berbeda:

| | Panel **Staff** | Panel **Klien** |
|---|---|---|
| Siapa | Tim Circle Snap | Pembeli (Personal & Vendor/EO) |
| Tujuan | Menjalankan bisnis | Menjalankan satu/banyak acara |
| Route | `/admin/staff/*` | `/admin/*` |
| Boleh lihat | Semua klien, semua transaksi | Hanya miliknya sendiri |

**Kenapa harus dipisah sekarang, bukan nanti:** begitu ada klien
sungguhan, satu kekeliruan pelingkupan data = kebocoran data klien ke
klien lain. Memisahkan saat masih 1 akun demo itu murah; memisahkan saat
sudah 50 akun itu mahal dan berisiko.

Fondasinya sudah ada: `Client.isStaff` sudah dipakai untuk melewati
pelingkupan di `app/admin/(protected)/layout.tsx`.

---

## 3. Peta menu

### 3.1 Panel Klien

```
/admin                              Dashboard — daftar event + sisa kuota
/admin/events/[id]                  Editor event
    ├─ Info                         nama, tanggal, lokasi, sambutan
    ├─ Visual Builder  ★            tampilan + tahapan sesi + pratinjau
    ├─ Bingkai                      pilih dari pustaka (+ upload bila paket izinkan)
    ├─ Momen                        galeri hasil tamu + unduh
    └─ Publish                      slug, QR, status draft/live/ended
/admin/frames                       Pustaka bingkai (bawaan + milik sendiri)
/admin/billing          ← BARU      paket, sisa kuota, top-up, riwayat beli
/admin/account          ← BARU      profil, ganti password
```

### 3.2 Panel Staff

```
/admin/staff                        Ringkasan bisnis
/admin/staff/clients    ← BARU      Pendaftar: daftar, cari, detail, suspend
/admin/staff/clients/[id] ← BARU    Detail klien: event, transaksi, kuota
/admin/staff/plans      ← BARU      Katalog paket: harga, isi, aktif/nonaktif
/admin/staff/orders     ← BARU      Transaksi: konfirmasi bayar, refund
/admin/staff/templates  ← BARU      Pustaka template global
/admin/staff/templates/[id]         Frame Builder ★
```

★ = dibahas di bagian 4.

---

## 4. Visual Builder vs Frame Builder

Dua alat berbeda yang gampang tertukar. Bedanya paling gampang diingat:

> **Visual Builder** mengatur *sekeliling* foto (layar yang dilihat tamu).
> **Frame Builder** mengatur *bingkai cetakannya* (yang menempel di foto).

### 4.1 Visual Builder — untuk KLIEN

Menggabungkan tiga tab yang sekarang terpisah (Tema, Teks, Sesi) menjadi
**satu layar dua-panel**: kontrol di kiri, pratinjau HP hidup di kanan
(pola §11.8 `UI-UX-DESIGN-SYSTEM.md`).

Isi panel kontrol, dalam tab:

| Tab | Isi |
|---|---|
| **Tampilan** | 9 warna tema, preset gelap/terang, font, dekorasi sudut, efek (kelopak/blob/konfeti) |
| **Tahapan Sesi** | hitung mundur, aspek kamera, jumlah retake, mirror, wajib nama tamu, **pesan suara on/off + durasi**, filter warna |
| **Teks** | override tulisan antarmuka playground |

**Catatan dari diskusi:** pesan suara adalah fitur berbayar (bagian 6),
tapi *tempat menyalakannya* ada di sini, di Tahapan Sesi. Kalau paket
klien tidak mencakupnya, toggle tetap terlihat namun terkunci disertai
ajakan upgrade — bukan disembunyikan, supaya klien tahu fitur itu ada.

### 4.2 Frame Builder — untuk STAFF (dan klien tier atas, terbatas)

Rancangan mesinnya sudah lengkap di [dokumen 07](07-canvas-designer.md).
Inti model bisnisnya:

| Peran | Mengerjakan | Frekuensi |
|---|---|---|
| Desainer Circle Snap | Bingkai indah tanpa teks + posisi layer teks bertoken | Sekali per template |
| Klien | Pilih template, isi nama/tanggal | Tiap acara, 5 menit |

**Satu template dibuat sekali, dijual ke ratusan acara.** Inilah yang
mengubah ini dari jasa desain jadi produk. Tanpa Frame Builder, tiap
klien baru butuh kerja desainer baru — dan margin habis di situ.

Pembagian kemampuan:

- **Staff**: buat template dari nol, atur slot + layer teks bertoken,
  terbitkan ke pustaka global.
- **Klien tier atas** (`customFrameUpload`): upload PNG sendiri + koreksi
  slot. Sudah terbangun (`CreateFrameWizard`). **Tidak** dapat editor
  layer teks — itu tetap milik staff.

---

## 5. Apa yang dijual

### 5.1 Unit dasar

**1 strip = 1 sesi foto yang selesai** (tamu sampai ke layar struk).

Alasan memilih strip, bukan "per acara" atau "per tamu":
- Selaras dengan biaya kita (storage + render video).
- Klien paham langsung: 200 strip ≈ 200 kali orang berfoto.
- Bisa di-*top-up* saat acara ternyata lebih ramai dari perkiraan.

### 5.2 Bentuk paket

⚠️ **Bacaan hasil diskusi — mohon konfirmasi:** yang dikumpulkan di level
akun adalah **jatah EVENT**, sedangkan **strip tetap melekat per-event**.

**Personal (Acara Sendiri)** — 1 akun, 1 event seumur akun:

```
Paket = 1 event + N strip
```

**Vendor/EO** — 1 akun, banyak event:

```
Paket = M jatah event  +  N strip per event
```

Contoh: EO beli "3 event × 200 strip" → boleh membuat 3 event, masing
masing berjatah 200 strip. Sisa strip di event A **tidak** mengalir ke
event B (konsekuensi "tetep 1 event berapa strip").

**Konsekuensi yang harus disadari:** EO yang acaranya sepi akan merasa
strip sisanya hangus. Peredamnya: sediakan **top-up strip per event**
(beli tambahan saat kurang) dan **beberapa ukuran paket** (jangan cuma
200), supaya EO bisa memilih yang mendekati kebutuhan nyata.

### 5.3 Masa aktif event & akses momen

**Satu event berlaku 7 hari**, dihitung dari **waktu mulai acara** yang
diisi klien — bukan dari tanggal beli, bukan dari tanggal publish.

```
   beli paket          set jadwal        MULAI          +7 hari
   (kapan saja)   →    acara       →   ┌──────────────────┐  →  kunci
                                       │  jendela aktif   │
                                       │  · tamu berfoto  │
                                       │  · lihat momen   │
                                       │  · unduh momen   │
                                       └──────────────────┘
```

Satu jendela ini mencakup **dua-duanya**: sesi foto tamu **dan** akses
momen (lihat + simpan). Sengaja disatukan, bukan dua jendela terpisah —
lebih gampang dijelaskan ke klien ("paketmu aktif 7 hari"), dan lebih
tahan kalau acara mundur sehari-dua hari.

**Klien wajib mengisi tanggal DAN jam mulai.** Jam penting karena acara
malam yang mulai 19:00 tidak boleh kehilangan satu hari penuh gara-gara
hitungan dimulai dari 00:00.

**Setelah 7 hari lewat:** event terkunci. Tamu tidak bisa memulai sesi
baru, momen tidak bisa dilihat/diunduh. **Momen TIDAK dihapus** — klien
bisa membeli perpanjangan untuk membukanya kembali (bagian 5.5).

⚠️ **Konsekuensi biaya yang harus disadari:** karena perpanjangan harus
punya sesuatu untuk dibuka kembali, file momen **wajib kita simpan
melewati masa aktif**. Tanpa batas simpan yang tegas, biaya penyimpanan
tumbuh selamanya untuk event yang tidak akan pernah diperpanjang.
Butuh **kebijakan retensi** — lihat bagian 10 poin 5.

### 5.4 Posisi harga di pasar

Riset pasar 12 Agustus 2026 (sumber di bagian 11):

| Jenis | Harga | Termasuk |
|---|---|---|
| Photobooth fisik Indonesia (entry) | Rp 990rb | 150–250 foto, 1,5–2,5 jam, **operator + printer** |
| Photobooth fisik Indonesia (umum) | Rp 1,25–3,7 jt | + backdrop, props, custom layout |
| Photobooth fisik Jakarta (VIP) | s/d Rp 8 jt | + konsep interaktif |
| Paket kuota cetak | Rp 5 jt (100) – Rp 11 jt (400) | operator + cetak fisik |
| Snappic (SaaS asing) | ~Rp 470rb/event · ~Rp 790rb/bln | software saja |
| Pixilated (SaaS asing) | ~Rp 1,4 jt/event | software saja |

**Posisi Circle Snap:** kita tidak punya operator, printer, transport,
maupun jadwal — biaya tambahan per acara mendekati nol (hanya
penyimpanan). Artinya kita **bisa** jauh di bawah photobooth fisik tanpa
merugi. Tapi jangan terlalu murah: harga Rp 99rb membuat calon klien
mengira ini mainan, bukan alat untuk hari pernikahannya.

Jangkar yang dipakai: **sekitar 1/4–1/3 harga photobooth fisik**. Cukup
murah untuk jadi alasan pindah, cukup mahal untuk terasa serius.

Tiga hal yang kita punya dan pesaing (fisik maupun SaaS asing) tidak:

1. **Dashboard sendiri** — klien mengatur acaranya kapan saja, tidak
   perlu WhatsApp vendor untuk ganti nama di bingkai.
2. **Visual Builder** — tema, warna, font, efek diubah sendiri dengan
   pratinjau hidup. Photobooth fisik: layout dikirim vendor, revisi
   lewat chat.
3. **Frame Builder** — bingkai sendiri, bukan pilih dari 5 template
   vendor.

Ketiganya menjelaskan kenapa kita tidak harus jadi yang termurah.

### 5.5 Usulan katalog & harga

⚠️ **Usulan, bukan keputusan.** Disusun dari data 5.4; silakan dikoreksi.

| Paket | Untuk | Event | Strip/event | Masa aktif | Usulan harga |
|---|---|---|---|---|---|
| **Basic** | Personal | 1 | 100 | 7 hari | Rp 249.000 |
| **Plus** | Personal | 1 | 200 | 7 hari | Rp 449.000 |
| **Pro** | Personal | 1 | 400 | 7 hari | Rp 799.000 |
| **EO Starter** | Vendor | 3 | 200 | 7 hari/event | Rp 1.149.000 |
| **EO Growth** | Vendor | 10 | 200 | 14 hari/event | Rp 3.299.000 |

Alasan angkanya:

- **Plus Rp 449rb** dipasang sebagai paket yang paling ingin dijual —
  200 strip cukup untuk resepsi menengah, dan harganya ±1/3 photobooth
  fisik. Ini jangkar utamanya.
- **Basic Rp 249rb** sengaja tidak terlalu jauh di bawah Plus. Selisih
  Rp 200rb untuk dua kali lipat strip membuat Plus terlihat jelas lebih
  masuk akal — dorongan naik tier tanpa perlu menjelekkan Basic.
- **Pro Rp 799rb** untuk acara besar; per-strip-nya paling murah
  (Rp 2.000/strip vs Rp 2.490 di Basic). Wajar: makin banyak beli makin
  murah satuannya.
- **EO Starter** setara Rp 383rb/event — di bawah harga Plus satuan,
  karena EO membeli borongan dan tidak butuh dilayani satu-satu.
- **EO Growth** dapat **masa aktif 14 hari**, bukan 7. Lihat catatan
  risiko di bagian 10 poin 9.

Add-on (menempel ke satu event):

| Add-on | Efek | Usulan harga |
|---|---|---|
| Top-up 50 strip | `stripQuota` +50 | Rp 129.000 |
| **Perpanjang akses 7 hari** | `expiresAt` +7 hari, momen terbuka lagi | Rp 99.000 |
| **Perpanjang akses 30 hari** | `expiresAt` +30 hari | Rp 249.000 |
| Tambah 1 jatah event | `eventSlotsTotal` +1 (Vendor) | Rp 399.000 |

Catatan penetapan add-on:

- **Top-up sengaja lebih mahal per strip** (Rp 2.580/strip) daripada
  membeli paket besar sejak awal. Ini bukan menghukum klien — ini
  membuat "beli Pro sekalian" jadi pilihan yang lebih pintar, dan
  memberi kita margin untuk lonjakan pemakaian mendadak.
- **Tambah 1 event Rp 399rb** lebih mahal dari harga per-event di paket
  EO Starter (Rp 383rb). Selisihnya tipis tapi cukup untuk mendorong EO
  membeli bundel, bukan mencicil satuan.

⚠️ Perpanjangan hanya membuka **akses momen**, atau **sesi foto juga**?
Rekomendasi: akses momen saja. Alasannya acaranya sudah lewat — yang
dibutuhkan klien pasca-acara adalah mengunduh hasil, bukan memotret lagi.
Kalau sesi foto ikut dibuka, klien bisa "menumpang" satu paket untuk acara
kedua yang berbeda.

---

## 6. Matriks fitur per tier

Berdasarkan pilihan diskusi: keempat fitur di bawah **berbayar**.

| Fitur | Basic | Plus | Pro / EO |
|---|:--:|:--:|:--:|
| Bingkai dari pustaka Circle Snap | ✅ | ✅ | ✅ |
| Galeri Momen (tamu & klien lihat hasil) | ✅ | ✅ | ✅ |
| Unduh strip satu per satu | ✅ | ✅ | ✅ |
| Visual Builder (tema, font, efek, sesi) | ✅ | ✅ | ✅ |
| **Pesan suara + kartu video** | ❌ | ✅ | ✅ |
| **Unduh massal (ZIP)** | ❌ | ✅ | ✅ |
| **Upload bingkai sendiri** | ❌ | ❌ | ✅ |
| **Tanpa branding Circle Snap** | ❌ | ❌ | ✅ |

Semua sudah ada slotnya di `PlanFeatures` (`lib/models/plan.ts`) — tidak
perlu model baru, tinggal diisi dan **ditegakkan**.

> ⚠️ **REVISI 12 Agustus 2026 — "Upload bingkai sendiri" DIBUKA untuk
> SEMUA tier**, menyimpang dari tabel di atas. Keputusan produk: membangun
> bingkai sendiri adalah alasan utama produk ini ada, bukan hiasan tier
> atas. Menguncinya membuat klien Basic/Plus/EO Starter tidak punya cara
> APA PUN menaruh namanya di strip — bingkai pustaka bersama sengaja
> read-only bagi klien. Pembeda antar tier sekarang: kuota strip, masa
> aktif, durasi pesan suara, `maxFrames`, `bulkDownload`, dan branding.
> Lihat `lib/services/planCatalog.ts`.
>
> **Status penegakan nyata (per 12 Agustus 2026):**
>
> | Fitur | Ditegakkan? |
> |---|---|
> | `customFrameUpload` | ✅ server (`app/api/admin/frames/route.ts`) — kini `true` di semua paket |
> | `voiceNote`, `momentsGallery` | ⚠️ hanya mengunci toggle di UI admin |
> | `maxVoiceSeconds` | ✅ diklamp di `toEventConfig()` |
> | `bulkDownload` | ❌ tombol "Unduh Semua" di Momen belum digerbang |
> | `removeCircleSnapBranding` | ❌ belum ada branding di playground untuk dihapus |
> | `maxFrames` | ❌ tersimpan, tidak pernah dicek |

⚠️ **Risiko yang perlu ditimbang:** pesan suara adalah pembeda utama
produk ini dari photobooth biasa. Menguncinya dari paket termurah membuat
Basic "cuma photobooth". Itu bisa disengaja (pendorong upgrade), tapi
kalau Basic yang paling laku, kita justru menjual versi yang paling tidak
istimewa. Alternatif: Basic tetap dapat pesan suara tapi durasinya pendek
(mis. 5 detik vs 15 detik) — `maxVoiceSeconds` sudah ada di model.

---

## 7. Yang belum ada di data & harus ditambah

Yang sudah ada dan bisa dipakai apa adanya: `Plan`, `Subscription`,
`PlanFeatures`, `Client.type`, `stripQuota`/`stripUsed`.

Yang **belum ada sama sekali** — tanpa ini kita tidak bisa menagih:

### 7.1 `Order` (transaksi) — model baru

```
id, clientId, planId
amountIdr
status: "pending" | "paid" | "cancelled" | "refunded"
paidAt, createdAt
method: "manual_transfer" | "payment_gateway"
note                     ← catatan staff saat konfirmasi manual
```

Fase awal cukup **konfirmasi manual** (klien transfer, staff tandai
lunas). Payment gateway menyusul — tidak menghalangi jualan pertama.

### 7.2 Tambahan di `Client`

```
eventSlotsTotal: number   ← jatah event terbeli (EO)
eventSlotsUsed: number    ← terpakai; personal selalu 1/1
status: "active" | "suspended"
```

### 7.3 Tambahan di `Plan`

```
audience: "personal" | "vendor"
eventSlots: number        ← 1 untuk personal, M untuk EO
activeDays: number        ← sudah ada; nilainya sekarang diputuskan: 7
isActive: boolean         ← masih dijual atau sudah pensiun
sortOrder: number
```

### 7.4 Tambahan di `Event` — jadwal mulai

```
startAt: string           ← ISO 8601 BESERTA offset, mis.
                            "2026-08-08T19:00:00+07:00"
```

**Kenapa field baru, padahal sudah ada `identity.date`:** keduanya beda
peran dan boleh berbeda isinya.

| Field | Peran | Contoh |
|---|---|---|
| `identity.dateDisplay` | Hiasan — yang dibaca tamu di layar | "8 Agustus 2026" |
| `identity.date` | Pengurutan & tampilan admin | "2026-08-08" |
| **`startAt`** | **Mengikat secara komersial** — awal hitungan 7 hari | "2026-08-08T19:00:00+07:00" |

Menumpangkan makna komersial ke field hiasan itu jebakan: klien yang
mengetik ulang `dateDisplay` jadi "Sabtu Berkah" tidak boleh sampai
mengubah kapan paketnya kedaluwarsa.

**Offset waktu wajib disimpan**, jangan waktu polos. Acara jam 19:00 WIB
dan 19:00 WIT beda 2 jam sungguhan — kalau disimpan polos, event bisa
terkunci lebih cepat/lambat dari yang dijanjikan. Default tampilan:
Asia/Jakarta (WIB).

### 7.5 Top-up & perpanjangan

Tidak butuh model baru: `Order` yang menunjuk `subscriptionId`, lalu:

- **Top-up strip** → menambah `stripQuota` pada Subscription itu.
- **Perpanjang akses** → memundurkan `expiresAt` pada Subscription itu.

Yang penting **jejaknya tercatat** — jangan pernah menaikkan kuota atau
memundurkan tanggal kedaluwarsa tanpa baris transaksi yang menjelaskan
kenapa. Ini yang membedakan "sistem penagihan" dari "angka yang bisa
diutak-atik".

---

## 8. Aturan bisnis (harus ditegakkan server)

Nomor yang bertanda 🔴 berarti **belum ditegakkan sama sekali sekarang**.

1. 🔴 **Klaim strip terjadi saat struk keluar**, bukan saat sesi dimulai
   — tamu yang batal di tengah tidak boleh memotong kuota.
2. 🔴 **Klaim harus idempoten**: refresh halaman struk tidak boleh
   memotong dua kali.
3. 🔴 **Kuota habis → sesi baru ditolak**, tapi momen lama tetap bisa
   dilihat & diunduh.
4. ✅ **Personal maksimal 1 event** — sudah ditegakkan di
   `app/api/admin/events/route.ts`.
5. 🔴 **EO maksimal sebanyak jatah event terbeli.**
6. 🔴 **Fitur terkunci benar-benar mati di playground**, bukan cuma
   disembunyikan di admin. (Mis. `voiceNote: false` → langkah suara
   dilewati untuk tamu.)
7. ✅ **Klien tidak bisa mengakses event klien lain** — sudah ditegakkan.
8. 🔴 **Masa aktif = 7 hari sejak `Event.startAt`** (waktu mulai acara
   yang diisi klien) — bukan sejak dibeli, bukan sejak publish. Klien
   sering membeli jauh hari sebelum acara.
9. 🔴 **Lewat masa aktif → event terkunci**: sesi baru ditolak DAN momen
   tidak bisa dilihat/diunduh. Berlaku untuk tamu maupun klien.
10. 🔴 **Momen tidak dihapus saat terkunci** — hanya disembunyikan.
    Perpanjangan harus punya sesuatu untuk dibuka kembali.
11. 🔴 **`startAt` tidak boleh diubah setelah masa aktif berjalan.**
    Tanpa aturan ini, klien tinggal memundurkan tanggal mulai
    terus-menerus dan paketnya tidak pernah habis. Sebelum jendela
    dimulai (masih `draft`), bebas diubah.
12. 🔴 **Perpanjangan membuka akses momen saja**, tidak membuka sesi foto
    baru (lihat catatan di bagian 5.5).
13. 🔴 **Akun suspended tidak bisa membuat/mempublikasikan event**, tapi
    event yang sudah live tetap jalan sampai masa aktifnya habis (jangan
    mempermalukan klien di depan tamunya).

Poin 1–3 adalah isi Fase 6 di [peta jalan](05-peta-jalan.md) dan
**syarat mutlak sebelum berjualan** — menjual kuota yang tidak dihitung
server sama saja memberikan produk gratis. Poin 8–12 setara pentingnya:
masa aktif yang tidak ditegakkan = paket seumur hidup.

### 8.1 Status event & transisinya

Status sekarang (`draft`/`live`/`ended`) belum cukup — tidak ada yang
membedakan "sudah diakhiri panitia" dari "kedaluwarsa sendiri". Usulan:

| Status | Artinya | Sesi foto | Akses momen |
|---|---|:--:|:--:|
| `draft` | Belum dipublikasikan | ❌ | ❌ |
| `live` | Dipublikasikan, dalam 7 hari | ✅ | ✅ |
| `ended` | Diakhiri panitia lebih awal | ❌ | ✅ |
| **`expired`** ← baru | Lewat `expiresAt` | ❌ | ❌ (bayar untuk buka) |

`ended` tetap membuka momen karena itu keputusan sadar panitia
("acaranya sudah selesai, tapi kami masih mau bagikan fotonya") — beda
dari `expired` yang memang batas komersial.

Transisi ke `expired` **dihitung dari waktu, bukan disimpan**: begitu
`now > expiresAt`, event dianggap expired. Jangan mengandalkan cron —
kalau cron gagal sekali, event terlanjur bocor terbuka.

---

## 9. Urutan pengerjaan

Diminta "semua", jadi disusun berdasarkan **ketergantungan**, bukan
selera. Tiap tahap bisa dipakai walau tahap berikutnya belum ada.

| # | Pekerjaan | Kenapa urutannya di sini |
|---|---|---|
| 1 | **Pisah panel Staff vs Klien** + `/admin/staff/clients` | Fondasi. Semua yang di bawah menaruh layarnya di salah satu panel — kalau belum dipisah, semuanya harus dipindah ulang nanti. |
| 2 | **Model `Order` + `Plan` katalog + `/admin/staff/plans` & `/orders`** | Harus ada sebelum kuota bisa dijual. Konfirmasi manual dulu. |
| 3 | **Penegakan kuota (Fase 6)** — klaim server, idempoten, layar habis | Syarat mutlak jualan. Tanpa ini paket cuma hiasan. |
| 4 | **Penegakan `PlanFeatures`** di admin & playground | Membuat tier punya arti. Kecil kalau dikerjakan setelah #2. |
| 5 | **Visual Builder** (gabung Tema+Sesi+Teks 2-panel) | Tidak menambah kemampuan, tapi merapikan rumah sebelum klien sungguhan masuk. |
| 6 | **Frame Builder** (dokumen 07) | Paling besar. Bisa ditunda dengan jalan pintas: staff menulis `textLayers` sebagai JSON untuk 2–3 template pertama. |
| 7 | **Database (Fase 7)** | Wajib sebelum admin bisa di-deploy — filesystem Vercel tidak menyimpan tulisan. |

**Catatan:** #7 tidak bisa dilewati sebelum go-live, tapi sengaja ditaruh
akhir karena mengganti penyimpanan lebih mudah setelah bentuk datanya
mengendap — dan sekarang bentuknya masih akan berubah (bagian 7).

---

## 10. Yang masih menggantung

Dicatat supaya tidak hilang, bukan untuk diputuskan hari ini:

1. ⚠️ **Harga** — usulan lengkap ada di 5.5, tinggal disetujui/dikoreksi.
2. ⚠️ **Konfirmasi model paket EO** — bacaan "jatah event di akun, strip
   per event" (bagian 5.2) perlu dipastikan benar sebelum dibangun.
3. ⚠️ **Pesan suara di paket Basic** — kunci total, atau durasi pendek?
   (bagian 6). **Riset pasar 5.4 memperkuat usulan "durasi pendek".**
   Alasannya: pesan suara adalah satu-satunya hal yang tidak bisa
   ditiru photobooth fisik manapun. Kalau Basic tidak mendapatkannya
   sama sekali, pembeli termurah kita mendapat produk yang — dari
   sudut pandang mereka — cuma kamera web dengan bingkai. Mereka tidak
   punya alasan bercerita ke teman, dan tidak punya alasan naik tier
   karena tidak pernah merasakan bedanya. Usulan konkret: Basic 5
   detik, Plus 15 detik, Pro/EO 30 detik (`maxVoiceSeconds` sudah ada
   di model).
4. ✅ ~~Masa aktif event berapa hari?~~ **Diputuskan: 7 hari sejak
   `Event.startAt`** (12 Agustus 2026).
5. ⚠️ **Kebijakan retensi — belum diputuskan, dan ini yang paling
   mendesak dari daftar ini.** Momen wajib disimpan melewati masa aktif
   supaya perpanjangan ada gunanya (aturan 10). Tapi sampai kapan?
   Pilihannya:
   - **Retensi berbatas** (mis. 90 hari setelah expired, lalu dihapus
     permanen) — biaya terkendali, tapi harus diumumkan jelas di syarat
     & ketentuan, dan idealnya kirim peringatan sebelum dihapus.
   - **Retensi selamanya** — klien senang, tapi biaya penyimpanan
     bertambah tiap acara dan tidak pernah berkurang. Untuk 500 acara ×
     200 strip × foto+video, ini jadi angka nyata.

   Tanpa keputusan ini, kita menjanjikan penyimpanan tanpa batas secara
   diam-diam — janji yang mahal dan sulit ditarik kembali.
6. ⚠️ Berapa lama satu paket boleh "menganggur" sebelum dipakai? Kalau
   `startAt` boleh diisi kapan saja, klien bisa membeli sekarang dan
   memakainya 3 tahun lagi. Usulan: paket kedaluwarsa bila `startAt`
   belum diisi/dilewati dalam 12 bulan sejak pembelian.
7. Refund: boleh atau tidak, syaratnya apa.
8. Payment gateway mana (Midtrans/Xendit) dan kapan pindah dari manual.
9. ⚠️ **7 hari berisiko buat EO — pertimbangkan 14 hari untuk tier EO.**
   Untuk klien Personal, 7 hari masuk akal: pengantin mengunduh fotonya
   sendiri dalam seminggu. Untuk EO rantainya lebih panjang: acara →
   EO ambil hasil → EO serahkan ke kliennya → klien EO mengunduh.
   Kalau kadung lewat 7 hari, yang dimarahi bukan kita, tapi **EO oleh
   kliennya** — dan EO yang kena masalah itu tidak akan memakai kita
   lagi. Sudah dimasukkan ke usulan EO Growth (5.5); perlu diputuskan
   apakah EO Starter juga.
10. Harga add-on perpanjangan (Rp 99rb/7 hari) sengaja murah supaya
    terasa wajar, bukan seperti sandera. Kalau ternyata banyak yang
    memperpanjang, itu sinyal masa aktif dasarnya memang kependekan —
    perlu dipantau, jangan langsung disyukuri sebagai pendapatan.

---

## 11. Sumber riset harga

Diambil 12 Agustus 2026:

- [Wedding Market — Harga Sewa Photobooth Pernikahan 2026](https://weddingmarket.com/artikel/harga-sewa-photobooth-pernikahan)
- [Lion5tudio — Harga Photobooth Wedding 2026](https://lion5tudio.com/harga-photobooth-wedding-2026/)
- [Foto Imoet — Paket Photobooth & Printless Scan QR](https://www.fotoimoet.com/photobooth-printless)
- [NALA Photobooth — Jasa Photobooth Jakarta/Bandung](https://nalastudio.id/photobooth/)
- [Clarity Photobooth — Paket Photobooth Surabaya](https://clarity-photobooth.com/paket-photobooth-terlengkap-surabaya/)
- [Snappic — Photo Booth Software Pricing](https://www.snappic.com/pricing)
- [Pixilated — Photo Booth Cost Guide 2026](https://pixilated.com/blogs/main-blog/photobooth-cost)
- [Simple Booth — Plans & Pricing](https://www.simplebooth.com/plans-and-pricing)
