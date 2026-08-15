# Tahap 3 — Portal Klien sesuai BRD: Selesai

Ditulis 15 Agustus 2026, di akhir Langkah 12 rencana Tahap 3
(`docs/BRD/09-DELTA-DARI-IMPLEMENTASI.md` §5). Portal klien **pindah
sepenuhnya** dari `/admin/(protected)/*` (JSON) ke `/app/*` (Postgres) —
lihat `docs/TAHAP-1-SELESAI.md` (fondasi data) dan `docs/TAHAP-2-SELESAI.md`
(portal admin) untuk dua tahap sebelumnya.

---

## 1. Delapan butir, semua selesai

| # | Butir (dok 09 §5) | Rute/berkas utama |
|---|---|---|
| 11 | Rute pindah ke `/app` (D-25) | `app/app/(protected)/*`, `lib/clientAuth.ts` |
| 12 | Wizard 3 langkah, cabang kuota (D-02) | `components/app/CreateEventWizard.tsx`, `/api/app/events` |
| 13 | Cabut kunci satu acara (D-01) | `/api/app/events` — tidak ada pengecekan "sudah punya acara" sama sekali |
| 14 | Alokasi dompet → acara | `lib/db/queries/allocation.ts`, `/app/billing` |
| 15 | Visual Builder baca `template_variables` (D-12) | `components/app/VisualBuilder.tsx`, `/api/app/events/[id]/variables` |
| 16 | Unggah bingkai klien (D-10/D-11) | `lib/db/queries/eventFrames.ts`, validator V1-V8 tersambung |
| 17 | Gerbang publikasi 11 poin (D-24) | `lib/services/eventPublishGate.ts` |
| 18 | `template_snapshot` saat publikasi (D-13) | `/api/app/events/[id]/publish`, AB-14/K9 |

Plus dua penyambung yang tidak disebut namanya di 8 butir tapi wajib
ada supaya butir-butir di atas benar-benar bisa dipakai: halaman **Pilih
Template** (`/app/events/[id]/template`, gerbang poin 6) dan **Detail
Acara** (`/app/events/[id]/details`, field yang bukan bagian wizard
maupun builder).

## 2. Keputusan yang ditanyakan & dijawab selama kerja

1. **Migrasi akun demo** — 3 opsi ditawarkan (perbaiki di tempat / hapus
   bersih & migrasi ulang / biarkan pakai email lain). Dijawab: **hapus
   bersih**. Residu migrasi `--source=seed` Tahap 1 (2 acara demo "Salma
   & Faizal") dihapus, migrasi `--source=live` dijalankan ulang bersih.
2. **Staf vs klien, identitas ganda** — rencana awal saya salah
   mengasumsikan akun demo perlu dipecah jadi staf+vendor sekaligus.
   Ditanya balik ke pemilik produk: ikuti aturan Tahap 1 yang sudah ada
   ("staf tidak punya acara sendiri") — TIDAK dipaksakan dual-identitas.
   Akun demo sekarang murni staf, tidak punya `account`.
3. **Masa aktif acara vendor dari alokasi dompet** — 3 opsi (tanya di
   wizard / ambil dari paket terakhir dibeli / standar 7 hari flat).
   Dijawab: **tanya di wizard**, dari daftar `activeDays` paket yang
   PERNAH dibeli & lunas akun itu (`getActiveDaysOptionsForAccount()`) —
   bukan ditebak, karena dompet vendor bisa campuran beberapa pembelian
   beda masa aktif.
4. **Gerbang publikasi poin 10 (email terverifikasi)** — 3 opsi (bangun
   verifikasi minimal / lewati poin ini / anggap semua terverifikasi
   otomatis). Dijawab awalnya: **anggap terverifikasi otomatis** — TAPI
   ringkasan pekerjaan yang saya tulis salah mengutip jawaban ini (lihat
   riwayat percakapan), dan setelah dicek ulang bersama pemilik produk,
   **DIBATALKAN dan diganti opsi 1** (verifikasi minimal sungguhan).
   Sekarang: token dibuat saat daftar (hash SHA-256 disimpan, bukan
   token mentah — `lib/db/queries/accounts.ts`
   `createEmailVerificationToken`/`verifyEmailToken`), link ditampilkan
   langsung di `/app/verify-email` (mode dev, TIDAK ADA SMTP — sama pola
   "dev-lokal saja" dengan bukti transfer), `GET /api/app/verify-email?token=`
   menandai `emailVerifiedAt` lalu redirect. `emailVerifiedAt` TIDAK
   LAGI otomatis terisi saat daftar. Diuji eksplisit: gerbang poin 10
   gagal saat belum verifikasi, hilang dari daftar gagal begitu
   diverifikasi — bukan cuma baca kode.

## 3. Keputusan teknis yang saya buat sendiri, dicatat di sini

- **Sesi klien (`lib/clientAuth.ts`)** — cookie cuma bawa `{userId, exp}`,
  BUKAN `{accountId, role}` seperti draf rencana awal. `accountId`/`role`
  selalu diambil ULANG dari DB tiap panggilan (`getActiveMembershipByUserId`),
  pola sama `requireStaff()` — supaya perubahan peran (Tahap 5) langsung
  berlaku tanpa re-login.
- **AB-08 (alokasi terkunci setelah live)** — ditafsirkan HANYA
  mengunci arah TARIK (deallocate). Menambah kuota ke acara yang sudah
  `live` tetap boleh (event kehabisan strip di tengah acara bisa
  ditambah) — AB-08 bilang "sisa kuota terkunci DI ACARA itu", bukan
  "tidak boleh ditambah". Dicatat sebagai interpretasi, bukan kutipan
  literal.
- **Zona waktu Indonesia** (`lib/services/indonesiaTimezone.ts`) — offset
  TETAP dihardcode untuk 3 zona (WIB/WITA/WIT), bukan util timezone
  generik — aman karena Indonesia tidak punya DST. Ditulis sendiri,
  bukan menambah dependency `date-fns-tz`/`luxon`.
- **Bug ditemukan & diperbaiki sendiri sebelum sempat jadi masalah**:
  konversi jam wizard awalnya memakai `new Date(input).toISOString()`
  yang salah membaca jam sesuai zona BROWSER, bukan zona yang dipilih
  klien (WIB/WITA/WIT) — diperbaiki pakai `fromLocalInputValue()` sebelum
  diuji, bukan ketahuan dari kegagalan uji.
- **Katalog filter** — `defaultSessionConfig()` sempat memakai id filter
  karangan (`"asli"`, `"lembut"`, `"film"`, `"monokrom"`) yang TIDAK
  cocok katalog nyata `lib/services/filters.ts` (`"none"`, `"cerah"`,
  dst.). Ditemukan & diperbaiki saat menyambungkan booth tamu (Langkah
  10), sebelum sempat dipakai acara sungguhan.

## 4. Gap yang ditemukan di kode Tahap 2 (bukan salah Tahap 3, dicatat karena baru ketahuan sekarang)

- **Tidak ada rute HTTP untuk mengisi `templates.sample_data`** —
  gerbang penerbitan TEMPLATE (dok 04 §4.4 poin 7, Tahap 2) mensyaratkan
  ini terisi untuk variabel wajib, tapi CMS Tahap 2 tidak pernah
  membangun form untuk itu. Disiasati lewat skrip sekali-pakai
  (query-layer langsung) untuk menyiapkan 2 template uji ("Wedding
  Klasik", "Wisuda Formal" — persis contoh dok 06 §2.3) yang dipakai
  menguji Visual Builder dinamis. Perbaikan sungguhan di luar cakupan
  Tahap 3.

## 5. Keterbatasan jujur yang disengaja, bukan lupa

- **[DIPERBAIKI 16 Agu 2026]** ~~Compositor belum mengenal variabel
  dinamis~~ — temuan ini semula ditulis terlalu sempit (cuma soal
  bingkai) dan dampaknya lebih besar dari yang dicatat: booth tamu
  TIDAK PERNAH mengambil `event_variable_values` sama sekali (bukan
  cuma "tidak tersubstitusi di bingkai") — `EventConfig` tidak punya
  field untuk itu, `WelcomeScreen.tsx` tidak tahu cara menampilkannya.
  Artinya template kategori non-wedding (Wisuda, Ulang Tahun, dst.)
  SECARA PRAKTIK belum layak dijual ke klien sungguhan — isian
  Visual Builder tersimpan tapi hilang senyap dari pengalaman tamu.
  Diperbaiki cakupan minimal (keputusan pemilik produk): `EventConfig.variables`
  baru (`lib/event.ts`), diisi `resolvePostgresPlayground.ts` dari
  `event_variable_values` + label/usedIn dari snapshot beku,
  `tokensFor()` mencampurnya ke token compositor (bingkai), `WelcomeScreen.tsx`
  menampilkan daftar generik label:nilai untuk `usedIn='welcome'` di
  luar 5 token standar. Diuji nyata: template Wisuda Formal (4 variabel
  custom) tampil lengkap di booth. **Kartu video pesan suara & teks
  bagikan (`usedIn='video_card'`/`'share'`) SENGAJA masih belum
  disambungkan** — gap terpisah, dampaknya lebih kecil (bukan bagian
  pengalaman utama tamu), didokumentasikan di sini supaya tidak lupa.
- **Voice max duration tidak dibatasi plafon paket** — dicatat langsung
  di UI builder ("belum ditegakkan di Tahap 3").
- **`/app/settings`, galeri Momen di `/app/*`** — belum dibangun, di
  luar 8 butir. Rute lama yang mengarah ke sana diarahkan ke `/app`
  (dashboard) sebagai jatuh balik yang aman.
- **Root `/`** (`resolvePlaygroundPrimary()`) tetap membaca JSON, tidak
  ikut dipindah ke Postgres — booth tamu sungguhan selalu lewat
  `/e/{slug}` (sudah Postgres-first), akses via root bukan jalur normal
  produk.
- **Peran Manager/Operator** — kolom & gerbang permission
  (`requireAccountRole`, hierarkis owner⊇manager⊇operator) SUDAH benar
  dan diuji (`scripts/test-account-migration.ts`), tapi TIDAK ADA UI
  mengundang anggota (D-08/D-09, memang dijadwalkan Tahap 5).

## 6. Pembersihan (Langkah 11)

- Rute klien JSON lama (`/admin` dashboard, `/admin/account`,
  `/admin/billing`, `/admin/events/[id]/*`, `/admin/register`) sekarang
  **redirect** ke padanan `/app/*`-nya (bukan 404 mendadak).
- `/admin/login` sekarang staf-saja (`users.platform_role`, bukan
  `Client.isStaff`) — tautan "Daftar" dihapus dari halaman itu.
- Rute staf Tahap 2 yang diparkir karena tabrakan nama direname ke nama
  BRD asli: `/admin/system-frames`→`/admin/frames`,
  `/admin/purchase-orders`→`/admin/orders` (API dan UI, termasuk semua
  `fetch()`/`Link` internal yang sempat luput saat rename pertama kali
  dan ketahuan lewat sapuan `grep` + uji nyata).
- **20+ berkas kode klien JSON lama dihapus** setelah diverifikasi nol
  referensi (`CreateEventWizard`, `VisualBuilder`+6 layar `builder/Session*`,
  `CreateFrameWizard`, `FrameLibrary`, `TextLayerEditor`,
  `EventPublishEditor`, `EventInfoEditor`, `EventSummary`,
  `EventTemplatePicker`, `EventPageShell`, `MomentsAdmin`,
  `AdminDashboard`, `BillingOverview`, `OrdersPanel`,
  `AddonPurchaseModal`, `AccountEditor`, + rute API JSON
  `events`/`register`/`orders`/`frames` lama).
- **Kesalahan yang ditemukan sendiri lewat `tsc` sebelum jadi masalah**:
  `lib/services/eventKind.ts` dan `lib/services/planCatalog.ts` sempat
  ikut terhapus (ada di daftar rencana), padahal keduanya MASIH dipakai
  nyata oleh `components/admin/AdminShell.tsx` (nav klien lama, dead
  code tapi masih di-compile) dan `lib/services/staffData.ts` (panel
  staf `/admin/staff/*` yang TETAP dipertahankan). Dipulihkan lewat
  `git checkout HEAD --` begitu `tsc` menunjukkan modul hilang — bukan
  lolos tak terlihat.

## 7. Uji yang dijalankan (semua lulus, dicatat jujur)

- `npx tsc --noEmit` — bersih.
- `npm run build` — lolos, semua rute (termasuk `/app/*` baru dan
  `/admin/frames`, `/admin/orders` hasil rename) berhasil dikompilasi.
- 5 skrip regresi permanen — SEMUA LULUS:
  - `scripts/test-quota-concurrency.ts` (K1, 50 klaim bersamaan → tepat 1 sukses)
  - `scripts/test-ledger-properties.ts` (K2, 200 operasi acak, 0 penyimpangan saldo)
  - `scripts/test-frame-validator.ts` (V1-V8, PNG asli lolos + 4 skenario rusak ditolak)
  - `scripts/test-order-lifecycle.ts` (pemisahan komit `approveOrder()`)
  - `scripts/test-account-migration.ts` (baru, Langkah 1 — migrasi + hierarki peran)
- **Verifikasi email (koreksi)**: daftar akun baru → `emailVerifiedAt`
  NULL (dicek langsung ke DB) → `POST /api/app/verify-email` terbitkan
  token → `GET .../verify-email?token=...` menandai terverifikasi,
  redirect sukses → klik ulang token yang sama ditolak (`invalid`,
  sekali pakai) → token asal-asalan ditolak → gerbang poin 10 diuji
  langsung memakai `canPublishEvent()`: gagal saat `emailVerifiedAt`
  NULL, poin 10 hilang dari daftar gagal begitu diverifikasi.
- **Alur penuh nyata** (Playwright, klik browser sungguhan + verifikasi
  langsung ke DB): daftar akun vendor baru → staf setujui top-up dompet →
  buat acara (wizard 3 langkah, alokasi 50 strip dari dompet) → pilih
  template "Wedding Klasik" (form berubah sesuai kategori) → Visual
  Builder tampil 4 variabel dinamis persis milik template itu → isi &
  simpan (identitas + variabel + session config tersimpan benar,
  diverifikasi lewat query DB langsung) → gerbang 11 poin lolos →
  terbitkan → `status='live'`, `template_snapshot` terisi lengkap →
  booth tamu (`/e/{slug}`) merender sapaan & sapaan besar dari snapshot
  beku → `/api/quota/claim` dengan `sessionId` sukses & idempoten.
- **K5 (isolasi akun)** diuji berulang kali: akun lain tidak bisa buka
  order/acara akun lain (404, bukan data bocor).
- **AB-14/K9** diuji eksplisit: ubah warna template ASLI setelah acara
  publish → `template_snapshot` acara TIDAK berubah (dicek langsung ke
  kolom DB, bukan cuma baca kode).

## 8. Definisi Selesai Tahap 3

- [x] 8 butir dok 09 §5 (11-18) semua ada dan berfungsi, diuji nyata
- [x] D-01 tercabut — akun personal boleh punya acara lebih dari satu
- [x] D-02 — wizard 3 langkah tetap, kuota ditanyakan di langkah 3, bercabang `accounts.type`
- [x] Visual Builder dinamis terbukti — ganti template, form berubah tanpa sentuh kode
- [x] Validator V1-V8 tersambung ke jalur klien, bukan cuma staf
- [x] Gerbang 11 poin ditegakkan server-side, bukan cuma UI
- [x] `template_snapshot` beku terbukti tidak ikut berubah saat template asli diedit
- [x] K1 (klaim kuota serentak) tetap tegak melalui perubahan pemanggil
- [x] Semua rute lama pensiun lewat redirect, bukan 404 mendadak
- [x] Dokumen ini ditulis jujur termasuk kesalahan yang ditemukan & diperbaiki sendiri
