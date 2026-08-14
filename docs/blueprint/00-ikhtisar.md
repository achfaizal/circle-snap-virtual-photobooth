# Blueprint 00 — Ikhtisar Produk

> Dokumen induk. Baca ini dulu sebelum dokumen lain.
> Status: **rancangan awal**, disusun 9 Agustus 2026.

---

## 1. Dari mana kita berangkat

Yang ada sekarang adalah **satu playground yang bekerja penuh** tapi setiap
detailnya di-*hardcode* di dalam kode:

- Event didefinisikan sebagai array TypeScript di `lib/event.ts`
- Bingkai didefinisikan sebagai array TypeScript di `lib/templates.ts`
- Koordinat lubang foto ditentukan manual (dulu lewat script Python baca
  alpha channel PNG)
- Aset (PNG bingkai, dekorasi sudut, latar video) ditaruh manual ke
  `public/templates/`
- Menambah satu event = mengedit kode + deploy ulang

Artinya: **hari ini kita menjual jasa, bukan produk.** Setiap klien baru
butuh developer. Itu tidak bisa diskalakan.

## 2. Ke mana kita menuju

Produk SaaS di mana **klien mendesain photobooth-nya sendiri**, tanpa
menyentuh kode dan tanpa melibatkan kita:

```
Klien daftar → pilih paket (jumlah strip) → buka admin →
isi data acara → pilih/upload bingkai → atur tema & warna →
atur perilaku sesi → preview → publish → dapat link + QR →
tamu foto → klien lihat & unduh semua momen
```

Kita menjual **kuota strip** (mis. paket 200 strip). Kuota habis → sesi
foto berhenti sampai klien menambah paket.

## 3. Prinsip yang tidak boleh dilanggar

Empat aturan yang menjaga produk ini tetap produk, bukan jasa desain:

**P1 — Tidak ada kode per klien.**
Kalau menambah satu klien butuh satu baris kode pun, arsitekturnya salah.
Semua perbedaan antar-klien harus jadi *data*, bukan *kode*.

**P2 — Playground membaca dari sumber yang sama dengan yang ditulis admin.**
Admin tidak boleh menulis ke tempat yang tidak bisa dibaca playground.
Kalau tidak, admin cuma jadi mockup yang tidak menghasilkan apa-apa.

**P3 — Apa yang dilihat di preview = apa yang didapat tamu.**
Preview di admin harus memakai komponen yang sama persis dengan playground
sungguhan, bukan tiruan. (Pola ini sudah dipakai di
[`lib/compositor.ts`](../../lib/compositor.ts) — preview dan hasil unduhan
memanggil `compose()` yang sama, cuma beda `scale`. Pertahankan.)

**P4 — Gagal pelan, jangan gagal total.**
Sudah jadi pola di kode sekarang (overlay gagal dimuat → foto tetap
tersusun; kamera ditolak → pesan jelas + langkah berikutnya). Admin harus
mewarisi ini: konfigurasi rusak tidak boleh membuat sesi tamu mati total.

## 4. Keputusan arsitektur yang sudah diambil

Sudah dikonfirmasi, tidak perlu dibahas ulang:

| Keputusan | Pilihan | Alasan |
|---|---|---|
| Cara menentukan lubang foto | **Hybrid**: auto-deteksi alpha channel + editor geser manual | Cepat untuk PNG normal, tetap bisa diperbaiki kalau desainnya tidak standar |
| Penyimpanan fase awal | **File JSON + lapisan repository** | Playground bisa membaca (P2 terpenuhi), pindah ke DB nanti cukup ganti 1 file |
| Struktur URL | **Path** `/e/{slug}` | Sudah jalan, tidak butuh DNS, bisa dites penuh di localhost |

## 5. Peta dokumen

| Dokumen | Isi |
|---|---|
| **00-ikhtisar.md** (ini) | Visi, prinsip, model bisnis, glosarium |
| [01-inventaris-playground.md](01-inventaris-playground.md) | Daftar lengkap SEMUA yang sekarang hardcoded dan harus jadi dinamis |
| [02-model-data.md](02-model-data.md) | Skema data lengkap, dirancang siap-DB |
| [03-spesifikasi-admin.md](03-spesifikasi-admin.md) | Rancangan layar admin, per halaman |
| [04-arsitektur.md](04-arsitektur.md) | Repository pattern, aset, kuota, auth, URL |
| [05-peta-jalan.md](05-peta-jalan.md) | Urutan pengerjaan bertahap |
| [06-temuan-risiko.md](06-temuan-risiko.md) | Masalah yang ditemukan saat inventarisasi — **baca sebelum jualan** |
| [07-canvas-designer.md](07-canvas-designer.md) | Editor teks di atas bingkai — kunci agar satu desain melayani banyak acara |
| [08-adopsi-desain-vlass.md](08-adopsi-desain-vlass.md) | Adopsi sistem desain UI admin dari proyek referensi |
| [09-brd-model-bisnis.md](09-brd-model-bisnis.md) | **BRD**: panel Staff vs Klien, isi paket, matriks fitur, aturan bisnis |
| [10-struktur-menu-field.md](10-struktur-menu-field.md) | Detail tiap layar & field: diisi siapa, wajib atau tidak, sudah ada atau belum |

## 6. Model bisnis (rancangan awal)

> ⚠️ **Bagian ini tersusul.** Versi yang lebih lengkap dan hasil diskusi
> terbaru ada di [dokumen 09](09-brd-model-bisnis.md) — termasuk paket
> Vendor/EO, matriks fitur per tier, dan aturan bisnis yang harus
> ditegakkan server. Bagian di bawah dipertahankan sebagai catatan asal
> keputusan bentuk data di dokumen 02.

Ini belum final, tapi menentukan bentuk data yang dirancang di dokumen 02.

### Unit yang dijual: **strip**

Satu strip = satu sesi foto selesai (tamu memotret, jadi satu bingkai
lengkap). Tamu mengulang foto tidak menambah pemakaian — pemotongan kuota
terjadi sekali di layar struk. Aturan ini sudah berlaku di kode sekarang
(lihat `StepResult.tsx`, penjaga `claimed` ref).

### Contoh tingkatan paket

| Paket | Strip | Cocok untuk | Fitur |
|---|---|---|---|
| Intimate | 100 | Lamaran, ulang tahun | 1 bingkai, tema preset |
| Celebration | 300 | Pernikahan menengah | 3 bingkai, tema kustom, pesan suara |
| Grand | 1.000 | Pernikahan besar, korporat | Bingkai tak terbatas, galeri momen, unduh massal |

Add-on yang mungkin: custom domain, perpanjang masa aktif, hapus branding
Glyka, unduh massal semua momen.

### Yang membatasi, bukan cuma strip

Perlu dipikirkan juga (detail di dokumen 02):
- **Masa aktif** — event hidup berapa lama? (acara 1 hari, tapi galeri
  mungkin ingin dibuka sebulan)
- **Penyimpanan** — momen tamu makan storage. Kuota gratis Vercel Blob 5GB
  ≈ 1.700 momen. Paket besar butuh perhitungan biaya sendiri.
- **Jumlah bingkai** — pembatas alami antar paket

## 7. Glosarium

Istilah dipakai konsisten di semua dokumen dan (nanti) di kode:

| Istilah | Arti | Di kode sekarang |
|---|---|---|
| **Klien** | Yang membeli & mendesain (calon pengantin / EO) | belum ada |
| **Tamu** | Yang berfoto di acara | — |
| **Event** | Satu acara dengan satu playground | `EventConfig` di `lib/event.ts` |
| **Bingkai** (frame) | Desain PNG + definisi lubang foto | `Template` di `lib/templates.ts` |
| **Slot** | Satu lubang foto di dalam bingkai | `Slot` |
| **Strip** | Hasil akhir: bingkai yang sudah terisi foto | — |
| **Momen** | Strip + (opsional) video pesan suara, tersimpan di galeri | `Moment` di `lib/moments.ts` |
| **Tema** | Warna, font, dekorasi sebuah event | `EventTheme` |
| **Playground** | Halaman yang dilihat tamu | `/e/[code]` |
| **Admin** | Halaman tempat klien mendesain | **belum ada** |

## 8. Batasan fase ini

Yang **sengaja belum** dikerjakan sampai admin jadi:

- Database (semua pakai file JSON dulu — lihat dokumen 04)
- Autentikasi sungguhan (password sederhana dulu)
- Pembayaran / billing
- Multi-user per klien (satu klien = satu akun)
- Subdomain / custom domain

Yang **harus** ada sebelum bisa dijual (lihat dokumen 06 untuk detail):

- Kuota strip yang benar-benar dihitung di server ⚠️
- Batas ukuran & jumlah upload aset
- Isolasi data antar-klien
