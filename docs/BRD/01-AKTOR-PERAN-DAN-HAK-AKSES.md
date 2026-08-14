# BRD — Circle Snap Virtual Booth
## 01 · Aktor, Peran & Hak Akses

---

## 1. Dua sumbu yang tidak boleh dicampur

Kesalahan paling sering di sistem seperti ini adalah menyatukan dua hal yang
berbeda menjadi satu kolom `role`. Padahal ada dua sumbu:

**Sumbu A — Jenis akun** (`accounts.type`): menentukan **apa yang boleh dibeli
dan bagaimana kuota berperilaku**.

- `personal` — Acara Sendiri
- `vendor` — Vendor / EO

**Sumbu B — Peran pengguna** (`account_members.role`): menentukan **apa yang
boleh dilakukan seseorang di dalam akun**.

- `owner`, `manager`, `operator`

Ditambah satu sumbu terpisah untuk staf platform (`users.platform_role`):

- `super_admin`, `admin`, `support`, `null`

Akun perorangan tetap punya struktur keanggotaan yang sama — hanya saja
anggotanya selalu satu orang dengan peran `owner`. Ini disengaja: satu
mekanisme izin untuk semua, bukan cabang khusus.

---

## 2. Aktor

### 2.1 Super Admin (platform)

Achmad / pemilik platform. Akses penuh termasuk hal yang merusak.

Yang hanya boleh dilakukan Super Admin:
- Mengubah peran platform pengguna lain
- Menghapus akun beserta datanya
- Penyesuaian kuota manual (jurnal `adjustment`)
- Mengubah paket yang sudah pernah terjual
- Melihat & mengekspor jejak audit
- Mengubah pengaturan sistem (retensi, batas unggah, kunci integrasi)

### 2.2 Admin (platform)

Staf operasional. Mengelola isi dan transaksi harian.

Boleh: kategori, template, bingkai sistem, paket (buat & ubah draft),
verifikasi pembayaran, pengawasan acara, membalas keluhan, menangguhkan acara
yang melanggar.

Tidak boleh: menghapus akun, penyesuaian kuota, mengubah peran platform.

### 2.3 Support (platform)

Baca saja + tindakan tak merusak. Boleh melihat akun, acara, pesanan, dan
riwayat kuota untuk menjawab pertanyaan. Boleh mengirim ulang email/QR. Tidak
boleh mengubah data.

### 2.4 Owner (akun klien)

Pemilik akun. Untuk perorangan, ini satu-satunya pengguna. Untuk vendor,
biasanya pemilik usaha.

Boleh: semuanya di dalam akunnya — beli paket, alokasi kuota, buat & hapus
acara, undang anggota, ubah data penagihan, hapus akun.

### 2.5 Manager (akun vendor)

Staf kantor vendor. Menyiapkan acara sebelum hari-H.

Boleh: buat & ubah acara, pilih template, Visual Builder, unggah bingkai,
publikasi, lihat & unduh Momen, alokasi kuota dari dompet.

Tidak boleh: membeli paket, mengubah data penagihan, mengundang atau
mengeluarkan anggota, menghapus akun.

### 2.6 Operator (akun vendor)

Kru yang bertugas di lokasi. Perannya sempit **dengan sengaja** — orang ini
memegang HP di keramaian, dan kesalahan tekan tidak boleh berakibat fatal.

Boleh: melihat acara yang ditugaskan padanya, memantau kuota, melihat galeri
Momen, menyembunyikan foto tidak pantas, mengunduh foto.

Tidak boleh: mengubah pengaturan acara, publikasi, menghapus apa pun secara
permanen, melihat harga atau penagihan.

> Peran ini tidak diminta secara eksplisit, tapi tanpa ini vendor akan
> membagikan kata sandi `owner` ke kru lapangan — dan itu berarti orang yang
> berdiri di dekat panggung punya wewenang menghapus acara dan melihat omzet.

### 2.7 Tamu (tanpa akun)

Pengunjung acara. Tidak mendaftar, tidak masuk. Identitas hanya nama yang
diketik sendiri, dan itu pun opsional tergantung pengaturan acara.

Boleh: membuka link acara aktif, menjalankan sesi foto, mengunduh hasilnya,
melihat galeri Momen kalau diaktifkan, meminta penghapusan fotonya sendiri.

---

## 3. Matriks hak akses

`✔` boleh · `—` tidak boleh · `◐` terbatas, lihat catatan

### 3.1 Portal Admin

| Kemampuan | Super Admin | Admin | Support |
|---|:--:|:--:|:--:|
| Lihat dasbor operasional | ✔ | ✔ | ✔ |
| CRUD kategori acara | ✔ | ✔ | — |
| CRUD template playground | ✔ | ✔ | — |
| Terbitkan / arsipkan template | ✔ | ✔ | — |
| CRUD bingkai sistem | ✔ | ✔ | — |
| CRUD paket (draft) | ✔ | ✔ | — |
| Terbitkan paket | ✔ | ✔ | — |
| Ubah paket yang sudah terjual | ✔ | — | — |
| Lihat daftar akun klien | ✔ | ✔ | ✔ |
| Ubah jenis akun (personal ↔ vendor) | ✔ | ✔ | — |
| Tangguhkan akun | ✔ | ✔ | — |
| Hapus akun & datanya | ✔ | — | — |
| Masuk sebagai klien (impersonasi) | ✔ | ◐¹ | — |
| Lihat pesanan | ✔ | ✔ | ✔ |
| Verifikasi pembayaran | ✔ | ✔ | — |
| Batalkan / kembalikan dana pesanan | ✔ | ◐² | — |
| Penyesuaian kuota manual | ✔ | — | — |
| Lihat semua acara | ✔ | ✔ | ✔ |
| Tangguhkan acara | ✔ | ✔ | — |
| Perpanjang masa aktif acara | ✔ | ✔ | — |
| Lihat galeri Momen milik klien | ✔ | ◐³ | ◐³ |
| Hapus media dari galeri | ✔ | ✔ | — |
| Kelola pengguna platform | ✔ | — | — |
| Lihat & ekspor jejak audit | ✔ | ◐⁴ | — |
| Ubah pengaturan sistem | ✔ | — | — |

¹ Wajib mengisi alasan; sesi impersonasi dibatasi 30 menit dan seluruhnya
tercatat di jejak audit.
² Hanya pesanan yang belum lunas. Pengembalian dana pesanan lunas butuh Super
Admin.
³ Hanya lewat tiket dukungan yang aktif, tercatat di jejak audit. Bukan menu
bebas jelajah — galeri berisi foto tamu, termasuk anak-anak di acara ulang
tahun.
⁴ Hanya jejak yang berhubungan dengan akun yang sedang ditangani.

### 3.2 Portal Klien

| Kemampuan | Owner | Manager | Operator |
|---|:--:|:--:|:--:|
| Lihat dasbor akun | ✔ | ✔ | ◐¹ |
| Beli paket / top-up | ✔ | — | — |
| Lihat harga & riwayat pembayaran | ✔ | — | — |
| Alokasi kuota dompet → acara | ✔ | ✔ | — |
| Tarik kembali alokasi | ✔ | ✔ | — |
| Buat acara | ✔ | ✔ | — |
| Ubah detail acara | ✔ | ✔ | — |
| Pilih / ganti template | ✔ | ✔ | — |
| Visual Builder | ✔ | ✔ | — |
| Unggah bingkai sendiri | ✔ | ✔ | — |
| Aktif/nonaktifkan bingkai | ✔ | ✔ | — |
| Publikasikan acara | ✔ | ✔ | — |
| Sudahi acara (`ended`) | ✔ | ✔ | ◐² |
| Hapus acara `draft` | ✔ | ✔ | — |
| Lihat galeri Momen | ✔ | ✔ | ✔ |
| Unduh satu / semua foto | ✔ | ✔ | ✔ |
| Sembunyikan foto | ✔ | ✔ | ✔ |
| Hapus foto permanen | ✔ | ✔ | — |
| Pantau kuota di lokasi | ✔ | ✔ | ✔ |
| Undang / keluarkan anggota | ✔ | — | — |
| Tugaskan operator ke acara | ✔ | ✔ | — |
| Ubah profil & kata sandi sendiri | ✔ | ✔ | ✔ |
| Ubah data penagihan | ✔ | — | — |
| Hapus akun | ✔ | — | — |

¹ Hanya acara yang ditugaskan padanya, tanpa angka rupiah apa pun.
² Hanya kalau owner/manager memberi izin `operator_can_end` pada acara itu.

---

## 4. Aturan penugasan operator

Operator tidak otomatis melihat semua acara vendor. Ia harus **ditugaskan**
ke acara tertentu lewat tabel `event_assignments`.

Alasannya praktis: vendor bisa punya tiga acara di akhir pekan yang sama
dengan kru berbeda. Kru acara A tidak perlu — dan tidak boleh — melihat galeri
acara B.

Penugasan otomatis berakhir 7 hari setelah acara `ended`.

---

## 5. Aturan kata sandi & sesi

| Hal | Aturan |
|---|---|
| Panjang kata sandi | Minimal 8 karakter |
| Larangan | Kata sandi yang ada di daftar bocoran umum ditolak dengan pesan jelas |
| Simpan | Argon2id. Jangan pernah bcrypt biaya rendah, jangan pernah SHA saja |
| Percobaan gagal | 5 kali dalam 15 menit → jeda bertingkat, bukan kunci permanen |
| Masa sesi | 30 hari untuk klien, **8 jam untuk pengguna platform** |
| Ganti kata sandi | Wajib memasukkan kata sandi lama; semua sesi lain diakhiri |
| Lupa kata sandi | Tautan sekali pakai, berlaku 60 menit |
| Ubah email | Verifikasi ke email lama **dan** baru |
| 2FA | Wajib untuk `super_admin` dan `admin`. Opsional untuk klien |

> 2FA wajib untuk staf platform bukan formalitas: satu akun admin yang jebol
> berarti akses ke galeri foto seluruh klien, termasuk acara anak-anak.

---

## 6. Aturan penangguhan

| Objek | Siapa | Efek |
|---|---|---|
| Akun ditangguhkan | Admin | Semua anggota tidak bisa masuk. Acara `live` **tetap berjalan** sampai selesai — tamu tidak boleh jadi korban sengketa penagihan. |
| Acara ditangguhkan | Admin | Link tamu langsung tertutup dengan pesan netral. Galeri tertutup. Kuota tidak dikembalikan otomatis. |
| Anggota dinonaktifkan | Owner | Sesi berakhir seketika. Penugasan operator ikut berakhir. |

Setiap penangguhan wajib memuat alasan dan tercatat di jejak audit (AB-22).
