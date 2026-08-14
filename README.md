# Circle Snap Virtual Photobox — Playground Sesi Photobooth Event

Prototipe alur tamu yang bisa dijalankan, untuk segmen **photobooth event
berbasis kuota**: klien membeli paket (misalnya 200 strip), panitia menaruh QR
di meja, tamu memindai dan langsung memotret tanpa memasang apa pun.

Alur yang dibangun:

```
pindai QR  →  pilih bingkai  →  sesi foto (+ulang)  →  pesan suara  →  struk & unduh
```

Stack: Next.js 15 (App Router) · TypeScript · Tailwind v4 · Zustand.

---

## Menjalankan

```bash
npm install
npm run dev
```

Buka `http://localhost:3008`, pilih salah satu event contoh.

**Kamera dan mikrofon hanya jalan di konteks aman.** `localhost` dihitung aman.
Untuk uji dari HP, `http://192.168.x.x:3008` akan ditolak browser — pakai tunnel:

```bash
npx localtunnel --port 3008
# atau
cloudflared tunnel --url http://localhost:3008
```

Uji di HP itu wajib. Perilaku `getUserMedia` dan `MediaRecorder` di Safari iOS
dan WebView Android berbeda cukup jauh dari Chrome desktop, dan hampir semua
tamu event datang dari sana.

---

## Tiga keputusan yang menentukan model bisnisnya

**1. Nama pengantin tidak dibakar ke dalam PNG.**
Kalau tiap pernikahan butuh file bingkai baru, kamu menjual jasa desain, bukan
SaaS — dan biaya per klien tidak pernah turun. Di sini PNG hanya memuat kertas,
garis, dan lubang foto. Nama, tanggal, tempat, dan tagar didefinisikan sebagai
`textLayers` di `lib/templates.ts` dan digambar saat compositing dari data
event. Satu bingkai melayani semua acara. Ukuran font mengecil otomatis kalau
nama pasangannya panjang, karena kasus itu pasti terjadi.

**2. Kuota dipotong per strip, bukan per jepretan.**
Klien membeli 200 strip. Tamu yang mengulang foto lima kali tetap memakai satu
jatah. Pemotongan terjadi sekali di layar struk (`StepResult`), dengan penjaga
`useRef` supaya React Strict Mode tidak memotong dua kali di development.

**3. Pesan suara menghasilkan video, bukan file audio terpisah.**
Foto adalah komoditas; suara tamu tidak. Tapi rekaman `.webm` yang berdiri
sendiri tidak akan pernah dibuka lagi. Jadi strip dan audio dijahit jadi video
vertikal 1080×1920 lengkap dengan gelombang suara yang berjalan — langsung di
perangkat, tanpa server encoding. Ini format yang bisa diunggah apa adanya ke
Reels dan TikTok, dan itulah jalur penyebaran paling murah untuk produk ini.

---

## Yang sudah berjalan

| | |
|---|---|
| Event berbasis kode + kuota paket (localStorage) | ✅ |
| Pilih bingkai dari daftar yang diizinkan event | ✅ |
| Kamera, negosiasi resolusi bertingkat, ganti depan/belakang | ✅ |
| Hitung mundur 0/3/5/10 detik + lanjut otomatis antar-foto | ✅ |
| Ulang foto per slot tanpa mengulang sesi | ✅ |
| Filter warna tetap, konsisten antara preview dan hasil | ✅ |
| Teks event dinamis di bingkai + penyusutan font otomatis | ✅ |
| Preview strip hidup memakai mesin yang sama dengan ekspor | ✅ |
| Rekam pesan suara + meteran level | ✅ |
| Ekspor video 1080×1920 dengan gelombang suara | ✅ |
| Struk: nomor strip, isi sesi, sisa kuota | ✅ |
| Unduh PNG/JPG resolusi cetak, Web Share dengan fallback | ✅ |
| Reduced motion dihormati, fokus keyboard terlihat | ✅ |

---

## Yang sengaja belum ada

- Backend, autentikasi, dashboard admin
- Upload cloud, galeri event, unduh massal untuk panitia
- Generator QR (di playground, halaman depan menggantikan pemindai)
- Antrean offline (IndexedDB + Background Sync)
- Moderasi konten, watermark sponsor, GIF/boomerang
- Billing dan pembelian paket

Urutan berikutnya yang saya sarankan: **galeri event + unduh massal**, karena
itu yang dibeli panitia (mereka mau semua foto tamu di akhir acara), lalu
**antrean offline**, karena WiFi gedung resepsi jatuh persis saat ratusan tamu
online bersamaan.

---

## Catatan kompatibilitas

`MediaRecorder` untuk video memilih MIME yang didukung secara berurutan: MP4
lebih dulu (Safari modern), lalu WebM VP9/VP8. Di browser tanpa dukungan sama
sekali, tombol video tidak muncul dan unduhan foto tetap berjalan normal.
`ctx.filter` absen di sebagian WebView lama — foto tetap tersusun, hanya tanpa
filter. Pola yang dipakai di seluruh kode: gagal pelan, jangan gagal total.

---

## Struktur

```
app/
  page.tsx                pengganti pemindai QR (khusus playground)
  e/[code]/page.tsx       route sesi event
  globals.css             design token + animasi "cuci film"
components/
  EventBooth.tsx          header, kuota, router langkah
  StepFrame.tsx           pilih bingkai
  StepShoot.tsx           kamera, hitung mundur, ulang per slot
  StepVoice.tsx           rekam pesan suara
  StepResult.tsx          struk, unduh, bagikan
  StripCanvas.tsx         preview strip hidup
lib/
  event.ts                konfigurasi event + kuota (kandidat tabel DB)
  templates.ts            bingkai + layer teks dinamis
  compositor.ts           mesin compositing kanvas
  camera.ts               getUserMedia + klasifikasi error
  voice.ts                MediaRecorder audio + meteran level
  video.ts                kartu video vertikal
  filters.ts              filter untuk preview dan kanvas
  store.ts                state machine sesi
public/templates/*.png    overlay transparan tanpa teks
```

## Menambah bingkai

1. Simpan PNG RGBA (transparan penuh di area foto, **tanpa teks apa pun**) di
   `public/templates/<nama-event>/`.
2. Tentukan koordinat slot foto dari kanal alpha PNG-nya (bukan ditaksir
   manual) — area yang transparan penuh adalah lubang foto.
3. Tambah entri di `TEMPLATES` (`lib/templates.ts`) dengan koordinat slot yang
   sama persis dengan lubang di PNG, plus `textLayers` memakai token
   `{{names}}`, `{{date}}`, `{{venue}}`, `{{hashtag}}`, `{{code}}` — kosongkan
   `textLayers` kalau teks sudah tercetak di dalam PNG itu sendiri.
