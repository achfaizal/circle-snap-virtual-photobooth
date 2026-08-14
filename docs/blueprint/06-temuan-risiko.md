# Blueprint 06 — Temuan & Risiko

> Masalah nyata yang ditemukan saat inventarisasi kode, **bukan** daftar
> keinginan. Beberapa di antaranya harus beres sebelum produk dijual.
>
> Semua sudah diverifikasi langsung di kode atau di produksi — bukan dugaan.

---

## 🔴 Harus beres sebelum jualan

### T1 — Kuota strip tidak benar-benar dibatasi

**Bukti:** [`lib/event.ts`](../../lib/event.ts)

```ts
const key = (code: string) => `glyka-photobooth:used:${code}`;
export function readUsed(code: string): number {
  const raw = window.localStorage.getItem(key(code));   // ← localStorage
```

Penghitung kuota ada di **`localStorage` perangkat masing-masing tamu**.
Artinya: 100 tamu dari 100 HP berbeda masing-masing membaca `used: 0`, lalu
menaikkan jadi `1`. Kuota 200 strip **tidak pernah berkurang secara
keseluruhan** — tiap HP punya hitungannya sendiri.

**Dampak bisnis:** kita menjual "paket 200 strip", tapi tamu bisa memotret
tak terbatas. Produk yang dijual berdasarkan kuota, kuotanya tidak berlaku.

Efek samping lain: nomor struk (`ENG-0001`) juga berasal dari penghitung
ini, jadi hampir setiap tamu baru mendapat nomor `0001`. Ini **sudah pernah
menyebabkan kehilangan data permanen** (foto & nama tamu tertimpa tamu
berikutnya) sebelum diperbaiki dengan UUID terpisah.

**Perbaikan:** Fase 6 — klaim strip ke server, atomik & idempoten.
Rancangan lengkap di dokumen 04 bagian 6.

---

### T2 — Endpoint upload momen terbuka tanpa pembatasan

**Bukti:** [`app/api/moments/upload/route.ts`](../../app/api/moments/upload/route.ts)

```ts
onBeforeGenerateToken: async (pathname) => {
  if (!pathname.startsWith("moments/")) throw new Error(...);
  return { maximumSizeInBytes: 30 * 1024 * 1024, allowOverwrite: true, ... };
}
```

Tidak ada autentikasi, tidak ada verifikasi event, tidak ada rate limit.
Siapa pun yang menemukan endpoint ini bisa meminta token upload dan
mengirim file 30MB berulang kali.

**Dampak:** kuota Vercel Blob gratis (5GB) bisa dihabiskan orang luar.
Kalau kuota Blob habis, **seluruh fitur Blob terkunci 30 hari** — momen
tamu berhenti tersimpan **di tengah acara berlangsung**, dan momen yang
sudah tersimpan pun tidak bisa diakses.

**Perbaikan minimal (murah, bisa segera):**
- Verifikasi `eventId` ada dan berstatus `live`
- Tolak kalau kuota strip event sudah habis (menyatu dengan T1)
- Rate limit per IP
- Turunkan `maximumSizeInBytes` sesuai kebutuhan nyata (video 15 detik ≈ 1,5MB;
  30MB terlalu longgar)

---

### T3 — Berkas sumber Photoshop bisa diunduh publik

**Bukti:** diverifikasi langsung ke produksi —

```
GET /templates/Engagement%20Photo%20Frame/Eng.psd → 200, 7.530.188 byte
```

File `Eng.psd` (7,5MB) ada di dalam `public/` sehingga ikut ter-deploy dan
**bisa diunduh siapa saja** yang menebak URL-nya.

**Dampak:** aset desain mentah (berlapis, bisa diedit) tersebar. Untuk
produk yang menjual desain, ini bocor modal. Sekaligus memboroskan ukuran
deployment.

**Perbaikan:** pindahkan berkas sumber ke luar `public/` (mis. `design/`
yang di-gitignore atau di luar repo). Ini bisa dikerjakan kapan saja,
tidak perlu menunggu fase mana pun.

---

## 🟡 Menghambat produk jadi dinamis

### T4 — Kartu video tidak mengikuti tema

`lib/video.ts` menetapkan warna sebagai konstanta modul:

```ts
const BG = "#FFFFFF"; const INK = "#1A1610";
const FLASH = "#EC4899";   // pink brand Glyka lama
const SMOKE = "#8A8478"; const TRACK = "#E7E2D8";
```

Gradasi judulnya pun ungu→pink→emas — warna Glyka, bukan warna acara.

Sekarang tertutupi karena event engagement memakai `bgVideo` custom yang
menimpa hampir seluruh tampilan. Tapi klien yang **tidak** mengunggah latar
video akan mendapat kartu berwarna pink, sementara playground-nya emas.

**Perbaikan:** jadikan parameter (`VideoCardTheme` di dokumen 02),
dikerjakan bersamaan dengan Fase 2.

### T5 — Lima pengaturan sudah ada tapi tidak pernah bisa diakses

`setCountdown`, `toggleAuto`, `toggleMirror`, `newSession` — semuanya
didefinisikan di `lib/store.ts` tapi **tidak pernah dipanggil** dari UI mana
pun (diperiksa dengan pencarian menyeluruh). Sebelumnya `setFilter` juga
begitu, dan sudah dihapus.

Ini bukan kebetulan — ini persis daftar pengaturan yang direncanakan tapi
UI-nya tidak pernah dibuat. Rumah yang benar untuk mereka adalah **admin**,
bukan UI tamu. Ditangani di Fase 4.

### T6 — Nama pasangan dipecah dengan `" & "`

`StepVoice.tsx`:
```ts
{event.names.split(" & ")[0]} dan {event.names.split(" & ")[1] ?? "Pasangan"}
```

Kalau klien menulis `"Salma dan Faizal"` atau `"Salma &Faizal"`, judulnya
jadi rusak/aneh. Untuk acara non-pernikahan (wisuda, ulang tahun) konsep
"dua nama" bahkan tidak berlaku.

**Perbaikan:** simpan nama sebagai field terpisah, atau jadikan judul
pesan suara sebagai teks yang bisa di-override (dokumen 02 `CopyOverrides`).

### T7 — Tanggal disimpan sebagai teks bebas

`date: "8 Agustus 2026"` tidak bisa diurutkan, dibandingkan, atau dipakai
menghitung masa aktif event. Dipisah jadi `date` (ISO) + `dateDisplay`
(bebas) di dokumen 02.

### T8 — Hanya tersedia 3 font

`app/layout.tsx` meng-`import` tiga font secara statis. Klien tidak bisa
memilih di luar itu. Butuh katalog font dinamis — dengan catatan trik
`--canvas-display`/`--canvas-mono` harus tetap bekerja, kalau tidak teks di
kanvas hasil unduhan akan berbeda dengan yang di layar.

---

## 🟢 Kebersihan & operasional

### T9 — Aset event lama masih ikut ter-deploy

`public/templates/Sal&Sal/` (13MB) masih ikut setiap deployment padahal
event wedding sudah dikeluarkan dari daftar aktif. Total `public/` = 21MB.

Sengaja tidak dihapus supaya event itu gampang diaktifkan lagi. Nanti
setelah aset pindah ke sistem `Asset` (Fase 3), ini rapi dengan sendirinya.

### T10 — `npm run lint` tidak berfungsi

Tidak ada berkas konfigurasi ESLint. Menjalankannya justru membuka wizard
interaktif, bukan memeriksa kode. Sudah pernah dilaporkan; diputuskan
ditunda. Sebaiknya beres sebelum ada orang kedua menyentuh kode ini.

### T11 — Banyak pekerjaan belum di-commit

`git status` menunjukkan 18+ berkas berubah dan belum di-commit — termasuk
seluruh fitur Momen, nama tamu, event engagement, dan perbaikan tabrakan
ID. Commit terakhir masih dari fase redesign sesi foto.

**Risiko:** semua pekerjaan berminggu-minggu ini hanya ada di satu folder
di satu komputer. Tidak ada salinan, tidak ada riwayat, tidak bisa
dikembalikan kalau ada yang salah.

**Saran:** commit sebelum memulai Fase 0. Refactor besar tanpa titik
kembali adalah risiko yang tidak perlu diambil.

### T12 — Tidak ada moderasi momen

Tamu bisa mengunggah apa saja lewat kamera, dan semua langsung tampil di
galeri publik event. Belum ada cara klien menyembunyikan/menghapus.
Untuk acara pernikahan sungguhan, ini permintaan yang pasti muncul.
Dijadwalkan di Fase 5 (`Moment.hidden`).

### T13 — Batas penyimpanan belum ditegakkan

`Plan.storageMb` dirancang di dokumen 02, tapi belum ada yang menghitung
atau menegakkannya. Tanpa ini, satu klien besar bisa menghabiskan kuota
Blob bersama dan mematikan layanan klien lain (lihat T2).

---

## Yang sudah benar — jangan sampai hilang saat refactor

Bukan temuan masalah, tapi catatan penting: beberapa hal di kode sekarang
**lahir dari bug nyata yang sudah pernah terjadi**. Daftar lengkapnya di
[dokumen 01 bagian I](01-inventaris-playground.md#i-hal-yang-sudah-benar--jangan-dirusak).

Yang paling gampang tanpa sengaja dirusak saat refactor besar:

1. Modal **wajib** `createPortal` ke `document.body` — karena `.step-enter`
   meninggalkan `transform` yang membuat containing block baru
2. `themeVars()` **wajib** diterapkan ulang di komponen berportal — CSS
   variable tidak menembus portal
3. Sizing `<img>`/`<canvas>` pakai `max-height` + `width:auto` **tanpa**
   `aspect-ratio` pada pembungkus — arah sebaliknya rusak di Safari
4. `momentId` (UUID) **harus** tetap terpisah dari nomor struk
5. Kuota dipotong sekali, dijaga `useRef` terhadap React Strict Mode
