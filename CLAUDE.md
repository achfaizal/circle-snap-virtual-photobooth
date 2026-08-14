# CLAUDE.md — Circle Snap Virtual Booth

Berkas ini dibaca otomatis setiap sesi. Isinya mengikat.

---

## 1. Produk ini

Photobooth virtual berbasis browser yang dijual sebagai SaaS. Klien membeli
**strip** (satu hasil cetak digital yang dibawa pulang tamu), memasang QR di
lokasi acara, dan tamu berfoto lewat browser tanpa memasang aplikasi.

Dua jenis pembeli:

- **Perorangan** — punya satu hajat, beli paket terikat satu acara, boleh beli
  lagi untuk acara berikutnya
- **Vendor/EO** — beli saldo besar (min 600 strip) ke dompet akun, lalu
  dibagikan sendiri ke beberapa acara

Admin menyiapkan bahan bakunya lewat CMS: kategori, template playground,
bingkai, paket.

---

## 2. Sumber kebenaran

Urutan wewenang, dari paling tinggi:

1. **`docs/brd/`** — Business Requirements Document. Ini yang menang.
2. `docs/ADMIN-DESIGN-BRIEF.md` — arah visual portal admin
3. `docs/ALUR-PLAYGROUND.md` — aturan membuat template, kecuali yang dibatalkan di BRD dok 09
4. Kode yang sudah ada

> **Kode menyesuaikan BRD, bukan sebaliknya.**
> Kalau saat coding ada aturan BRD yang tidak masuk akal atau tidak mungkin
> dikerjakan, **berhenti dan bilang.** Jangan diam-diam menyimpang. Kalau
> disepakati berubah, catat di `docs/brd/09-DELTA-DARI-IMPLEMENTASI.md` §7
> sebelum menulis kode.

### Peta BRD

| Butuh tahu soal… | Baca |
|---|---|
| Apa yang bertentangan dengan kode sekarang + urutan kerja | `09-DELTA-DARI-IMPLEMENTASI.md` |
| Glosarium + 22 aturan bisnis (AB-01…AB-22) | `00-RINGKASAN-DAN-ATURAN-BISNIS.md` |
| Siapa boleh apa | `01-AKTOR-PERAN-DAN-HAK-AKSES.md` |
| Paket, dompet, buku besar kuota, pesanan | `02-MODEL-KOMERSIAL-DAN-KUOTA.md` |
| Tabel & field | `03-MODEL-DATA.md` |
| Portal admin | `04-PORTAL-ADMIN.md` |
| Portal klien | `05-PORTAL-KLIEN.md` |
| Template, bingkai, Visual Builder | `06-TEMPLATE-BINGKAI-VISUAL-BUILDER.md` |
| Booth tamu & klaim kuota | `07-PENGALAMAN-TAMU.md` |
| Keamanan, privasi, performa | `08-NONFUNGSIONAL.md` |

**Jangan mengarang aturan bisnis.** Kalau BRD tidak menyebut sesuatu, tanya —
jangan pilih sendiri lalu lanjut.

---

## 3. Cara kerja

### Sebelum menulis kode

1. Baca bagian BRD yang relevan dengan tugasnya
2. Sampaikan **rencana singkat**: file apa yang disentuh, aturan BRD mana yang
   berlaku, apa yang tidak dikerjakan
3. **Tunggu konfirmasi** sebelum mulai

### Saat mengerjakan

- Kerjakan **bertahap**, berhenti di setiap tahap untuk konfirmasi. Jangan
  menghasilkan semuanya sekaligus.
- Satu tahap = satu hal yang bisa diuji sendiri
- Kalau menemukan pertentangan dengan BRD di tengah jalan, berhenti dan bilang

### Setelah selesai

- Jalankan `npx tsc --noEmit` dan `npm run build`
- Laporkan apa yang **belum** dikerjakan, bukan hanya yang sudah
- Jangan klaim sesuatu berfungsi kalau belum dijalankan sungguhan

---

## 4. Aturan yang tidak boleh dilanggar

Ini yang paling mudah rusak tanpa sengaja. Setiap butir merujuk kode aturan di
BRD.

### Kuota & uang

**K1 · Kuota diputuskan server, tidak pernah oleh perangkat tamu.** (AB-02)
Klaim atomik dengan kunci baris. Dua tamu menekan bersamaan saat sisa 1 harus
menghasilkan tepat 1 sukses.

**K2 · Kuota adalah buku besar, bukan penghitung.** (AB-03)
Saldo dihitung dari jurnal `quota_ledger`, bukan disimpan sebagai angka. Baris
jurnal hanya boleh `INSERT` — tidak pernah `UPDATE` atau `DELETE`. Koreksi
dilakukan dengan menambah baris berlawanan.

**K3 · Satu sesi selesai = satu strip = satu kuota.** (AB-01)
Mengulang jepretan tidak memotong kuota tambahan.

**K4 · Jangan pernah menyusun strip sebelum klaim kuota berhasil.**
Kalau urutannya terbalik, tamu dapat foto yang tidak tercatat dan klien merasa
kuotanya bocor.

### Data & isolasi

**K5 · Setiap kueri data klien wajib ter-scope ke `account_id`.**
Di lapisan akses data, bukan di controller. Periksa juga **kepemilikan objek**,
bukan hanya peran — ini sumber kebocoran antar-klien paling umum.

**K6 · Galeri privat secara bawaan.** (`gallery_public = false`)
Acara ulang tahun anak berisi foto anak di bawah umur.

**K7 · Bersihkan EXIF dari semua gambar yang diunggah.**
Foto HP tamu membawa koordinat GPS rumahnya.

### Template & bingkai

**K8 · Template adalah kelas, acara adalah instans.** (AB-13)
Tidak ada satu pun operasi klien yang menulis ke `templates`,
`template_variables`, atau `template_frames`. Semua tulisan klien jatuh ke
`event_*`.

**K9 · Acara `live` memakai `template_snapshot` yang dibekukan.** (AB-14)
Perbaikan template tidak boleh mengubah acara yang sedang berjalan.

**K10 · Bingkai tidak boleh memuat teks tercetak.** (AB-18)
Nama dan tanggal selalu lewat layer teks bertoken yang digambar saat
compositing.

**K11 · Klien mengubah isi, bukan desain.** (AB-15)
Warna, font, posisi terkunci. Kalau klien butuh tampilan lain, jawabannya
template baru — **bukan tombol baru di Visual Builder.**

**K12 · Setiap acara wajib punya minimal satu bingkai aktif.** (AB-17)
Tanpa ini tamu buntu total di layar Pilih Bingkai.

### Booth tamu

**K13 · `filterCss` satu string dipakai di dua tempat** — `style.filter` pada
`<video>` dan `ctx.filter` saat compositing. Kalau dipisah, hasil unduhan beda
dengan yang dilihat tamu.

**K14 · Gagal pelan, jangan gagal total.**
`ctx.filter` absen di WebView lama → foto tetap tersusun tanpa filter. Overlay
gagal dimuat → foto tamu tidak hilang. `MediaRecorder` tidak didukung → tombol
video tidak muncul, unduh foto tetap jalan.

**K15 · `ended` ≠ `expired`.** (AB-11)
`ended` = keputusan klien, galeri **tetap terbuka**. `expired` = batas
komersial, semuanya terkunci.

**K16 · Masa aktif dihitung dari jadwal mulai, bukan tanggal publikasi.** (AB-09)

---

## 5. Stack & konvensi

| | |
|---|---|
| Framework | Next.js 15 App Router |
| Bahasa | TypeScript, `strict: true` |
| Styling | Tailwind v4 |
| State | Zustand |
| Bahasa antarmuka | **Bahasa Indonesia** — semua label, pesan error, teks kosong |

### Kode

- Komentar menjelaskan **kenapa**, bukan apa. Kalau komentarnya hanya
  mengulang kode, hapus.
- Nama variabel dan fungsi boleh Inggris; teks yang dilihat pengguna wajib
  Indonesia.
- Tidak ada `any`. Kalau terpaksa, beri komentar alasannya.
- Pesan error ditulis untuk pengguna, bukan developer. Sebutkan apa yang
  terjadi dan langkah berikutnya.

### Rute

| Prefix | Untuk |
|---|---|
| `/admin/*` | Staf platform (super admin, admin, support) |
| `/app/*` | Klien (owner, manager, operator) |
| `/e/{slug}` | Booth tamu, publik |

Jangan campur. Portal klien yang sekarang ada di `/admin/*` harus pindah ke
`/app/*` (BRD D-25).

### Git

- Pesan commit Bahasa Indonesia, imperatif: "Tambah validasi bingkai"
- **Jangan pernah menambahkan `Co-Authored-By` atau atribusi apa pun**
- Satu commit = satu perubahan yang masuk akal berdiri sendiri

---

## 6. Larangan

- Menambah dependensi tanpa bertanya dulu
- `localStorage` / `sessionStorage` untuk data yang seharusnya di server
- Menyimpan kuota, harga, atau aturan bisnis sebagai konstanta di kode — semua
  dari database
- Menulis nama pengantin ke dalam berkas PNG
- Membuat sidebar di portal admin (lihat `ADMIN-DESIGN-BRIEF.md` §11)
- `box-shadow` melayang, radius > 2px, atau gradien di portal admin
- Menghapus baris `quota_ledger`
- Mengubah berkas di `docs/` tanpa diminta
- Menjalankan migrasi database tanpa konfirmasi
- Mengarang angka, harga, atau nama paket yang tidak ada di BRD

---

## 7. Selesai artinya

Sebuah tugas dianggap selesai kalau:

- [ ] `npx tsc --noEmit` bersih
- [ ] `npm run build` lolos
- [ ] Aturan BRD yang relevan benar-benar ditegakkan, bukan sekadar tidak
      dilanggar
- [ ] Kondisi kosong dan kondisi gagal punya tampilan sendiri
- [ ] Teks pengguna Bahasa Indonesia
- [ ] Kalau menyentuh booth: diuji di viewport 390px
- [ ] Kalau menyentuh kuota: ada uji serentak
- [ ] Yang belum dikerjakan dilaporkan terus terang

---

## 8. Prioritas sekarang

Ikuti urutan di `docs/brd/09-DELTA-DARI-IMPLEMENTASI.md` §5. Ringkasnya:

**Tahap 1 — Fondasi data.** Skema DB, pindahkan template dari JSON ke tabel,
akun & jenis akun, buku besar kuota & dompet.

> Jangan lanjut ke tahap 2 sebelum uji serentak klaim kuota lulus.

**Tahap 2 — Portal Admin minimum.** Kategori, template, bingkai + validator,
paket, pesanan.

**Tahap 3 — Portal Klien sesuai BRD.** Pindah rute, wizard 3 langkah, cabut
kunci satu acara, alokasi dompet, Visual Builder dinamis, unggah bingkai
klien, gerbang publikasi 11 poin, snapshot template.

Empat hal yang jangan ditunda karena makin mahal kalau belakangan: buku besar
kuota, multi-akun, snapshot template, pembersihan EXIF + galeri privat.
