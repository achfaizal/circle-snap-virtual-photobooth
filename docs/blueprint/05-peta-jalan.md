# Blueprint 05 — Peta Jalan

> Urutan pengerjaan. Disusun berdasarkan **ketergantungan teknis**, bukan
> seberapa menarik fiturnya. Fase yang lebih awal membuka fase berikutnya.
>
> Ukuran: `S` ≈ sekali duduk · `M` ≈ beberapa sesi · `L` ≈ pekerjaan besar

---

## Aturan main

1. **Playground yang sudah live tidak boleh rusak** di fase mana pun.
   Ia sedang dipakai acara sungguhan.
2. Tiap fase diakhiri dengan **regresi**: `tsc`, `build`, dan uji Playwright
   alur tamu penuh (sudah ada skripnya di scratchpad).
3. Admin dibangun & diuji **di lokal** sampai Fase 6.

---

## Fase 0 — Fondasi Data `L` ← wajib pertama

**Tujuan:** playground berhenti membaca array hardcoded, mulai membaca
lewat repository. **Tampilan tidak berubah sama sekali.**

Pekerjaan:
- `lib/models/*` — tipe dari dokumen 02
- `lib/repo/index.ts` (interface) + `lib/repo/json-file.ts` (implementasi)
- Migrasi 2 event + 10 bingkai yang ada → `data/seed/*.json`
- Refactor `EventBooth` menerima prop `event` + `frames` (bukan `code`)
- Refactor `StepFrame`/`StepShoot`/`StepVoice`/`StepResult` membaca
  `session.*` dari event, bukan konstanta
- `app/e/[slug]/page.tsx` dan `app/page.tsx` memakai repo

**Selesai bila:** playground tampil & berfungsi persis seperti sekarang,
tapi seluruh datanya berasal dari JSON. Screenshot sebelum/sesudah identik.

**Kenapa ini dulu:** tanpa ini, admin tidak punya tempat menulis dan
preview tidak mungkin jujur. Semua fase lain menumpuk di sini.

---

## Fase 1 — Kerangka Admin `M`

- `/admin/login` + cookie session bertanda tangan
- Shell admin (sidebar, header, penjaga auth)
- Dashboard: daftar event dari repo
- Editor tab **Info** saja — CRUD event yang benar-benar tersimpan
- Autosave draft

**Selesai bila:** bisa membuat event baru dari admin, lalu membukanya di
`/e/{slug}` dan sesi foto berjalan penuh.

---

## Fase 2 — Preview Hidup + Editor Tema `L`

- Komponen `<LivePreview>` — `EventBooth` sungguhan di dalam bingkai HP,
  dengan pemilih langkah dan kamera dimatikan
- Tab **Tema**: 9 warna dengan label manusiawi, preset gelap/terang
- Pemeriksa kontras
- Upload dekorasi sudut + latar kartu video
- Toggle efek (kelopak, blob, konfeti)
- Katalog font (perluas dari 3 font sekarang)
- **Sekalian:** jadikan warna kartu video ikut tema (temuan 06-T2)

**Selesai bila:** klien bisa membuat tema baru dari nol dan melihat
hasilnya seketika, tanpa satu baris kode pun.

---

## Fase 3 — Bingkai `L` ← bagian tersulit

- `lib/services/slots.ts` — port algoritma deteksi Python → Node (`pngjs`)
- `POST /api/admin/frames/detect`
- Alur upload dengan umpan balik hasil deteksi
- `<SlotEditor>` — geser/resize/tambah/hapus/urutkan, input angka presisi
- Pratinjau isi memakai `compose()` yang asli
- Pustaka bingkai + duplikat

**Selesai bila:** upload PNG baru → slot terdeteksi → dikoreksi bila perlu
→ dipakai di event → tamu bisa foto dengan bingkai itu. Tanpa developer.

---

## Fase 3b — Canvas Designer Teks `L` ← yang mengubah jasa jadi produk

Rancangan lengkap: [dokumen 07](07-canvas-designer.md).

- Pecah `compose()` → `composeBase()` + `drawTextLayers()` (tanpa ubah tampilan)
- `measureTextLayers()` untuk menempatkan handle
- Dukungan teks multi-baris
- Kanvas editor: pilih, geser, panel properti, pemilih token
- Snapping, garis bantu, undo/redo
- Pustaka template global dengan layer teks default

**Selesai bila:** satu template yang sama dipakai dua acara dengan nama &
tanggal berbeda, keduanya tampil rapi, tanpa menyentuh Photoshop.

---

## Fase 4 — Sesi, Teks, Publikasi `M`

- Tab **Sesi**: semua `SessionConfig` (menghidupkan 5 "kode mati")
- Tab **Teks**: override copy yang relevan
- Tab **Publish**: editor slug + cek bentrok, checklist pra-publish,
  status draft/live/ended, **QR code** unduhan

**Selesai bila:** satu event bisa dibuat, didesain, dan dipublikasikan
sepenuhnya lewat admin.

---

## Fase 5 — Momen untuk Klien `M`

- `/admin/events/[id]/moments` — grid + filter
- Unduh massal ZIP
- Hapus momen (moderasi)
- Indikator penyimpanan

---

## Fase 6 — Kuota & Paket `M` ← syarat sebelum jualan

- `Plan` + `Subscription` di repo
- `POST /api/admin/quota/claim` yang idempoten & atomik
- `StepResult` klaim ke server, bukan `localStorage`
- Layar "kuota habis" yang benar
- Tampilan pemakaian di dashboard

**Selesai bila:** kuota 5 strip benar-benar habis setelah 5 sesi dari 5
perangkat berbeda. **Ini uji yang harus lulus sebelum produk dijual.**

---

## Fase 7 — Database `L`

Baru dikerjakan **setelah admin terbukti enak dipakai**, sesuai keputusan
awal.

- Pilih penyedia (Postgres: Neon/Supabase/Vercel Postgres)
- Terjemahkan tiap `interface` dokumen 02 → tabel
- Tulis `lib/repo/db.ts` memenuhi interface yang sama
- Skrip migrasi JSON → DB
- Ganti satu baris di `getRepo()`
- **Baru setelah ini admin bisa di-deploy** (filesystem Vercel tidak
  menyimpan tulisan)

---

## Fase 8 — Multi-Klien Sungguhan `L`

- Registrasi & login per klien
- Isolasi data diuji sungguhan (klien A tidak bisa lihat/ubah milik B)
- Onboarding & template awal
- Pembayaran / aktivasi paket
- (Opsional) subdomain / custom domain

---

## Ringkasan Ketergantungan

```
Fase 0 ──┬── Fase 1 ── Fase 2 ── Fase 3 ── Fase 3b ── Fase 4 ── Fase 5
         │                                                │
         └────────────────────────────────────────────────┴── Fase 6 ── Fase 7 ── Fase 8
                                                                                ▲
                                                            syarat deploy admin ┘
```

---

## Kapan bisa mulai jualan?

**Minimum yang jujur untuk dijual: Fase 0–4 + 6 + 7.**

- Fase 5 (unduh massal) bisa menyusul — klien masih bisa unduh satu-satu
- Fase 8 bisa ditunda kalau untuk sementara **kita yang membuatkan akun**
  klien secara manual (tetap jauh lebih baik daripada sekarang: sekarang
  kita menulis kode per klien, nanti cukup membuat akun)

Fase 6 dan 7 **tidak bisa dilewati**. Menjual kuota yang tidak dihitung
server sama saja memberi produk gratis; dan admin tanpa database tidak bisa
di-deploy.

### Catatan penting soal Fase 3b

Yang **wajib** ada untuk berjualan bukan editor kanvasnya, melainkan
**template yang punya layer teks bertoken**. Bedanya halus tapi besar:

| Siapa | Butuh apa | Kapan |
|---|---|---|
| **Klien** | Template sudah ada teks bertoken → isi nama, selesai | Sejak hari pertama jualan |
| **Staff Glyka** | Cara memposisikan layer teks itu | Sebelum template pertama terbit |

Jadi urutan yang paling hemat: **bangun kanvas editor untuk staff dulu**
(Fase 3b.1–3b.5), terbitkan beberapa template, mulai jualan. Kebebasan
klien menggeser teks sendiri (3b.6 dan `locked`) bisa menyusul.

Jalan pintas kalau ingin lebih cepat lagi: staff menulis `textLayers`
langsung sebagai JSON untuk 2–3 template pertama, sambil editor kanvasnya
dibangun. Tidak elegan, tapi sah — dan membuktikan modelnya laku sebelum
membangun editornya.
