# 08 — Adopsi Desain & Teknologi dari VlassBirthdayPlanner (Glyka PartyBox)

> Breakdown proyek referensi `D:\02_Projects\VlassBirthdayPlanner-main` (nama
> produk di dalamnya: **Glyka PartyBox**) — waktu dokumen ini ditulis, brand
> aplikasi kita masih "Glyka". Ini dokumen ANALISIS untuk didiskusikan dulu,
> **belum ada kode yang diubah**. Sumber: `overview.md`, `brs.md`,
> `prompt_guide.md`, dan pembacaan langsung kode di `web/`.
>
> **⚠️ Update 2026-08-11 — rebrand ke Circle Snap.** Token warna admin yang
> dijelaskan di dokumen ini (pink→oranye #FF3366/#FF9933, hasil adopsi dari
> Glyka PartyBox) sudah **DIGANTI** ke palet resmi Circle Snap (navy #0A1F44
> / blue #1976F3, dari `public/logo/Circle_Snap_Brand_Guidelines_v1.0.pdf`).
> Struktur & pola interaksi (wizard 4-langkah, kartu dashboard, Framer
> Motion, dst.) yang dijelaskan di sini TETAP relevan — cuma warnanya yang
> berubah. Lihat riwayat commit untuk detail migrasinya.

## 1. Apa itu proyek referensi

Glyka PartyBox = platform perencana pesta ulang tahun (bukan photobooth) dari
brand Glyka yang sama. Purwarupa penuh, belum production (localStorage,
belum Supabase/Stripe sungguhan). Dua mode: **Anak** (pelacakan alergi,
tema ceria) dan **Dewasa** (budget, dress code, tema elegan). Model bisnis:
bayar-per-acara (Basic gratis / PRO Rp99.000), mirip semangat "jual per
strip" kita tapi bukan strip foto — kuota tamu & fitur.

Dua screenshot yang kamu kirim sebelumnya (dashboard "Pilih Pesta Anda" dan
modal "Setup Pesta Baru") persis dari `web/app/[locale]/dashboard/page.tsx`
proyek ini — sudah saya cocokkan baris per baris.

## 2. Kabar baik dulu: font & warna brand KITA SUDAH SELARAS

Sebelum masuk ke gap, ini penting — dua fondasi terbesar sebenarnya **sudah
sama** tanpa perlu perubahan:

| Token | Referensi (Glyka PartyBox) | Kita (Glyka Photobooth) | Status |
|---|---|---|---|
| Font utama | Plus Jakarta Sans (`next/font/google`) | Plus Jakarta Sans (`app/layout.tsx:5`, sudah jadi `--font-sans`/`--font-display`) | ✅ **Sudah sama persis** |
| Warna ungu brand | `--clr-primary: #7C3AED` | `--color-brand-purple: #7c3aed` | ✅ **Sudah sama persis** |
| Warna pink/aksen | `--clr-kids-primary: #EC4899` | `--color-flash: #ec4899` | ✅ **Sudah sama persis** |
| Ikon | `lucide-react` | `lucide-react` (sudah terpasang) | ✅ **Sudah sama** |
| Framework | Next.js (App Router) | Next.js 15 (App Router) | ✅ Selaras (beda versi minor, mereka Next 16) |

Ini bukan kebetulan — dua produk memang satu keluarga brand. Artinya kerja
adopsi jauh lebih kecil dari kelihatannya di awal: bukan mulai dari nol,
tinggal menyelaraskan **bagian yang benar-benar beda**.

## 3. Yang benar-benar beda

| Aspek | Referensi | Kita sekarang |
|---|---|---|
| **Palet dasar** | **Terang** — putih/abu muda (`#FAFAFA`), teks gelap | **Gelap** — navy ink (`#1e1b4b`), teks terang. Sengaja: playground = "photobooth di ruang gelap" ([[project_glyka_photobooth]]) |
| **Styling** | Vanilla CSS + **inline style objek** langsung di JSX (hampir tidak ada Tailwind utility dipakai walau ter-install) | Tailwind v4 utility classes + `@theme` tokens |
| **Animasi** | **Framer Motion** di hampir semua transisi (modal, sidebar, page transition, hover) | CSS keyframes tulisan tangan, tanpa library |
| **State/data** | `useState` + `localStorage`, tanpa backend nyata (prototype) | Repository pattern + file JSON + API routes server-authoritative ([[project_glyka_photobooth]] fase blueprint SaaS) |
| **Struktur komponen** | Monolitik — 1 file `dashboard/page.tsx` **1850 baris**, semua state & JSX campur | Komponen kecil terpisah per tanggung jawab (`EventInfoEditor`, `EventThemeEditor`, dst.) |
| **i18n** | `next-intl`, EN/ID | Hardcode Bahasa Indonesia saja |
| **Struktur folder** | `app/[locale]/(dashboard)/{adult,kids}/...` per mode | `app/admin/(protected)/...` |

## 4. Sistem token desain referensi (ekstraksi lengkap)

Dari `web/app/globals.css` — ini "bahasa visual" mereka:

```css
/* Radius */
--radius-sm: 6px;   --radius-md: 12px;
--radius-lg: 20px;  --radius-xl: 32px;  --radius-full: 9999px;

/* Shadow */
--shadow-sm: 0 1px 3px rgba(0,0,0,.08);
--shadow-md: 0 4px 16px rgba(0,0,0,.10);
--shadow-lg: 0 12px 40px rgba(0,0,0,.14);
--shadow-glow-purple: 0 0 30px rgba(124,58,237,.35);

/* Neutral (mode terang) */
--clr-bg: #FAFAFA;   --clr-surface: #FFFFFF;
--clr-border: #E4E4E7;  --clr-text: #18181B;  --clr-text-muted: #71717A;
```

Pola komponen kunci (semua lewat class utility + inline style, bukan
komponen React terpisah):
- **`.glass`** — `rgba(255,255,255,.7)` + `backdrop-filter: blur(16px)` (glassmorphism)
- **`.btn-primary`** — gradient ungu→ungu-tua, `translateY(-2px)` + shadow lebih tebal saat hover
- **`.card`** — putih, border tipis, radius 20px, shadow naik saat hover
- **`.badge-*`** — pil kecil warna solid pastel (success hijau, danger merah, purple, dst.)
- **`.sidebar` / `.sidebar-link`** — 260px tetap, link aktif berlatar `--clr-primary-light`
- **`.progress-bar` / `.progress-fill`** — gradient ungu→pink
- **Wizard modal** — `AnimatePresence` fade+scale masuk, progress bar 4 segmen, tiap step slide horizontal (`x: 20 → 0`)

Pola interaksi micro (lewat class, bukan Framer Motion, ini yang PALING
murah untuk diadopsi):
```css
.card-hover:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,.08); }
.btn-press:active { transform: scale(0.96); }
.fade-in { animation: fadeIn .3s ease-out; }
```

## 5. Kenapa saya TIDAK merekomendasikan meniru semuanya 1:1

Dua hal di atas (state `useState`+`localStorage`, komponen monolitik 1800
baris) itu bukan pilihan gaya — itu konsekuensi dari mereka masih fase
**prototype tanpa backend**. Kita sudah lewat fase itu: seluruh sesi kerja
sebelumnya ([[project_glyka_photobooth]]) dihabiskan justru untuk membangun
kebalikannya — repository pattern, kuota server-authoritative (bukan
localStorage yang gampang dicurangi tamu), komponen kecil bertanggung jawab
tunggal supaya gampang dites & di-maintain. Menukar itu balik ke
`useState`+`localStorage` monolitik akan jadi **kemunduran**, bukan
mengikuti standar yang lebih baik — referensi mereka justru menuju arah kita
("🚧 Tahap Selanjutnya: Integrasi Supabase" — mereka SEDANG migrasi ke
backend sungguhan, target akhirnya mirip yang sudah kita punya).

**Rekomendasi**: adopsi **bahasa visual & interaksi** (token warna/radius/
shadow mode terang, Framer Motion, pola komponen glass/card/badge/wizard),
pertahankan **arsitektur data** kita (repo pattern, API routes, model
TypeScript ketat). Analoginya: ganti baju, bukan ganti kerangka.

## 6. Ruang lingkup yang diusulkan

Palet gelap kita di playground BUKAN pilihan sembarangan — ada alasan
fungsional (wajah tamu tersinari benar saat difoto di ruang gelap,
[[project_glyka_photobooth]] gotcha #1). Playground tamu tidak diusulkan
ikut jadi terang. Yang diusulkan disamakan:

| Bagian | Skema warna | Alasan |
|---|---|---|
| **Admin** (`/admin/*`) | Ganti ke **mode terang** ala referensi | Ini yang di-screenshot user, konteksnya "dashboard kerja" bukan "pengalaman tamu" |
| **Playground tamu** (`/e/[slug]`) | **Tetap gelap**, tetap dinamis per-event (tema wedding/lamaran dst.) | Fungsional (pencahayaan wajah) + itu produk inti yang sudah divalidasi berkali-kali sesi ini |
| **Landing / halaman publik** (`/`) | Belum ada — kalau nanti dibuat, bisa terang ala referensi | Di luar cakupan saat ini |

## 7. Rencana adopsi bertahap (diusulkan)

**Fase A — Fondasi token & font** (murah, aman)
- Tambah blok token mode terang (`--clr-bg`, `--clr-surface`, dst. dari
  bagian 4) ke `app/globals.css`, di-namespace supaya tidak bentrok dengan
  token gelap playground (mis. prefix `--admin-*` atau scope ke
  `.admin-root`)
- Font: tidak perlu kerja tambahan — sudah `--font-jakarta` di semua tempat

**Fase B — Komponen dasar admin**
- Port class utility: `.card`, `.btn-primary/secondary/ghost`, `.badge-*`,
  `.input`, `.progress-bar`, `.sidebar-link`, `.card-hover`, `.btn-press`
  (bagian 4) — scoped ke admin
- Restyle `AdminShell.tsx` (sidebar+topbar) mengikuti pola sidebar referensi
  (bagian 5): grup "Pesta Aktif"-style switcher kalau nanti multi-client,
  search bar di topbar, notifikasi

**Fase C — Framer Motion**
- Install `framer-motion`
- Terapkan ke: `CreateEventWizard` (transisi antar step, sudah ada
  strukturnya tinggal ganti CSS transition → `AnimatePresence`), modal
  overlay (fade+scale), toast/notifikasi, page transition antar tab editor

**Fase D — Restyle halaman admin yang sudah ada**
- `AdminDashboard.tsx` (grid kartu) → palet terang + `.card-hover`
- `CreateEventWizard.tsx` → visual step 4-langkah ala referensi (progress
  bar pink/ungu, kartu pilihan besar dengan check badge)
- `EventInfoEditor` / `EventThemeEditor` / `EventSessionEditor` → input
  style konsisten dengan `.input`/`.label` referensi

**Di luar cakupan (sengaja tidak diusulkan sekarang)**:
- `next-intl` — kita produk Bahasa Indonesia tunggal untuk vendor event
  lokal, belum ada kebutuhan bilingual yang disebutkan
- Menukar Tailwind admin → 100% inline style — Tailwind v4 kita sudah
  cukup fleksibel meniru token yang sama, tidak perlu ganti pendekatan
- Menukar repo pattern/API → `useState`+`localStorage` — kemunduran
  arsitektur, lihat bagian 5

## 8. Keputusan (dikonfirmasi 2026-08-11)

1. **Playground tamu ikut terang juga** — bukan cuma admin. Ini
   membalikkan rekomendasi bagian 6 (playground tetap gelap). Catatan
   implementasi yang tetap perlu dijaga meski chrome-nya terang: langkah
   **Foto** (`StepShoot`) kemungkinan tetap butuh area sekitar viewport
   kamera gelap/kontras tinggi murni untuk pencahayaan wajah — ini nuansa
   teknis, bukan pembatalan keputusan, ditangani saat masuk Fase E.
2. **Framer Motion** — install sebagai dependency baru, dipakai di semua
   transisi (wizard, modal, page transition) mengikuti pola referensi.
3. **Mulai eksekusi sekarang** — lanjut Fase A–D lalu Fase E (playground,
   ditambahkan di bawah).

## 8b. Status eksekusi

**Fase A–D: SELESAI** (2026-08-11). `framer-motion` terpasang. Token
`.admin-*` ditambahkan di `app/globals.css`. Direstyle: `AdminShell`,
halaman login, `AdminDashboard` (grid kartu + card-hover), `CreateEventWizard`
(transisi antar step pakai `AnimatePresence`/`motion.div`), header
`events/[id]/page.tsx`, `EventEditorTabs`, `EventInfoEditor`,
`EventThemeEditor`, `EventSessionEditor`, chrome `PlaygroundPreview`.
Diverifikasi lewat screenshot Playwright di tiap layar (login, dashboard,
wizard step 1 & 2, tab Info/Tema/Sesi) — visual cocok dengan bahasa desain
referensi, dan `tsc`/`npm run build` tetap bersih (15 route). `iframe`
preview mobile di `PlaygroundPreview` SENGAJA belum ikut berubah (masih
menampilkan playground gelap) — itu memang cakupan Fase E di bawah, bukan
terlewat.

## 9. Fase E — Playground tamu (ditambahkan setelah keputusan bagian 8)

Cakupan lebih besar dari admin: `WelcomeScreen`, `StepFrame`, `StepShoot`,
`StepVoice`, `StepResult`, `StripCanvas`, `MomentsGallery`,
`FrameAssembly`, `EventBooth` — 9 komponen, semuanya baca `EventTheme`
per-event ([[project_glyka_photobooth]]) yang saat ini didesain untuk
palet gelap (`ink` = latar gelap). Beralih ke terang berarti nilai
`EventTheme` tiap event (termasuk data seed Sal&Faizal/Lamaran) perlu
ditinjau ulang, bukan cuma CSS admin. Dikerjakan sebagai tahap terpisah
setelah admin selesai, supaya progres bisa diverifikasi bertahap — pola
yang sama dipakai sepanjang sesi ini (tiap tab admin diuji end-to-end
sebelum lanjut ke berikutnya).
