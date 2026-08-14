# SnapCircle Admin — Brief Desain UI

Dokumen ini untuk dieksekusi, bukan didiskusikan. Setiap keputusan di sini
punya alasan yang tertulis; kalau mau menyimpang, simpangi dengan sadar.

---

## 1. Siapa yang memakai, dan dalam kondisi apa

Ini menentukan segalanya. Dashboard admin bukan satu produk — ada dua kondisi
pemakaian yang sangat berbeda, dan kebanyakan SaaS cuma mendesain untuk yang
pertama.

**Mode Meja** — pemilik WO/EO, laptop, kantor atau rumah, H-14 sebelum acara.
Tenang, punya waktu, mengisi data lengkap: bikin event, unggah bingkai, atur
kuota, tentukan tanggal aktif. Layar lebar, mouse, konsentrasi penuh.

**Mode Lokasi** — panitia, HP dalam genggaman, ballroom terang benderang, jam
20.00, acara sedang berjalan. Berdiri, satu tangan, cahaya menyilaukan layar,
dan yang ditanyakan cuma tiga hal: *masih ada sisa kuota berapa? foto tamu
masuk atau enggak? ada foto yang harus dihapus?* Tidak ada waktu membaca.

**Mode Pemilik Platform** — kamu sendiri, mengelola tenant, langganan, dan
kesehatan sistem. Frekuensinya jarang, jadi boleh padat dan tidak perlu manis.

Kegagalan paling umum di produk sejenis: seluruh dashboard didesain untuk Mode
Meja, lalu Mode Lokasi cuma dapat versi responsif yang diperkecil. Padahal Mode
Lokasi yang menentukan apakah panitia percaya produk ini saat acara berlangsung.

---

## 2. Tesis desain: meja cahaya

Booth tamu adalah **kamar gelap** — layar gelap supaya wajah tamu tersinari
dengan benar saat memotret. Admin adalah kebalikannya: **meja cahaya**, benda
yang dipakai fotografer untuk memeriksa negatif. Permukaan terang dan hangat,
kontras tinggi, presisi, tidak ada dekorasi.

Ini bukan sekadar "light mode". Konsekuensinya konkret:

- Permukaan kerja terang karena dipakai di ruangan terang. Dashboard gelap di
  ballroom yang benderang akan memantulkan wajah panitia, bukan datanya.
- Tidak ada bayangan melayang. Di atas kertas krem, `box-shadow` terlihat
  kotor. Elevasi dibuat lewat beda warna permukaan dan garis rambut.
- Sudut hampir tajam (2px). Kertas foto tidak punya sudut membulat 12px.
- Data adalah gambar. Foto tamu ditampilkan sebagai **contact sheet** —
  lembar kontak yang dipakai fotografer untuk melihat semua negatif sekaligus.
  Bukan tabel dengan kolom thumbnail.

Booth dan admin harus terasa satu produk. Yang menyatukan: token warna yang
sama, tipografi yang sama, dan satu animasi yang sama (lihat §8).

---

## 3. Token warna

Empat token dipakai bersama booth, tiga baru khusus permukaan terang.

```css
@theme {
  /* diwarisi dari booth — jangan diubah nilainya */
  --color-ink:    #14100E;  /* teks utama, isian tombol primer */
  --color-smoke:  #6C625C;  /* teks sekunder ≥14px saja (lihat catatan) */
  --color-flash:  #FFE45E;  /* penanda & isian — TIDAK PERNAH jadi warna teks di terang */
  --color-live:   #FF4D3D;  /* titik & garis peringatan — TIDAK PERNAH teks kecil di terang */

  /* khusus permukaan terang */
  --color-sheet:  #F1ECE2;  /* alas halaman, sedikit lebih gelap dari kartu */
  --color-card:   #FBF8F2;  /* permukaan kartu — elevasi tanpa bayangan */
  --color-rule:   #DED6C8;  /* garis rambut, pembatas, kerangka */
  --color-slate:  #574E48;  /* teks sekunder kecil (<14px) */
  --color-alarm:  #C42B1C;  /* teks error & peringatan */

  --radius-sheet: 2px;
}
```

### Aturan kontras yang wajib dipatuhi

Ini sudah dihitung, bukan perkiraan. Jangan dilanggar:

| Kombinasi | Rasio | Boleh dipakai untuk |
|---|---|---|
| `ink` di atas `sheet` | 15.4 | semua teks |
| `slate` di atas `sheet` | 6.1 | teks kecil, label, meta |
| `smoke` di atas `sheet` | 4.4 | **hanya** teks ≥14px, jangan untuk 11–12px |
| `live` di atas `sheet` | 2.8 | **gagal untuk teks** — hanya titik, garis, isian |
| `flash` di atas `sheet` | 1.2 | **gagal total untuk teks** — hanya isian & sorotan |
| `alarm` di atas `sheet` | 4.6 | teks error |

Kesalahan paling sering: memakai `flash` sebagai warna teks karena di booth
kelihatan bagus. Di booth latarnya gelap. Di admin latarnya krem, dan kuning di
atas krem praktis tidak terbaca.

---

## 4. Tipografi

Keluarga huruf sama persis dengan booth — Bricolage Grotesque, Instrument Sans,
Space Mono. Yang berubah adalah proporsi pemakaiannya.

Di booth, Bricolage tampil besar dan dramatis karena tamu perlu diarahkan. Di
admin, **Space Mono yang bekerja paling keras**: semua angka, kode event, sisa
kuota, timestamp, nomor strip. Bricolage dipakai kecil dan jarang, hanya untuk
judul layar dan angka metrik utama.

```
Judul layar      Bricolage 24px / 600 / -0.02em
Judul kartu      Bricolage 16px / 600
Angka metrik     Bricolage 40–72px / 600 / tabular
Isi & tombol     Instrument Sans 14px / 400
Label & meta     Space Mono 11px / uppercase / tracking 0.14em
Data & angka     Space Mono 13px / tabular-nums
```

**Wajib** di setiap angka yang bisa berubah hidup:

```css
font-variant-numeric: tabular-nums;
```

Tanpa ini, angka sisa kuota akan bergoyang setiap kali ada tamu baru memotret.
Detail kecil, tapi ini yang membedakan dashboard yang terasa dibuat serius
dengan yang tidak.

---

## 5. Struktur navigasi: waktu, bukan fitur

**Jangan pakai sidebar.** Admin punya empat tujuan, bukan dua belas. Sidebar
untuk empat item adalah perabot, bukan navigasi.

Pakai rel atas setinggi 56px: logo di kiri, empat tautan di tengah, akun di
kanan. Selesai.

Yang lebih penting: **daftar event diurutkan menurut waktu, bukan abjad atau
tanggal dibuat.** Model mental pengguna adalah hitung mundur menuju hari-H,
lalu acara berlangsung, lalu jadi arsip. Susunannya:

```
BERLANGSUNG SEKARANG   ← selalu di paling atas, walau kosong
MINGGU INI
AKAN DATANG
ARSIP                  ← terlipat secara bawaan
```

Kalau ada event yang sedang berlangsung, ia mengambil seluruh lebar dengan
angka kuota besar. Event lain jadi baris ringkas. Hirarki visualnya mengikuti
urgensi nyata, bukan perlakuan seragam.

Saat blok "berlangsung sekarang" kosong, jangan sembunyikan. Isi dengan satu
kalimat: *"Tidak ada acara berjalan. Berikutnya: Sarah & Wildan, 12 Oktober."*
Ruang kosong adalah tempat memberi arah.

---

## 6. Elemen tanda tangan: pita hitungan

Satu hal yang harus diingat orang dari dashboard ini.

Sisa kuota adalah angka yang dipelototi panitia sepanjang malam. Jangan
tampilkan sebagai progress bar biasa atau donat. Tampilkan sebagai **pita
hitungan** — deretan garis tipis, satu garis per strip terpakai, meniru
penghitung frame di kamera analog.

```
▐▐▐▐▐▐▐▐▐▐▐▐▐▐▐▐▐▐▐▐▐▐▐▐▐▐▐░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
        142 terpakai                        58 sisa
```

Kenapa ini lebih baik dari progress bar: garis yang terisi punya **tekstur**.
Sekali lihat, panitia tahu bukan cuma "berapa sisa" tapi juga apakah pemakaian
merata atau menumpuk. Untuk kuota 200, render 200 garis selebar 2px dengan
jarak 1px — muat di 600px dan terbaca sebagai satu benda utuh.

Warna: terpakai `ink`, sisa `rule`. Saat sisa ≤ 10%, garis sisa jadi `live`.

Pita ini muncul di tiga tempat: kartu event berlangsung, halaman detail event,
dan Mode Lokasi. Konsistensinya yang membuatnya jadi tanda tangan.

---

## 7. Layar per layar

### 7.1 Daftar Event — halaman muka

Urutan menurut waktu (§5). Kartu event yang sedang berlangsung memuat: nama
acara, pita hitungan lebar penuh, angka sisa dalam Bricolage 72px, dan **satu**
tombol: "Buka mode lokasi". Bukan enam tombol aksi.

Baris event lain: nama, tanggal, kode, sisa kuota sebagai angka kecil mono.
Klik ke detail. Tidak ada menu titik tiga di setiap baris — aksi ada di dalam.

### 7.2 Detail Event

Empat bagian dalam satu kolom, dipisah garis rambut. Bukan grid kartu
melayang.

**Identitas** — nama pasangan, tanggal, tempat, tagar, kode event, QR.
Semua field ini masuk ke bingkai secara otomatis, jadi tampilkan **pratinjau
bingkai langsung di samping form**. Panitia harus melihat namanya jatuh di
tempat yang benar sebelum acara, bukan setelah 200 strip tercetak salah.
Pratinjau memakai `compose()` yang sama dengan booth, scale 0.3.

**Kuota & paket** — pita hitungan, jumlah dibeli, terpakai, sisa. Tombol
"Tambah kuota" di sini, bukan di tempat lain.

**Bingkai** — kotak-kotak bingkai yang diizinkan, bisa dicentang. Unggah PNG
baru dengan area jatuh (drop zone) yang menampilkan pola arsir diagonal yang
sama dengan booth, supaya jelas mana yang akan jadi lubang foto.

**Aturan sesi** — jumlah foto, durasi hitung mundur, filter aktif/nonaktif,
pesan suara aktif/nonaktif, teks sambutan. Semua sebagai sakelar dan chip,
bukan dropdown. Dropdown menyembunyikan pilihan; di sini pilihannya sedikit dan
harus terlihat semua.

### 7.3 Contact Sheet — foto masuk

Ini permukaan kerja utama selama acara. Grid rapat tanpa jarak besar, strip
tamu ditampilkan seukuran kartu nama, mengalir dari kiri atas.

Setiap strip baru yang masuk memakai animasi `develop` **yang sama persis
dengan booth**. Ini satu-satunya jembatan visual antara dua sisi produk, dan
efeknya: panitia melihat foto "dicuci" muncul di layar mereka pada detik yang
sama tamu memotretnya. Itu momen yang membuat produk terasa hidup.

Hover memunculkan dua aksi saja: unduh, sembunyikan. Moderasi harus satu klik.
Kalau butuh tiga klik untuk menyembunyikan foto tidak pantas, panitia tidak
akan memakainya.

Tombol "Unduh semua" tetap di atas, selalu terlihat. Ini yang sebenarnya dibeli
panitia — semua foto tamu di akhir acara.

### 7.4 Mode Lokasi

Layar terpisah, bukan versi responsif dari dashboard. Dibuka lewat satu tombol
dari kartu event berlangsung.

Satu layar penuh, tanpa rel navigasi:

```
┌─────────────────────┐
│  SARAH & WILDAN     │  ← Space Mono 11px
│                     │
│        58           │  ← Bricolage 96px
│      SISA STRIP     │
│                     │
│ ▐▐▐▐▐▐▐▐░░░░░░░░░░  │  ← pita hitungan
│                     │
│  ⦿ 142 foto masuk   │  ← titik live berdenyut
│  ⦿ terakhir 20:47   │
│                     │
│ ┌─────────────────┐ │
│ │  Lihat foto     │ │  ← satu tombol, tinggi 56px
│ └─────────────────┘ │
└─────────────────────┘
```

Aturan Mode Lokasi:
- Ukuran teks minimum 16px. Tidak ada pengecualian.
- Target sentuh minimum 48px.
- Kontras maksimum — ini dibaca di bawah lampu ballroom.
- Angka diperbarui otomatis. Panitia tidak boleh perlu menarik untuk menyegarkan.
- Tidak ada form. Kalau butuh mengetik, itu kerjaan Mode Meja.

---

## 8. Anggaran gerak

Admin jauh lebih sunyi dari booth. Aturannya satu kalimat:

> **Hanya data hidup yang bergerak.**

Yang boleh beranimasi:
- Strip baru masuk ke contact sheet → `develop`, 900ms (persis seperti booth)
- Titik status live → `pulse-live`, 1.1s
- Pita hitungan bertambah → transisi lebar 400ms

Yang tidak boleh beranimasi: perpindahan halaman, munculnya kartu, hover pada
baris tabel, angka yang naik dengan efek berhitung, dan apa pun yang muncul
saat digulir. Dashboard yang elemennya bermunculan saat digulir terasa seperti
halaman pemasaran, bukan alat kerja.

`prefers-reduced-motion` tetap dihormati, sama seperti booth.

---

## 9. Komponen

Bangun tujuh ini saja. Kalau butuh yang kedelapan, kemungkinan besar layarnya
yang perlu disederhanakan.

| Komponen | Catatan |
|---|---|
| `CounterRibbon` | pita hitungan, terima `used` & `quota` |
| `EventRow` | baris ringkas untuk daftar |
| `LiveEventCard` | kartu lebar untuk event berjalan |
| `SheetSection` | bagian berpembatas garis rambut, pengganti kartu melayang |
| `FramePreview` | bungkus `compose()`, dipakai di form identitas |
| `ContactGrid` | grid strip + aksi hover |
| `Field` | label mono + input, satu gaya untuk semua |

Input: latar `card`, garis bawah `rule` setebal 1px, tanpa kerangka penuh.
Saat fokus, garis bawah jadi `ink` setebal 2px. Sederhana dan tidak berisik.

Tombol primer: isian `ink`, teks `card`, radius 2px, tinggi 44px. Tombol
sekunder: transparan, kerangka `rule`. Tombol merusak: teks `alarm`, kerangka
`alarm`, tanpa isian — aksi merusak tidak boleh terlihat menggoda.

---

## 10. Bahasa

Tulis dari sisi pengguna, bukan sisi sistem.

| Jangan | Pakai |
|---|---|
| Submit | Simpan perubahan |
| Event Configuration | Aturan sesi |
| Quota Usage: 142/200 | 58 strip tersisa |
| Upload Asset | Unggah bingkai |
| No data available | Belum ada foto masuk. Strip pertama akan muncul di sini. |
| Error: request failed | Kuota gagal ditambah. Coba lagi, atau hubungi kami kalau tetap gagal. |

Nama aksi harus sama dari tombol sampai konfirmasi. Tombol "Terbitkan"
menghasilkan pesan "Terbit" — bukan "Berhasil disimpan".

Layar kosong adalah ajakan bertindak, bukan pemberitahuan kekosongan. Layar
gagal menjelaskan apa yang terjadi dan langkah berikutnya, tanpa meminta maaf.

---

## 11. Yang jangan dibuat

Daftar ini sama pentingnya dengan sisi dokumen yang lain.

- Sidebar. Empat tujuan tidak butuh sidebar.
- Kartu melayang dengan bayangan di atas latar krem.
- Radius 8px atau lebih di mana pun.
- Chart donat untuk kuota. Pita hitungan sudah menggantikannya.
- Gradien. Satu pun tidak ada di produk ini.
- Angka yang naik dengan animasi berhitung saat halaman dimuat.
- Skeleton loader yang berkilau. Pakai teks sederhana: "memuat".
- Ikon di setiap baris menu. Empat tautan teks sudah cukup jelas.
- Dark mode untuk admin. Booth sudah gelap; admin sengaja terang. Dua tema
  untuk satu dashboard adalah beban perawatan tanpa imbalan.
- Grafik pemakaian per jam di MVP. Panitia tidak menanyakannya saat acara, dan
  pemilik WO tidak menanyakannya setelah acara. Tunggu sampai ada yang minta.

---

## 12. Prompt untuk Claude Code

```
Baca ADMIN-DESIGN-BRIEF.md sampai habis sebelum menulis kode.

Bangun dashboard admin di route /admin, memakai token dan aturan di brief itu.
Urutan pengerjaan:

1. Token warna & tipografi di globals.css (bagian terpisah dari token booth,
   jangan ubah token booth yang sudah ada)
2. Komponen CounterRibbon — ini elemen tanda tangan, kerjakan sampai benar
   dulu sebelum lanjut
3. Halaman daftar event dengan urutan menurut waktu
4. Halaman detail event dengan FramePreview yang memakai compose() dari
   lib/compositor.ts
5. Contact sheet
6. Mode lokasi di /admin/live/[code]

Data masih dari lib/event.ts, belum ada backend.

Yang tidak boleh: sidebar, box-shadow, radius >2px, gradien, chart donat,
dark mode. Lihat §11 untuk daftar lengkap.

Setelah selesai, jalankan dan laporkan bagaimana Mode Lokasi terlihat di
viewport 390px.
```
