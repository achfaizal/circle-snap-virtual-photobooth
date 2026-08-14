# Audit Awal — Keadaan Repo Apa Adanya

**Tanggal:** 14 Agustus 2026
**Sifat dokumen:** Pemetaan, bukan rencana kerja. Tidak ada kode yang diubah, tidak ada dependensi dipasang, tidak ada migrasi dijalankan untuk menghasilkan laporan ini.
**Metode:** Seluruh klaim di bawah diverifikasi langsung ke berkas sumber (dibaca, di-grep, atau diuji baca-saja lewat shell). Rujukan `berkas:baris` bisa dibuka langsung. Bagian yang tidak bisa dipastikan ditulis eksplisit sebagai **"belum jelas"**, bukan ditebak.

---

## 1. Peta repo

### 1.1 Struktur folder

```
app/
  admin/
    (protected)/          ← SELURUH portal klien ADA DI SINI (lihat §4)
      account/             menu Akun klien
      billing/              menu Paket & Billing klien
      events/[id]/          ruang kerja SATU acara (7 sub-halaman)
      frames/                Pustaka Bingkai (klien + staff, dibedakan lewat kepemilikan)
      staff/                 panel staff — clients, events (baru, 2 halaman)
      layout.tsx             gerbang sesi + pemilih menu klien/staff
      page.tsx                dashboard klien (redirect ke /staff kalau isStaff)
    login/                  form masuk (dipakai klien MAUPUN staff)
    register/                form daftar (klien saja)
  api/
    admin/                  20 route — events, frames, assets, orders, akun, login
    moments/                 4 route — daftar/unggah momen tamu
    quota/claim/             1 route — klaim kuota (lihat §3)
  e/[slug]/                  booth tamu publik
  page.tsx                   root "/" — LIHAT TEMUAN §7.1 (bukan index, langsung booth)

components/
  admin/                    52 komponen: shell, wizard, editor bingkai/tema,
                             builder 7-langkah, tabel staff, dll.
  (10 komponen booth tamu di root components/ — EventBooth, StepFrame,
   StepShoot, StepVoice, StepResult, WelcomeScreen, dst.)

lib/
  models/                   6 tipe data inti: client, event, frame, theme, plan, order, asset
  repo/                     lapisan penyimpanan (lihat §2) — index.ts (kontrak),
                             json-file.ts (implementasi), json-store.ts (mesin file+lock)
  services/                 12 berkas: katalog paket/addon, siklus hidup acara,
                             deteksi slot, tema, filter, dll.
  adapters/                 legacy.ts + resolvePlayground.ts — jembatan model baru
                             ke bentuk lama yang dipahami komponen booth
  adminAuth.ts, camera.ts, compositor.ts, copy.ts, event.ts, moments.ts,
  slug.ts, store.ts, templates.ts, utils.ts, video.ts, voice.ts

data/
  *.json                   data hidup (lihat §2) — SEMUANYA KOSONG saat ini
  seed/*.seed.json          data awal untuk clone baru
  _hidden/                  3 folder cadangan manual dari sesi kerja sebelumnya

docs/
  BRD/                      00–09, dibaca untuk audit ini
  ALUR-PLAYGROUND.md        aturan alur booth tamu (masih berlaku, lihat CLAUDE.md §2)
  ADMIN-DESIGN-BRIEF.md     arah visual admin — lihat TEMUAN §7.5, dilanggar luas
  blueprint/                11 dokumen perencanaan LAMA (sebelum BRD ada) —
                             CLAUDE.md tidak merujuknya lagi di §2, tapi kode
                             MASIH mengutip nomornya di banyak komentar (lihat §1.3)
```

### 1.2 Modul yang sudah ada (fungsional, teruji manual)

| Modul | Bukti |
|---|---|
| Booth tamu 4 fase (Sambutan→Bingkai→Potret→Suara→Hasil) | `components/EventBooth.tsx`, `lib/store.ts:16` |
| Compositing kanvas (kertas→foto→bingkai→teks) | `lib/compositor.ts` |
| Deteksi slot otomatis dari alpha PNG | `lib/services/slots.ts` |
| Editor layer teks bingkai (WYSIWYG) | `components/admin/frame-editor/TextLayerEditor.tsx` |
| Visual Builder 7 langkah | `lib/services/builderSteps.ts`, `components/admin/VisualBuilder.tsx` |
| Wizard buat acara | `components/admin/CreateEventWizard.tsx` |
| Klaim kuota atomik (lihat §3) | `app/api/quota/claim/route.ts` |
| Order/addon manual transfer | `lib/models/order.ts`, `app/api/admin/orders/*` |
| Panel staff (Klien, Acara) — **baru, sesi ini** | `components/admin/staff/*`, `app/admin/(protected)/staff/*` |
| Galeri Momen (Vercel Blob / folder lokal) | `lib/moments.ts`, `app/api/moments/*` |

### 1.3 Yang tampak tidak dipakai lagi

| Hal | Bukti | Catatan |
|---|---|---|
| `docs/blueprint/*` (11 dokumen) | Tidak dirujuk di CLAUDE.md §2 "Sumber kebenaran" | **Tapi** puluhan komentar kode di seluruh repo masih menyebut nomornya (`docs/blueprint/09-brd-model-bisnis.md §7.4` dsb, mis. `lib/models/event.ts:128`, `lib/services/eventLifecycle.ts:2`). Belum jelas apakah blueprint ini formal digantikan BRD atau masih jadi rujukan sejarah yang sengaja dibiarkan. |
| `data/_hidden/*` | 3 folder cadangan manual (`README.md`, `hapus-akun-2026-08-14-1254/`, `reset-2026-08-13-2359/`) | Sisa operasi pembersihan manual sesi sebelumnya, bukan bagian sistem yang berjalan. |
| `data/events.json.11656.1786617095184.tmp` | Berkas nyasar 2,4 KB di `data/` | Sisa tulis-atomik yang gagal `rename` — kemungkinan proses `next dev` dimatikan paksa di tengah tulis. Tidak merusak (isi lama tetap di `events.json`), tapi mengotori direktori data. Belum dibersihkan. |
| `m_*.png` (8 berkas) di root repo | Tangkapan layar lama (`m_frame.png`, `m_welcome.png`, dst.) | Tidak dirujuk kode manapun (`grep` kosong). Kemungkinan aset dokumentasi lama. |
| `lib/templates.ts` | Komentar di berkas sendiri: *"Setelah playground pindah membaca lewat repository, `lib/templates.ts` dihapus"* (baris 7) | Migrasi itu **sudah terjadi** (booth membaca lewat `lib/adapters/legacy.ts`), tapi berkasnya belum dihapus — masih dipakai murni untuk tipe `Template`/`Slot`/`TextLayer` (lihat impor di `lib/compositor.ts:1`, `lib/store.ts:4`). |

---

## 2. Di mana data disimpan sekarang

**Semuanya berkas JSON lokal atau konstanta di kode. Tidak ada database.**

### 2.1 Data "hidup" (`data/*.json`)

| Berkas | Isi | Baris saat ini |
|---|---|---|
| `data/clients.json` | Akun (klien + staff, satu tabel) | 1 baris — cuma akun staff demo |
| `data/events.json` | Acara | **0** — dikosongkan manual sesi lalu |
| `data/frames.json` | Bingkai (sistem + unggahan klien, satu tabel) | **0** |
| `data/assets.json` | Aset gambar (dekorasi, latar video, overlay bingkai) | 9 baris (dekorasi & latar video sisa) |
| `data/orders.json` | Pesanan addon | **0** |
| `data/subscriptions.json` | Langganan (kuota per-acara) | **0** |

Mesinnya: `lib/repo/json-store.ts` — kelas `JsonCollection` generik, satu instance per tabel di `lib/repo/json-file.ts:21-29`. Detail teknis:

- **Lock file** (`*.lock`) mengunci baca-ubah-tulis, bukan antrean di memori — diperbaiki 2026-08-14 setelah insiden nyata data event hilang (`lib/repo/json-store.ts:32-56`, komentar panjang menjelaskan kronologinya).
- **Tulis atomik**: tulis ke `.tmp`, lalu `rename` (`lib/repo/json-store.ts:178-183`).
- **Data awal dari seed**: kalau berkas koleksi belum ada, disalin sekali dari `data/seed/*.seed.json` (`lib/repo/json-store.ts:147-163`).
- ⚠️ **Batas jujur yang ditulis sendiri di kode**: *"filesystem Vercel bersifat sementara dan tidak bisa ditulis di luar request yang sedang berjalan… HANYA bekerja benar di lokal"* (`lib/repo/json-file.ts:7-10`). Artinya **seluruh sistem ini tidak berfungsi kalau di-deploy ke Vercel** — setiap tulisan (akun baru, acara baru, klaim kuota) akan hilang begitu request selesai, karena filesystem Vercel di-reset tiap cold start.

### 2.2 Data sebagai konstanta di kode (bukan JSON, bukan DB)

| Data | Berkas | Baris |
|---|---|---|
| Katalog paket (harga, kuota, fitur) — **rupiah sungguhan tertulis di kode** | `lib/services/planCatalog.ts:31-130` | 5 paket: Basic 249rb, Plus 449rb, Pro 799rb, EO Starter 1.149jt, EO Growth 3.299jt |
| Katalog addon (top-up, perpanjangan) | `lib/services/addons.ts` | belum dibaca detail baris, tapi pola sama (komentar `lib/services/planCatalog.ts:1-7` menyebutnya eksplisit) |
| Kategori acara (`EventKind` + metadata) | `lib/services/eventKind.ts` | 5 kategori: wedding, engagement, graduation, birthday, other — hardcode, bukan tabel `event_categories` |
| Template playground | `lib/services/playgroundTemplates.ts` | Array `PLAYGROUND_TEMPLATES` — **saat ini kosong** (dikosongkan manual sesi lalu, lihat komentar di berkas itu sendiri) |
| Preset warna tema | `lib/services/theme.ts` | `THEME_PRESETS` — 10 palet hardcode |
| Katalog font | Peta ganda di `lib/adapters/legacy.ts:50-76` | 11 font, harus disinkronkan manual 3 tempat (lihat komentar `lib/adapters/legacy.ts:29-41`) |

Ini **persis** D-05 di dokumen delta, dan sekaligus melanggar larangan eksplisit CLAUDE.md §6: *"Menyimpan kuota, harga, atau aturan bisnis sebagai konstanta di kode — semua dari database."*

### 2.3 Media tamu (foto, video, suara)

Dua backend dipilih lewat `process.env.VERCEL` (`lib/moments.ts`, `app/api/moments/config/route.ts`):

- **Lokal (`next dev`)** → `public/moments-local/{KODE_EVENT}/` — saat ini berisi **7 folder** sisa pengujian manual (`ACHMAD-FAIZAL`, `ENGAGEMENT-SALFAIZAL`, `FAIZAL`, `RANI-BAGAS`, `SALMA-FAIZAL`, dan lainnya).
- **Vercel** → Vercel Blob, prefix `moments/{KODE_EVENT}/`, token di `.env.local` (`BLOB_READ_WRITE_TOKEN`).

Tidak ada database yang mencatat metadata momen — daftar momen **dibangun ulang tiap request** dari nama berkas di storage (`app/api/moments/route.ts:34-55`). Tidak ada `strips` table, tidak ada `receipt_no` (D-29), tidak ada `strip_photos` mentah per slot (D-30) — hanya strip final yang tersusun yang diunggah (dikonfirmasi di `components/StepResult.tsx:194-218`, cuma `photoBlob`/`videoBlob` hasil `render()`, bukan foto per slot).

---

## 3. Cara kuota dihitung dan diklaim

### 3.1 Bentuk data

**Bukan buku besar. Penghitung tunggal.** `lib/models/plan.ts:55-63`:

```ts
export interface Subscription {
  stripQuota: number;   // kuota total
  stripUsed: number;    // TERPAKAI — angka tunggal, ditambah langsung
  ...
}
```

Tidak ada tabel `quota_ledger`, tidak ada baris jurnal per pergerakan. Ini **persis** D-03.

### 3.2 Jalur klaim

```
components/StepResult.tsx:130  →  POST /api/quota/claim { eventId }
app/api/quota/claim/route.ts:24-31  →  repo.subscriptions.claimStrip(eventId)
lib/repo/json-file.ts:127-141  →  subscriptions.mutateOne(...)
lib/repo/json-store.ts:238-250  →  withLock(): baca → cek → tulis, dalam satu genggaman lock file
```

### 3.3 Tiga jawaban yang diminta

**(a) Keputusan di server atau di perangkat tamu?**
**Di server.** `POST /api/quota/claim` (`app/api/quota/claim/route.ts:16`) yang memutuskan berhasil/gagal — perangkat tamu tidak pernah menghitung sisa kuota sendiri. Ini sesuai AB-02, dan kode sendiri mencatat ini sebagai jawaban atas temuan lama (`app/api/quota/claim/route.ts:4-8`: *"kuota sebelumnya dihitung di localStorage PERANGKAT TAMU"*).

**(b) Apakah klaimnya atomik?**
**Ya, untuk kondisi balapan (race) di dalam satu proses lokal** — `mutateOne()` menggenggam lock file selama baca-cek-tulis (`lib/repo/json-store.ts:238-250`), diverifikasi lewat stress test 8 permintaan bersamaan pada sesi kerja sebelumnya (bukan 50 seperti disyaratkan BRD §6.1 dok 08 — **belum diuji pada skala itu**).

Tapi **atomik ≠ tahan-dobel-klaim (idempoten) di level API.** `POST /api/quota/claim` tidak menerima `session_id` sama sekali (`app/api/quota/claim/route.ts:17`: body cuma `{ eventId }`). Proteksi dobel-klaim yang ada murni **di sisi klien**, ditulis eksplisit di komentar rute itu sendiri (`app/api/quota/claim/route.ts:10-14`):

> *"Idempoten secara longgar lewat penjaga `claimed` ref di StepResult.tsx (React Strict Mode tidak memanggil dua kali) — bukan lewat idempotency key di sini."*

Konsekuensinya: kalau permintaan yang **sama** dikirim ulang oleh jaringan (retry otomatis browser, tab dobel, refresh di saat kritis), server **tidak punya cara membedakannya** dari sesi baru — kuota akan terpotong dua kali untuk satu strip. Ini bertentangan langsung dengan BRD dok 07 §5.1 poin 3 (*"Periksa kunci idempoten... kalau `session_id` ini sudah pernah mengklaim, kembalikan hasil yang sama"*) dan dok 02 §3.5.

**(c) Apakah ada riwayat pergerakan kuota?**
**Tidak ada.** Tidak ada tabel/berkas jurnal apa pun. `stripUsed` cuma angka yang ditambah di tempat (`lib/repo/json-file.ts:137-140`). Kalau klien protes "kuota saya habis padahal tamu cuma 80", tidak ada cara membuktikan apa pun selain melihat angka akhir — persis skenario yang diperingatkan BRD dok 02 §3.1.

### 3.4 Temuan tambahan soal kuota (di luar tiga pertanyaan di atas)

Order `new_plan` (pembelian paket saat bikin acara) **memberikan kuota penuh SAAT ACARA DIBUAT**, bukan saat pembayaran dikonfirmasi staff — dikonfirmasi di `app/api/admin/events/route.ts:211` (`subscriptionFromPlan(...)` dipanggil tanpa syarat) vs `app/api/admin/events/route.ts:233+` (Order dibuat terpisah, status `pending`, murni jejak — dikonfirmasi lewat komentar `lib/models/order.ts:8-14`). Artinya **klien bisa memakai kuota penuh sebelum staff menandai pembayarannya lunas.** Ini bertentangan dengan alur `paid → fulfilled` di BRD dok 02 §4.1.

---

## 4. Rute yang sudah ada

### 4.1 Daftar lengkap

**Halaman (`app/**/page.tsx`, `layout.tsx`):**

| Rute sekarang | Untuk siapa (nyata) | Cocok CLAUDE.md §5? |
|---|---|---|
| `/admin` (dashboard) | Klien | ❌ — ini portal klien, harusnya `/app` |
| `/admin/account` | Klien | ❌ |
| `/admin/billing` | Klien | ❌ |
| `/admin/events/[id]` (+6 sub-halaman: info, template, visual, frames, moments, publish) | Klien | ❌ |
| `/admin/frames`, `/admin/frames/[id]` | Klien (+ staff untuk bingkai sistem) | ❌ campur |
| `/admin/login` | **Klien DAN staff — satu form yang sama** | ❌ campur |
| `/admin/register` | Klien | ❌ — harusnya publik `/register` atau `/app/register` |
| `/admin/staff/clients` | Staff | ✅ isinya benar, ❌ prefix-nya salah (masih di bawah `/admin` yang sama dengan klien) |
| `/admin/staff/events` | Staff | ✅ isinya benar, ❌ prefix-nya salah |
| `/e/[slug]` | Tamu | ✅ sudah sesuai |
| `/` (root) | Tamu — **lihat TEMUAN §7.1** | ⚠️ berfungsi tapi arsitekturnya salah |

**API (`app/api/**/route.ts`), 25 route total:**

| Grup | Rute | Untuk siapa |
|---|---|---|
| Sesi | `POST /api/admin/login`, `POST /api/admin/logout` | Klien + staff |
| Akun klien | `GET/PATCH /api/admin/account`, `PATCH /api/admin/account/password`, `POST /api/admin/register` | Klien |
| Acara | `GET/POST /api/admin/events`, `GET/PATCH/DELETE /api/admin/events/[id]` | Klien (staff ditolak buat, boleh kelola) |
| Bingkai | `GET/POST /api/admin/frames`, `.../[id]`, `.../detect` | Klien + staff |
| Aset | `POST /api/admin/assets` | **Siapa pun yang login** — lihat TEMUAN §7.3 |
| Pesanan | `GET/POST /api/admin/orders`, `.../[id]/confirm`, `.../[id]/cancel` | Klien + staff |
| Momen (tamu) | `GET /api/moments`, `POST /api/moments/upload`, `POST /api/moments/upload-local`, `GET /api/moments/config` | **Tanpa autentikasi sama sekali** — lihat TEMUAN §7.2 |
| Kuota | `POST /api/quota/claim` | Tamu (memang sengaja publik) |

### 4.2 Kesimpulan soal pembagian §5 CLAUDE.md

**Belum ada satu pun rute `/app/*`.** Seluruh portal klien hidup di `/admin/*`, disatukan dengan panel staff yang baru dibangun lewat pembeda `Client.isStaff` (boolean) + redirect di `app/admin/(protected)/page.tsx:18`, **bukan** lewat pemisahan rute/domain. Ini D-25, dan tingkat keparahannya lebih tinggi dari yang tersirat di dokumen delta: bukan cuma "portal klien perlu pindah folder", tapi **klien dan staff login lewat form yang sama** (`app/admin/login/page.tsx` melayani keduanya) dan **berbagi satu `layout.tsx` gerbang sesi** (`app/admin/(protected)/layout.tsx`) yang membaca `Client.isStaff` untuk menentukan menu mana yang ditampilkan (`components/admin/AdminShell.tsx:126`). Tidak ada isolasi di level routing/middleware — cuma percabangan render.

---

## 5. Model pengguna & akun

### 5.1 Bentuk data sekarang

Satu tipe `Client` (`lib/models/client.ts:7-83`) merangkap **empat konsep BRD sekaligus**: `users`, `accounts`, `account_members`, dan `users.platform_role`.

| Field `Client` sekarang | Field BRD yang seharusnya terpisah |
|---|---|
| `id`, `email`, `passwordHash` | → `users.id/email/password_hash` |
| `name` | → `users.full_name` |
| `whatsapp` | → `users.phone_wa` |
| `type: "personal" \| "vendor"` | → `accounts.type` |
| `businessName` | → `accounts.business_name` |
| `isStaff: boolean` | → `users.platform_role` (harusnya enum 4 nilai: `super_admin`/`admin`/`support`/null, sekarang cuma ya/tidak) |
| `eventSlotsTotal`, `planId` | → seharusnya turunan dari `packages`/`orders`, sekarang field mentah di akun |
| *(tidak ada)* | `account_members` — **tidak ada sama sekali** |

### 5.2 Apakah akun vs pengguna sudah terpisah?

**Tidak.** Satu baris `Client` = satu login = satu "akun". Tidak ada konsep satu akun dengan banyak pengguna. Konsekuensi konkret:

- **Tidak mungkin ada `manager` atau `operator`** (D-08) — tidak ada tabel keanggotaan untuk menyimpannya.
- **Tidak mungkin ada penugasan operator ke acara** (D-09) — tidak ada `event_assignments`.
- Vendor yang mau berbagi akses ke krunya **harus membagikan password akun `owner`-nya secara harfiah** — persis risiko yang diperingatkan BRD dok 01 §2.6.

### 5.3 Apakah `type` (personal/vendor) sudah berdampak nyata?

**Sebagian — lebih jauh dari yang tersirat "baru pilihan saat daftar" di D-07, tapi masih jauh dari model BRD.**

Yang **sudah** ditegakkan (bukan cuma disimpan):
- `type === "personal"` dibatasi 1 acara seumur akun (`app/api/admin/events/route.ts:112-118`) — **ini justru bertentangan dengan BRD, D-01 sudah menandainya BATAL.**
- `type !== "personal"` (vendor) dibatasi `eventSlotsTotal` (`app/api/admin/events/route.ts:172-181`).
- Wizard mensyaratkan pemilihan paket di percabangan `audience` yang cocok (`app/api/admin/events/route.ts:152-165`).

Yang **belum** ada sama sekali:
- Tidak ada dompet strip (`cached_wallet_balance`) — kuota vendor sekarang berbentuk **`eventSlotsTotal`** (jatah JUMLAH ACARA, angka kecil seperti 3 atau 10 di `lib/services/planCatalog.ts:93,112`), **bukan** saldo strip yang bisa dialokasikan bebas antar acara seperti dirancang BRD dok 02 §1 (mode `flexible`, minimum 600 strip). Ini beda mendasar, bukan sekadar belum lengkap — model vendor sekarang lebih dekat ke "paket personal berulang" daripada "dompet fleksibel".

---

## 6. Tabel status D-01 sampai D-30

Legenda status: ✅ sudah sesuai · ❌ belum ada · ⚠️ bertentangan (ada tapi salah bentuk)

| Kode | Ringkasan | Status | Bukti berkas | Besar kerja |
|---|---|---|---|---|
| D-01 | "Acara Sendiri = 1 acara" harus dicabut | ⚠️ **masih ditegakkan**, berlawanan arah dari BRD | `app/api/admin/events/route.ts:112-118` | S |
| D-02 | Paket dipilih di langkah 3 wizard, bercabang per `type` | ⚠️ ada tapi di langkah campuran (bukan langkah 3 murni "Kuota"), dan field lokasi/tagar/sambutan/sapaan **juga** ditanya di wizard padahal BRD ingin ditunda (lihat §7.4) | `components/admin/CreateEventWizard.tsx:173` (step `"plan"` opsional, urutan `kind→plan→detail→summary`) | M |
| D-03 | Kuota jadi buku besar | ❌ tidak ada tabel jurnal sama sekali | `lib/models/plan.ts:55-63` (`stripUsed` angka tunggal) | **L** |
| D-04 | Dompet strip vendor | ❌ tidak ada; diganti `eventSlotsTotal` (jatah JUMLAH ACARA, bukan saldo strip) | `lib/models/client.ts:64-72`, `lib/services/planCatalog.ts:93,112` | **L** |
| D-05 | Pindah dari JSON/kode ke database | ❌ 100% belum — lihat §2 lengkap | `lib/repo/json-file.ts`, `lib/services/planCatalog.ts` | **L** |
| D-06 | Portal Admin / CMS | ❌ hanya 2 dari 14 modul BRD dok 04 §1 ada (Klien, Acara — baca-saja, tanpa CRUD) | `app/admin/(protected)/staff/*` | **L** |
| D-07 | Jenis akun `personal`/`vendor` berdampak ke data | ⚠️ **lebih dari sekadar pilihan** (lihat §5.3), tapi bentuknya beda dari model BRD (dompet vs jatah-acara) | `lib/models/client.ts:56` | M |
| D-08 | Anggota tim & peran manager/operator | ❌ tidak ada tabel keanggotaan sama sekali | — (tidak ditemukan) | **L** |
| D-09 | Penugasan operator ke acara | ❌ bergantung D-08 | — | M |
| D-10 | Unggah bingkai oleh klien | ✅ **sudah ada dan berfungsi** | `app/api/admin/frames/route.ts`, `components/admin/CreateFrameWizard.tsx` | — |
| D-11 | Validasi bingkai otomatis | ⚠️ **hanya 3 dari 8 pemeriksaan ada, dan ambangnya beda dari BRD** — lihat rincian di §7.11 | `lib/services/slots.ts`, `components/admin/CreateFrameWizard.tsx:138` | S–M |
| D-12 | `template_variables` sebagai data (beda per template) | ❌ Visual Builder pakai field identitas TETAP (`names`, `date`, `venue`, `hashtag`, `greeting` — hardcode di `EventIdentity`), bukan definisi variabel per-template | `lib/models/event.ts:20-38` | M |
| D-13 | `template_snapshot` saat publikasi | ❌ tidak ada field snapshot di `Event`; acara merujuk `templateId` langsung (`lib/models/event.ts:137`) | `lib/models/event.ts` | M |
| D-14 | Jejak audit | ❌ tidak ditemukan tabel/mekanisme audit log apa pun | — | M |
| D-15 | Pemberitahuan (email/WA) | ❌ tidak ditemukan | — | M |
| D-16 | Retensi & penghapusan media | ❌ tidak ditemukan field `retention_until`/`expires_at` di aset momen | — | M |
| D-17 | Pembersihan EXIF | ❌ **nol** — `grep -rn "exif"` di seluruh `app/lib/components` kosong total | — (dikonfirmasi via pencarian menyeluruh) | S |
| D-18 | Galeri privat bawaan | ⚠️ **tidak ada gate sama sekali**, lebih parah dari "periksa nilai bawaan" — lihat TEMUAN §7.2 | `app/api/moments/route.ts:88-93` | S–M |
| D-19 | Tombol tamu hapus foto sendiri | ❌ tidak ditemukan | — | S |
| D-20 | Mode Lokasi | ❌ tidak ditemukan | — | M |
| D-21 | QR PDF siap cetak | ❌ hanya PNG (lihat `EventPublishEditor.tsx` pakai `qrcode` → `toDataURL`, tidak ada jalur PDF) | `components/admin/EventPublishEditor.tsx:57` | S |
| D-22 | Voucher | ❌ tidak ditemukan | — | M |
| D-23 | 2FA staf platform | ❌ tidak ditemukan sama sekali di `lib/adminAuth.ts` | `lib/adminAuth.ts` | M |
| D-24 | Gerbang publikasi 5→11 poin | ⚠️ **5 poin ada** (`EventPublishEditor.tsx:69-77`: bingkai, nama, tanggal, sambutan, jadwal mulai) — poin 6-11 (template dipilih, variabel wajib, kuota>0, pesanan lunas, email diverifikasi, minimal 1 tombol unduh) **belum ada** | `components/admin/EventPublishEditor.tsx:69-77` | S–M |
| D-25 | Rute klien pindah `/admin`→`/app` | ❌ 0% — lihat §4.2 lengkap, termasuk temuan form login disatukan | seluruh `app/admin/(protected)/*` | **L** |
| D-26 | Pesanan + nominal unik + verifikasi | ⚠️ **ada tapi lebih sederhana** — Order + status pending/paid/cancelled ada, tapi **tidak ada nominal unik** (BRD: total+3 digit acak untuk pencocokan mutasi bank), tidak ada `proof_asset_id` unggah bukti transfer di alur order yang ditemukan | `lib/models/order.ts` | S |
| D-27 | Peringatan jadwal mulai menetap | ⚠️ **teks kecil biasa, bukan peringatan menetap** — satu baris `text-xs text-muted` di bawah field, bobot visual sama dengan hint field lain, tidak ada warna/ikon/kotak peringatan, dan isinya keliru menyebut "7 hari" untuk semua paket padahal ada paket 14 hari (lihat §7.6) | `components/admin/EventInfoEditor.tsx:158-162` | S |
| D-28 | Momen: moderasi + unduh massal + status unggah | ⚠️ **unduh massal (zip) ADA dan lengkap** (`MomentsAdmin.tsx:100-143`, pakai JSZip) — tapi **moderasi satu-klik (sembunyikan foto) TIDAK ADA sama sekali**: tidak ada field `isHidden` di model manapun, tidak ada tombol sembunyikan di `MomentsAdmin.tsx`. "Status unggah" (`pending_upload`) juga tidak ada — wajar, karena momen tidak punya baris database sama sekali (dibangun ulang dari nama berkas tiap request, lihat §2.3) | `components/admin/MomentsAdmin.tsx` (grep "isHidden"/"Sembunyikan" kosong total) | S–M |
| D-29 | Nomor strip (`receipt_no`) | ❌ tidak ditemukan field ini di model manapun | — | S |
| D-30 | Simpan foto mentah per slot | ❌ dikonfirmasi tidak ada — hanya strip final yang diunggah | `components/StepResult.tsx:194-218` | M |

**Ringkasan cepat:** dari 30 item — **1 sudah sesuai** (D-10) · **9 ada tapi bertentangan/salah bentuk** (D-01, D-02, D-07, D-11, D-18, D-24, D-26, D-27, D-28) · **20 belum ada sama sekali**. Tidak satu pun beres tanpa catatan.

---

## 7. Temuan di luar delta

Ini bagian yang paling penting menurut instruksi tugas. Diurutkan dari yang paling berbahaya.

### 7.1 Root domain `/` menampilkan acara acak milik klien acak

`app/page.tsx:16` memanggil `resolvePlaygroundPrimary()` yang isinya (`lib/adapters/resolvePlayground.ts:66-72`):

```ts
const events = await repo.events.list();          // TANPA filter clientId
const primary = events.find((e) => e.status === "live");  // event LIVE PERTAMA, siapa pun pemiliknya
```

Begitu ada **dua klien berbeda** dengan acara `live` bersamaan, siapa yang tampil di root domain ditentukan urutan penyimpanan berkas — bukan logika bisnis apa pun. Ini peninggalan arsitektur lama ("situs untuk satu klien", tertulis eksplisit di komentar `app/page.tsx:6-7`) yang belum disesuaikan sama sekali dengan model multi-tenant BRD. Setiap event punya `/e/{slug}` sendiri yang benar (dan itu yang akan dipakai QR sungguhan), jadi dampak praktisnya mungkin kecil — **tapi** ini pelanggaran langsung prinsip K5 (*"setiap kueri data klien wajib ter-scope ke account_id"*) yang sengaja dicontohkan CLAUDE.md sebagai aturan paling gampang dilanggar tanpa sadar.

### 7.2 Galeri Momen tidak punya gerbang privasi sama sekali — bukan cuma "bawaan publik", tapi tanpa gerbang

`GET /api/moments?event={kode}` (`app/api/moments/route.ts:88-151`) **tidak memanggil `requireAdminSession()` atau pemeriksaan apa pun.** `{kode}` adalah `event.slug` (`lib/adapters/legacy.ts:147`, dipakai sebagai `event.code`) — string yang sama yang tercetak di QR publik dan URL `/e/{slug}` yang dibagikan ke ratusan tamu.

Akibatnya: **siapa pun yang tahu atau menebak slug acara bisa mengunduh seluruh galeri — semua foto, semua video pesan suara, semua nama tamu — lewat panggilan API langsung, terlepas dari:**
- Apakah `session.moments.enabled` menyala atau tidak (itu cuma mematikan TOMBOL di UI, bukan mengunci API-nya).
- Apakah acara `draft`, `ended`, atau `expired` (route ini tidak memeriksa status acara sama sekali).
- Pengaturan privasi apa pun — karena memang **tidak ada** field `gallery_public` di model `Event` sekarang.

Ini bukan D-18 yang "diperluas" — ini kategori beda dari yang dibayangkan D-18 (D-18 mengasumsikan sudah ada gerbang, tinggal dicek nilai bawaannya). Kenyataannya **tidak ada gerbang untuk diperiksa nilai bawaannya.** Mengingat AB-20 dan §2.4 BRD dok 08 eksplisit menyebut foto anak-anak di acara ulang tahun, ini kandidat kuat risiko #1 di §8.

### 7.3 Unggahan aset klien selalu tercatat sebagai milik sistem (`clientId: null`)

`app/api/admin/assets/route.ts:20-70` cuma memeriksa `requireAdminSession()` (siapa pun yang login, klien mana pun) — **tapi baris 61-70 selalu membuat record dengan `clientId: null`**, yaitu label "milik pustaka bersama Circle Snap", terlepas dari siapa yang mengunggah. Bandingkan dengan `app/api/admin/frames/route.ts:61` yang **benar** menetapkan `clientId: client.isStaff ? null : client.id`.

Dampaknya sekarang mungkin tidak kelihatan (karena `Frame` yang jadi unit tampilan tetap tercatat benar per klien), tapi record `Asset` di baliknya kehilangan info kepemilikan aslinya secara struktural. Kalau nanti ada fitur "aset saya" per klien, atau audit siapa mengunggah apa, datanya sudah cacat sejak titik masuknya.

### 7.4 Wizard buat acara menanyakan field yang BRD sengaja ingin ditunda

`components/admin/CreateEventWizard.tsx` langkah `"detail"` meminta: **Sapaan besar, Lokasi, Tagar, Sambutan** (baris 413, 418, 424, 430) — sebelum acara bahkan dibuat. BRD dok 05 §4 eksplisit: wizard cuma boleh menanyakan yang **dibutuhkan untuk membuat** (kategori + nama, lalu jadwal, lalu kuota); lokasi/tagar/sambutan/sapaan masuk **Detail Acara** setelah acara ada, dijaga gerbang publikasi — bukan wizard.

Lebih jauh: **wizard sekarang sama sekali tidak menanyakan jadwal mulai (`startAt`)** — field paling kritis secara komersial (menentukan kapan masa aktif habis, AB-09) baru bisa diisi setelah acara dibuat, lewat menu Detail Acara terpisah (`components/admin/EventInfoEditor.tsx:72`). Ini kebalikan dari BRD dok 05 Langkah 2 yang menjadikan jadwal mulai wajib di wizard dengan peringatan menetap.

### 7.5 Portal admin melanggar `ADMIN-DESIGN-BRIEF.md` secara luas dan konsisten

`CLAUDE.md` §6 melarang eksplisit: *"Membuat sidebar di portal admin"*, *"box-shadow melayang, radius > 2px, atau gradien"*. `ADMIN-DESIGN-BRIEF.md` §11 mengulanginya sebagai larangan nomor satu. Kenyataan di kode:

- **`components/admin/AdminShell.tsx:442`** — `<aside className="hidden w-[260px] ... sm:flex">` — sidebar statis 260px, selalu tampil di layar ≥ 640px. Ini **bukan pelanggaran kecil**, ini fondasi navigasi seluruh admin.
- **8 berkas** di `components/admin/**/*.tsx` memakai `linear-gradient`/`brand-gradient` (`grep` dikonfirmasi).
- **8 berkas** memakai `boxShadow`.
- **Puluhan** pemakaian `borderRadius` di atas 2px, termasuk `999`/`9999` (bentuk pil) di 9+11 tempat.

Ini bukan satu-dua komponen yang lupa — ini pola konsisten di seluruh admin, termasuk komponen yang dibangun paling akhir (panel staff, `DataTable.tsx`, `EventTemplatePicker.tsx`). Artinya **seluruh permukaan admin yang sudah dibangun perlu dirancang ulang dari nol** mengikuti brief, bukan cuma dipindah folder ke `/app`. Ini melipatgandakan besar kerja D-25 jauh di atas "pindah rute".

### 7.6 `startAt` yang diedit ulang bisa diam-diam memendekkan masa aktif klien paket besar

`app/api/admin/events/[id]/route.ts:99-106`:

```ts
await repo.subscriptions.update(subscription.id, {
  startsAt: safePatch.startAt,
  expiresAt: computeExpiresAt(safePatch.startAt),   // ⚠️ tanpa argumen `days`
});
```

`computeExpiresAt(startAt, days = ACTIVE_DAYS)` (`lib/services/eventLifecycle.ts:25`) jatuh ke **konstanta hardcode 7 hari** kalau `days` tidak diisi. Tapi `Subscription.expiresAt` yang PERTAMA kali dibuat (`subscriptionFromPlan()`, `lib/models/plan.ts:70-94`) memakai **`plan.activeDays`** — yang untuk paket Pro/EO Growth **14 hari**, bukan 7 (`lib/services/planCatalog.ts:80,121`).

Konsekuensinya: klien paket 14 hari yang membetulkan jadwal mulainya (mis. salah ketik jam) lewat Detail Acara akan **diam-diam kehilangan setengah masa aktifnya** tanpa pesan apa pun — sistem menghitung ulang pakai 7 hari, bukan 14 hari paketnya. Ini persis kelas bug yang diperingatkan BRD dok 02 §7 soal sengketa masa aktif, tapi arahnya terbalik: bukan klien salah isi jadwal, tapi **sistem sendiri yang salah menghitung ulang**.

### 7.7 Seluruh pekerjaan sesi ini belum ter-commit

`git log` menunjukkan commit terakhir (`35f3564`, "Redesign shooting session UX...") mendahului **seluruh** lapisan repo/model data, Order/Billing, katalog Plan, sistem Template+Bingkai berpasangan, panel staff, dan perbaikan bug race-condition file lock — semuanya yang dibahas di §1-§6 dokumen ini. `git status --short` menghitung **63 berkas** belum di-commit. Kalau lingkungan kerja hilang sebelum ini di-commit (crash disk, salah `git reset`, dsb.), pekerjaan berminggu-minggu hilang tanpa jejak git sama sekali. Ini bukan gap fitur — ini risiko operasional yang murni soal kebiasaan kerja, tapi besarannya sepadan dengan risiko teknis manapun di dokumen ini.

### 7.8 Kata sandi disimpan dengan `scrypt`, bukan Argon2id yang disyaratkan BRD

`lib/adminAuth.ts:95-101` memakai `node:crypto` bawaan (`scryptSync`), bukan Argon2id (BRD dok 08 §1.1, dok 01 §5). `package.json` tidak mencantumkan dependensi Argon2 apa pun. Fungsional untuk kebutuhan sekarang, tapi menyimpang dari standar yang ditetapkan BRD dan perlu keputusan sadar (ganti pustaka, atau ubah BRD-nya) — bukan dibiarkan diam-diam.

### 7.9 Tidak ada rate limiting, tidak ada percobaan-gagal-dikunci, tidak ada 2FA, tidak ada header keamanan

Diverifikasi lewat pencarian menyeluruh:
- `app/api/admin/login/route.ts` — tidak ada penghitung percobaan gagal (BRD: 5×/15 menit → jeda bertingkat).
- Tidak ada `middleware.ts` di root repo sama sekali.
- `next.config.ts` cuma berisi `reactStrictMode: true` — tidak ada `headers()` untuk CSP/HSTS/`X-Content-Type-Options`.
- Tidak ada dependensi rate-limiting (Upstash, dsb.) di `package.json`.
- Sesi staff dan klien memakai **TTL yang sama** (7 hari, `lib/adminAuth.ts:26`) — BRD membedakan 30 hari klien vs 8 jam staff.
- **Rahasia sesi = `ADMIN_PASSWORD`** kalau `ADMIN_SESSION_SECRET` tidak diisi (`lib/adminAuth.ts:28-29`) — `.env.local` sekarang **tidak punya `ADMIN_SESSION_SECRET`**, jadi kunci penandatanganan HMAC sesi sekarang **sama persis** dengan password login staff demo. Kalau password itu pernah dibagikan (dan memang didesain sebagai kredensial demo yang dikomunikasikan, lihat `lib/adminAuth.ts:12-13`), siapa pun yang tahu password itu bisa memalsukan token sesi siapa saja.

### 7.10 Tidak ada satu pun automated test

`package.json` tidak punya skrip `test`. Pencarian `*.test.ts(x)`, `*.spec.ts`, `__tests__` di seluruh repo (di luar `node_modules`) kosong. Klaim "sudah diuji" di sepanjang riwayat kerja sesi-sesi sebelumnya selalu berarti **pengujian manual sekali jalan** (skrip Playwright sekali pakai di scratchpad, dihapus setelahnya), bukan regresi yang bisa dijalankan ulang. BRD dok 08 §6.1 mensyaratkan uji serentak klaim kuota dan uji properti buku besar — keduanya mustahil dijalankan berulang tanpa suite yang tersimpan.

### 7.11 Validasi bingkai: 3 dari 8 pemeriksaan BRD ada, dan yang ada pun beda ambang

`lib/services/slots.ts:51-150` (fungsi `detectSlots`) dan `components/admin/CreateFrameWizard.tsx:138` adalah satu-satunya validasi yang ada. Dicocokkan ke 8 pemeriksaan wajib BRD dok 06 §5.1:

| # | Pemeriksaan BRD | Status | Catatan |
|---|---|---|---|
| V1 | PNG berkanal alpha | ❌ | Tidak ada pemeriksaan eksplisit sebelum diproses `pngjs` |
| V2 | Ukuran berkas ≤ 8 MB | ❌ | Tidak ditemukan di jalur unggah manapun |
| V3 | Dimensi 600–6000 px | ❌ | Tidak ditemukan |
| V4 | Area transparan ≥ 3% kanvas | ⚠️ **beda bentuk** | `MIN_AREA = 5000` piksel **absolut** (`lib/services/slots.ts:41`), bukan persentase relatif kanvas. Bingkai resolusi rendah bisa ditolak keliru; bingkai resolusi sangat tinggi bisa meloloskan noise yang seharusnya dibuang. |
| V5 | Jumlah slot 1–6 | ⚠️ **cuma batas bawah** | `CreateFrameWizard.tsx:138` cuma cek `slots.length > 0` — tidak ada batas atas 6 |
| V6 | Transparansi slot ≥ 95% piksel | ⚠️ **ambang beda, sifat beda** | `fillRatio` (`lib/services/slots.ts:115`) konsepnya sama, tapi ambangnya **0.85** (`SUSPICIOUS_FILL_RATIO`, baris 45) bukan 0.95, dan cuma jadi **peringatan `suspicious`** — BRD mewajibkan ini jadi **penolakan keras** |
| V7 | Slot tidak tumpang-tindih | ✅ (tersirat) | Terpenuhi otomatis oleh cara kerja algoritma connected-component (tiap piksel cuma dikunjungi sekali) — bukan hasil pemeriksaan eksplisit, tapi hasilnya benar |
| V8 | Slot di dalam kanvas | ✅ (tersirat) | Bounding box dihitung dari koordinat piksel asli, tidak mungkin keluar kanvas |

Ringkasnya: **fondasi algoritma deteksinya solid** (port dari Python yang sudah dipakai nyata, komentar `lib/services/slots.ts:1-4`), tapi **lapisan penolakan/penerimaan di sekitarnya belum dibangun**. Sekarang klien bisa mengunggah PNG 40MB beresolusi 200px dengan 30 slot tanpa ditolak sama sekali — sistem akan mencoba memprosesnya apa adanya.

### 7.12 Dokumentasi dalam-kode yang sudah basi (drift kecil, disebut supaya tidak menyesatkan)

- `lib/models/client.ts:64-71` — komentar bilang `eventSlotsTotal` *"BELUM ditegakkan"*, padahal sudah (`app/api/admin/events/route.ts:172-181`). Komentar ini ketinggalan satu perubahan.
- `lib/models/asset.ts:9-12` — komentar menjanjikan jalur Vercel Blob untuk aset (`assets/{clientId}/`), padahal `app/api/admin/assets/route.ts:23-28` **menolak total** semua upload aset kalau `process.env.VERCEL` — jalur itu tidak pernah diimplementasikan.

Bukan bug fungsional, tapi kalau dipakai sebagai dasar keputusan arsitektur tanpa dicek ulang ke kode, bisa menyesatkan.

---

## 8. Lima risiko terbesar

Diurutkan dari yang paling mahal kalau ditunda — bukan dari yang paling mudah dikerjakan.

### 1. Tidak ada gerbang privasi galeri Momen sama sekali (§7.2)

Ini satu-satunya temuan di dokumen ini yang bisa berujung **kebocoran data pribadi sungguhan** (foto dan suara tamu, berpotensi anak-anak) ke pihak yang tidak berhak, hari ini juga, kalau ada acara sungguhan berjalan sebelum ini diperbaiki. Semua risiko lain di bawah ini soal "sistem belum lengkap"; ini soal "sistem yang ada sekarang bisa dipakai untuk hal yang salah." Diperbaiki bersamaan dengan D-17 (EXIF) dan D-18 (privat bawaan) karena satu paket kerja yang sama.

### 2. Model akun tunggal (`Client`) menyatukan 4 konsep BRD (§5)

Ini persis peringatan "empat hal jangan ditunda" di dokumen delta §6 soal multi-akun — dan buktinya sudah kelihatan sekarang: menambah `account_members` belakangan berarti menulis ulang **setiap** query yang menganggap "satu login = satu pemilik data" (hampir semua route `/api/admin/*` sekarang memeriksa `client.id` langsung terhadap `resource.clientId`). Semakin banyak fitur ditambahkan di atas asumsi ini (dan panel staff yang baru dibangun sesi ini SUDAH menambahnya), semakin mahal membongkarnya.

### 3. Kuota berbentuk penghitung, bukan buku besar, DAN klaimnya tidak idempoten di server (§3)

Digabung jadi satu risiko karena akar masalahnya sama: tidak ada jejak yang bisa dipakai membuktikan atau membetulkan pergerakan kuota. Ditambah temuan §7 bahwa `new_plan` memberi kuota sebelum pembayaran dikonfirmasi (§3.4) — kombinasi keduanya berarti kuota bisa menyimpang dari uang yang benar-benar masuk, dan tidak ada cara menelusuri ke mana perginya.

### 4. Seluruh permukaan admin melanggar brief desain secara struktural (§7.5)

Bukan risiko keamanan atau data, tapi risiko **kerja yang harus diulang**. Sidebar statis adalah fondasi navigasi, bukan detail kosmetik — memperbaikinya berarti menyusun ulang `AdminShell.tsx` dan kemungkinan besar pola navigasi di puluhan halaman yang bergantung padanya. Semakin banyak halaman CMS baru dibangun di atas pola sekarang (dan D-06 menyisakan 12 dari 14 modul yang belum dikerjakan), semakin banyak yang harus dirombak ulang.

### 5. Filesystem lokal sebagai penyimpanan satu-satunya, tanpa jalur produksi (§2.1, §2.3)

Kode sendiri sudah mengaku: *"HANYA bekerja benar di lokal... Admin baru bisa di-deploy setelah database beneran."* Ini bukan kejutan (D-05 sudah menandainya prioritas tinggi), tapi disebut di sini karena efeknya menggandakan: **tidak ada satu pun fitur di atasnya** — akun, acara, kuota, pesanan, momen — yang bisa dianggap "selesai" dalam artian bisa dipakai klien sungguhan, sampai fondasi ini pindah. Setiap hari kerja yang dihabiskan menyempurnakan fitur di atas JSON adalah kerja yang berpotensi perlu disentuh ulang saat migrasi, khususnya bagian yang menulis langsung ke bentuk penyimpanan (bukan lewat `Repo` interface yang sudah ada di `lib/repo/index.ts` — itu satu hal yang **sudah benar** di sini dan patut dipertahankan sebagai batas migrasi).

---

*Dokumen ini pemetaan sesaat. Satu hal yang masih ditandai "belum jelas" dan sengaja tidak ditebak: apakah `docs/blueprint/*` formal digantikan BRD atau masih rujukan sejarah yang sengaja dipertahankan (§1.3) — satu-satunya keputusan yang butuh jawaban manusia, bukan pembacaan kode lebih dalam.*
