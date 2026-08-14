# Tahap 1 — Fondasi Data: Selesai

Ditulis 14 Agustus 2026, di akhir Langkah 13 rencana Tahap 1
(`docs/BRD/09-DELTA-DARI-IMPLEMENTASI.md` §5). Semua isi di bawah adalah
hasil menjalankan ULANG seluruh skrip dari **skema database yang benar-benar
kosong** (bukan cuma "pernah lulus sekali") — lihat §5.

---

## 1. Tabel yang ada sekarang (17)

Identitas: `users`, `accounts`, `account_members`, `account_invites`
Katalog admin: `event_categories`, `packages`
Template & bingkai: `assets`, `frames`, `templates`, `template_categories`,
`template_variables`, `template_frames`
Acara: `events`, `event_variable_values`, `event_frames`
Komersial: `orders`, `quota_ledger`

Migrasi: `lib/db/migrations/0000_enable_extensions.sql` sampai
`0006_commercial_tables.sql` (7 berkas, semua diterapkan lewat
`drizzle-kit migrate`, bukan `push`).

## 2. Dua deviasi dari BRD dok 03 — dicatat SEBELUM ditulis kodenya

Keduanya ditemukan saat migrasi data nyata, keduanya ditanyakan ke
pemilik produk dulu (bukan diputuskan sepihak), keduanya tercatat di
`docs/BRD/09-DELTA-DARI-IMPLEMENTASI.md` §7 sebelum kode ditulis:

1. **`frames.blurb`** (text, opsional) — kolom baru di luar dok 03 §3.5.
   `Frame.blurb` lama dipakai nyata di `components/StepFrame.tsx` untuk
   tamu. Jawaban pemilik produk: tambah kolom.
2. **`brandLabel` per-acara** — TIDAK jadi kolom baru di `events`. Jawaban
   pemilik produk: lewat `event_variable_values` (`variable_key='brandLabel'`),
   mekanisme BRD dok 03 §5.4 apa adanya.

Temuan lain yang SENGAJA tidak dipindah (bukan gap, tapi AB-15/K11 yang
memang mencabut kemampuannya — dok 09 §3 eksplisit menyebut ini "sudah
benar, jangan diubah tanpa alasan kuat"): tema per-acara (warna, font,
efek, dekorasi) dari `Event.theme` lama. Acara hasil migrasi tidak punya
tema sendiri lagi — nanti ikut template yang dipasang (Tahap 2/3).

## 3. K2 — pencabutan hak `UPDATE`/`DELETE` di `quota_ledger`

`lib/db/roles.sql` membuat role `app_runtime` (bukan superuser), dipakai
SEMUA koneksi runtime (`lib/db/client.ts`, lewat `DATABASE_RUNTIME_URL` —
env var baru, terpisah dari `DATABASE_URL` yang dipakai `drizzle-kit`
untuk migrasi/DDL). Diuji ULANG setelah replay dari nol (§5):

```
UPDATE quota_ledger ...  -> ERROR: permission denied for table quota_ledger
DELETE FROM quota_ledger -> ERROR: permission denied for table quota_ledger
INSERT INTO quota_ledger -> berhasil
```

Index unik PARSIAL `idempotency_key` (`WHERE idempotency_key IS NOT NULL`)
diuji: dua baris `idempotency_key` sama → baris kedua ditolak. Dua baris
`idempotency_key` NULL → dua-duanya berhasil (bukti benar parsial, bukan
unik penuh).

## 4. K1 — gerbang wajib uji serentak (`scripts/test-quota-concurrency.ts`)

Dijalankan **4 kali terpisah** sepanjang Tahap 1 (3× sebelum reset, 1×
sesudah replay dari nol) — LULUS semua: tepat 1 sukses dari 50 permintaan
`POST /api/quota/claim` benar-benar bersamaan (`Promise.all`, 50
`sessionId` beda) saat sisa kuota 1, 49 sisanya 409, dan tepat 1 baris
`quota_ledger` `entry_type='consumption'` tertulis — tidak lebih.

Kuncinya: `claimQuota()` (`lib/db/queries/claimQuota.ts`) mengunci baris
`events` (`SELECT ... FOR UPDATE`) di dalam transaksi SEBELUM membaca
sisa kuota — permintaan kedua untuk event yang sama menunggu transaksi
pertama commit/rollback dulu, jadi tidak pernah melihat data basi.

## 5. Replay dari nol — bukti *reproducible*

Dijalankan berurutan tanpa campur tangan manual di antaranya:

```
DROP SCHEMA public CASCADE; DROP SCHEMA drizzle CASCADE;  (§5.1)
npx drizzle-kit migrate                                    (0000-0006)
psql -f lib/db/roles.sql                                   (app_runtime)
scripts/seed-catalog-from-code.ts   (dibuat ulang sementara, lalu dihapus lagi)
scripts/migrate-templates-frames.ts   --source=seed   → COCOK, 0 selisih
scripts/migrate-clients-events.ts     --source=seed   → selesai
scripts/migrate-subscriptions-to-ledger.ts --source=seed → COCOK, 0 selisih
scripts/test-quota-concurrency.ts                     → LULUS
scripts/test-ledger-properties.ts                     → LULUS, 0 penyimpangan
npx tsc --noEmit                                       → bersih
npm run build                                          → lolos
```

### 5.1 Koreksi terhadap rencana tertulis

Rencana awal menulis "`npx drizzle-kit drop`" untuk mereset skema — itu
**salah baca**: `drizzle-kit drop` menghapus satu berkas migrasi dari
riwayat `generate`, BUKAN mengosongkan database. Direset sungguhan
lewat `DROP SCHEMA public CASCADE`. Percobaan replay PERTAMA juga
sempat gagal diam-diam: `drizzle-kit migrate` melihat tabel riwayat
migrasinya sendiri (skema `drizzle`, terpisah dari `public`) masih ada
pasca-reset, jadi mengira ke-7 migrasi sudah pernah jalan dan
melewatkannya — `public` tetap kosong walau perintah melaporkan
"berhasil". Baru ketahuan setelah `\dt` menunjukkan nol tabel. Perbaikan:
skema `drizzle` ikut di-drop di reset manapun berikutnya.

### 5.2 Jumlah baris akhir (semuanya bisa ditelusuri, tidak ada yang misterius)

| Tabel | Jumlah | Asal |
|---|---:|---|
| `event_categories` | 5 | seed katalog |
| `packages` | 5 | seed katalog |
| `assets` | 13 | migrasi seed |
| `frames` | 10 | migrasi seed |
| `templates` | 0 | katalog lama memang kosong |
| `users` | 3 | 1 migrasi (staf demo) + 2 fixture uji K1/ledger |
| `accounts` | 3 | 1 sintetis (acara demo bekas staf) + 2 fixture uji |
| `events` | 4 | 2 migrasi + 2 fixture uji |
| `event_frames` | 10 | migrasi (7+3 bingkai per acara) |
| `event_variable_values` | 2 | migrasi (`brandLabel` per acara) |
| `quota_ledger` | 159 | 2 migrasi + 2 (uji K1) + 155 (uji properti buku besar) |

## 6. Definisi Selesai Tahap 1 (dari rencana)

- [x] Langkah 0–13 lulus semua uji masing-masing
- [x] `scripts/test-quota-concurrency.ts` lulus (K1) — gerbang keras
- [x] `app_runtime` terbukti tidak bisa `UPDATE`/`DELETE` `quota_ledger`
- [x] Setiap tabel data klien (`events`, `event_frames`,
      `event_variable_values`, `orders`, `quota_ledger`, `frames`,
      `assets`, `account_members`) punya `account_id` sejak baris pertama
- [x] Migrasi frames/assets/klien/acara/subscriptions lulus verifikasi
      *lossless* (diff otomatis di tiap skrip, bukan mata)
- [x] Dokumen ini ditulis dengan hasil jalan-ulang yang *reproducible*

## 7. Belum dikerjakan (sengaja, di luar Tahap 1)

Persis daftar di rencana: CMS staf, rewrite Visual Builder/wizard,
pemindahan rute `/admin`→`/app`, validator bingkai V1–V8, gerbang
publikasi 11 poin, notifikasi, jejak audit umum, voucher, 2FA, EXIF,
privasi galeri Momen (kolomnya `gallery_public` sudah ada & bawaan
`false`, tapi jalur baca/tulis booth tamu belum di-rewire ke DB —
`app/api/moments/*` dan booth tamu MASIH baca `data/*.json` lama).
`app/api/quota/claim` sendiri SUDAH ditulis ulang (Langkah 9) tapi
pemanggilnya (`components/StepResult.tsx`) BELUM diperbarui — masih
mengirim body lama tanpa `sessionId`, jadi akan ditolak 400 kalau
dites langsung dari booth sungguhan. Itu pekerjaan Tahap 3.

## 8. Langkah 0b — masih menunggu (jangan lupa)

Database di atas semua LOKAL (`127.0.0.1:6666`). Belum ada apa pun di
Neon/cloud. **Wajib** dipindah sebelum deploy pertama ke Vercel — lihat
Langkah 0b di rencana Tahap 1 (`C:\Users\Achmad Faizal\.claude\plans\eager-percolating-fog.md`).
