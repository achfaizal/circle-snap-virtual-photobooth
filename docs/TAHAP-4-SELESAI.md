# Tahap 4 — Operasional & Kepercayaan: Selesai

Ditulis 17 Agustus 2026, di akhir Langkah 19 rencana Tahap 4
(`docs/BRD/09-DELTA-DARI-IMPLEMENTASI.md` §5). Lihat `docs/TAHAP-1-SELESAI.md`
s.d. `docs/TAHAP-3-SELESAI.md` untuk tiga tahap sebelumnya.

---

## 1. Enam butir, semua selesai

| # | Butir (dok 09 §5) | Rute/berkas utama |
|---|---|---|
| D-17 | Pembersihan EXIF dari semua gambar (Tinggi) | `lib/services/imageProcessing.ts`, disambungkan ke 5 dari 6 titik unggah |
| D-18 | Galeri privat bawaan (Tinggi) | `app/api/moments/route.ts` (`checkGalleryAccess` + gerbang `expired`) |
| D-28 | Momen — moderasi 1-klik, unduh massal, status unggah | `/app/events/[id]/moments`, `/api/app/events/[id]/moments/*` |
| D-15 | Notifikasi kuota rendah/habis | `lib/services/quotaNotify.ts`, `components/app/NotificationBell.tsx` |
| D-14 | Jejak audit uang/kuota/status acara | `lib/services/auditLog.ts`, `/admin/audit-logs` |
| D-16 | Retensi & penghapusan media 90 hari | `lib/db/queries/eventEnd.ts`, `scripts/run-retention-cleanup.ts` |

Plus fondasi yang tidak disebut namanya di 6 butir tapi wajib ada
duluan (ditemukan lewat riset BRD sebelum menulis kode, disepakati
dengan pemilik produk): tabel `sessions`/`strips`/`strip_photos`/
`voice_notes` (dok 03 §6, sebelumnya Momen 100% berbasis file, nol
jejak database), tabel `system_settings` minimal, dan aksi "Akhiri
Acara" yang sebelumnya tidak ada sama sekali di kode manapun.

## 2. Keputusan yang ditanyakan & dijawab selama kerja

1. **Pustaka pembersih EXIF** — ditanya, dijawab: `sharp` (bukan
   `exifr`/`piexifjs`) — dok 08 §1.4 eksplisit mensyaratkan gambar
   di-re-encode ulang, bukan cuma tag EXIF dihapus.
2. **Fondasi `sessions`/`strips` ditunda atau dikerjakan sekarang** —
   ditanya, dijawab: dikerjakan SEKARANG sebagai bagian Tahap 4, bukan
   ditunda — supaya D-28/D-16 berdiri di atas skema BRD yang benar,
   bukan tempelan di atas Momen berbasis file.
3. **Gerbang peran "hapus permanen ditolak untuk operator" (Langkah 7)**
   — awalnya cuma diverifikasi lewat pembacaan kode (`requireAccountRole`
   dianggap "sudah teruji luas di tahap lain"). Owner produk menolak
   ini sebagai bukti cukup untuk kontrol akses. Diperbaiki: fixture
   vendor+3-peran sungguhan dibuat, sesi HTTP nyata untuk owner/manager/
   operator — operator kena 403 SUNGGUHAN + baris DB dibuktikan tetap
   ada (bukan diam-diam terhapus), manager/owner berhasil 200 SUNGGUHAN.
4. **`event.publish` (Langkah 11) tanpa uji langsung** — sama pola,
   awalnya cuma diklaim "pola identik dengan 6 titik audit lain yang
   sudah teruji". Ditolak, diminta bukti nyata karena ini titik pemicu
   `template_snapshot` yang melindungi acara live (K9/AB-14). Diperbaiki:
   acara draft sungguhan dibuat lewat wizard API penuh (pesanan → lunas
   → pilih template → isi field wajib → isi variabel wajib →
   publikasikan), `template_snapshot` terbukti membeku, `audit_logs`
   terbukti mencatat aktor yang benar ~14ms setelah `published_at`.

## 3. Keputusan teknis yang saya buat sendiri, dicatat di sini

- **`quota_ledger.session_id` TETAP bukan foreign key sungguhan** ke
  `sessions` yang baru dibuat — baris lama (uji regresi, event nyata
  yang sudah dipublikasikan) punya `session_id` acak yang tidak pernah
  jadi baris `sessions` (tabelnya belum ada saat itu). Menambah FK
  sekarang gagal migrasi karena referensi yatim.
- **`strips.image_asset_id` dilonggarkan NULLABLE** + kolom baru
  `upload_status` (`pending|uploaded|failed`) — dok 03 §6.2 menandainya
  wajib, tapi dok 07 §8 eksplisit mensyaratkan status `pending_upload`
  untuk unggahan gagal 3x retry; baris `strips` harus bisa ada SEBELUM
  gambar selesai terunggah supaya tamu tetap dapat struk kalau jaringan
  buruk.
- **`sessionId` dipakai ulang sebagai kunci `sessions.id`** — sebelumnya
  `lib/store.ts` membuat `momentId` acak terpisah dari `sessionId` yang
  dikirim ke klaim kuota. Disatukan (`StepResult.tsx` sekarang memakai
  `sessionIdRef.current` untuk unggahan, bukan `momentId` toko Zustand).
- **Notifikasi channel `email`/`whatsapp` TIDAK benar-benar terkirim** —
  tidak ada infrastruktur SMTP/WhatsApp Business API di proyek ini
  (sama gap dengan verifikasi email Tahap 3). Baris `notifications`
  tetap mencatat `channel` sesuai niatnya, tapi `sent_at` cuma terisi
  untuk `in_app` — satu-satunya yang benar-benar berfungsi (lonceng di
  `AppShell.tsx`).
- **`system_settings` dibangun minimal** — cuma `retention_days_after_end`
  yang diisi & dipakai nyata (dibutuhkan D-16). 7 key lain di dok 03
  §8.4 (`order_expiry_hours` dkk.) tetap hardcode di tempat lama —
  menggantinya berarti pekerjaan tersendiri di banyak titik, di luar 6
  butir Tahap 4.
- **AB-08 (kuota kembali/hangus saat "Akhiri Acara")** — ditemukan
  SAAT membangun Langkah 17, TIDAK ada di deskripsi awal rencana ("cuma"
  status live→ended + retensi). `quota_ledger_entry_type` sudah punya
  `return_on_end`/`forfeit` sejak Tahap 1, tidak pernah dipakai sampai
  sekarang — jelas disiapkan untuk momen ini. "Akun flexible" (AB-08)
  ditafsirkan `accounts.type === 'vendor'` (dompet bersama), "single_event"
  ditafsirkan `type === 'personal'` — BRD tidak punya kolom account
  terpisah untuk ini, jadi mengikuti model bisnis CLAUDE.md §1.
- **Skrip retensi punya 2 mode terpisah** (`--warn` untuk peringatan
  H-14, default/`--confirm` untuk penghapusan) — dijadwalkan beda
  frekuensi (plan eksplisit: "dipanggil terpisah, dijadwalkan lebih
  sering"), bukan satu cron yang sama.
- **Tamu minta hapus foto sendiri** (`guest_delete_token_hash`) — kolom
  ada di skema `strips`, alur/UI-nya TIDAK dibangun (bukan bagian
  definisi inti D-28 di dok 09 §4).
- **`strip_photos`** (foto mentah per slot, fitur render-ulang) — TIDAK
  dikerjakan, opsional per rencana, bukan wajib 6 butir.

## 4. Bug ditemukan & diperbaiki di tengah jalan (bukan diklaim sudah benar)

1. **`approveOrder()` tidak pernah mengisi `quota_ledger.actor_user_id`**
   di 4 titik insert meski parameternya sudah ada sejak Tahap 2 — jejak
   audit dompet/kuota kehilangan pelaku sungguhan. Ditemukan saat
   menyambungkan Langkah 11, diperbaiki di keempat titik, dibuktikan
   lewat query DB langsung setelah panggilan API nyata.
2. **`rejectOrder()` tidak menerima maupun mencatat pelaku sama sekali**
   — parameter `actorUserId` ditambah baru, rute
   `/api/admin/orders/[id]/reject` diperbarui menjembatani sesi staf
   ke `users.id` Postgres (pola sama rute approve).
3. **Galeri Momen tidak terkunci saat acara `expired`** (AB-11/K15) —
   `checkGalleryAccess` (Langkah 6) cuma mengecek `galleryEnabled`/
   `galleryPublic`, tidak pernah mengecek status/`expires_at` sama
   sekali. Ditemukan saat membangun Langkah 17 (menyadari `expired`
   adalah state dinamis yang tidak pernah ditulis literal ke kolom
   `status`). Diperbaiki: `/api/moments` sekarang menghitung `expired`
   dari `expiresAt <= now()` (sama pola `claimQuota()`), mengunci
   galeri untuk tamu (owner tetap lolos), TIDAK mengunci untuk `ended`
   (dibuktikan lewat pengujian kedua status secara langsung).
4. **Sidecar JSON nama tamu jadi objek yatim** — `upload-local/route.ts`
   dan `lib/moments.ts uploadToBlob()` masih menulis `{momentId}.json`
   berisi nama tamu, sisa dari SEBELUM Langkah 6 memindahkan sumber
   nama tamu ke `sessions.guest_name` (Postgres). File itu jadi
   tulis-doang (tidak pernah dibaca siapa pun) DAN tidak ikut terhapus
   skrip retensi (Langkah 18 cuma menghapus objek yang tercatat di
   `assets`) — ditemukan justru lewat uji retensi (file `.json` tetap
   ada setelah `.png`-nya berhasil dihapus). Kedua penulisan dihapus.

## 5. Yang belum dikerjakan (di luar cakupan 6 butir, dicatat bukan disembunyikan)

- Pengiriman notifikasi email/WhatsApp sungguhan.
- Kode akses galeri Momen (dok 05 §5.6), "Unduh arsip lengkap" berbayar
  (dok 02 §6), tamu minta hapus foto sendiri.
- `strip_photos` (render-ulang bingkai).
- 7 dari 8 key `system_settings`.
- Penjadwalan cron sungguhan (Vercel Cron/Task Scheduler) — skrip
  retensi sudah siap dipanggil, konfigurasi deploy di luar cakupan.
- Pembatasan `super_admin` vs `admin` di halaman jejak audit —
  `requireStaff()` belum granular per level (gap lama sebelum Tahap 4,
  bukan diselesaikan diam-diam di sini).
- Retensi 24 bulan untuk `audit_logs` sendiri (dok 04 §12) — belum ada
  mekanisme penghapusannya.
- Sidebar admin (`AdminShell.tsx`) yang sudah ada sebelum Tahap 4 pada
  dasarnya melanggar `ADMIN-DESIGN-BRIEF.md` §11 ("jangan buat
  sidebar") — satu baris nav baru ditambahkan ke pola yang sudah ada
  untuk Langkah 12, tapi masalah aslinya tidak diperbaiki (di luar
  cakupan, butuh perombakan navigasi admin tersendiri).
- Navigasi tab antar sub-halaman acara (`details`/`frames`/`builder`/
  `publish`/`moments`) di `/app/*` — tidak pernah ada sejak Tahap 3,
  bukan baru. Tautan mati `/app/events/{id}` (dasbor→kartu acara)
  ditemukan & diperbaiki (redirect ke `/details`) saat membangun
  Langkah 8, tapi navigasi tab penuh tidak dibangun.

## 6. Cara verifikasi

`npx tsc --noEmit` bersih, `npm run build` lolos (termasuk linting Next.js).
8 skrip regresi permanen lulus semua (`test-account-migration`,
`test-audit-log`, `test-quota-notify`, `test-frame-validator`,
`test-image-processing`, `test-ledger-properties`, `test-order-lifecycle`,
`test-quota-concurrency` — termasuk uji serentak K1: tepat 1 sukses dari
50 klaim bersamaan). Setiap langkah diuji lewat panggilan HTTP/DB nyata
(login sungguhan, sesi cookie, query database langsung setelah aksi),
bukan cuma pembacaan kode — termasuk dua kasus (Langkah 7, Langkah 11)
yang awalnya diklaim cukup lewat pembacaan kode tapi diminta dan
akhirnya dibuktikan nyata.
