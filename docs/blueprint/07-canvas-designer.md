# Blueprint 07 — Canvas Designer Bingkai

> Jawaban atas masalah di [dokumen 06](06-temuan-risiko.md): teks tercetak
> di dalam PNG → tiap klien butuh desain baru → jualan jasa, bukan produk.
>
> **Keputusan:** model **Template + Atur Teks**. Glyka membuat pustaka
> bingkai polos yang indah (sekali kerja), klien mempersonalisasi teksnya
> lewat canvas editor.

---

## 1. Filosofi: klien bukan desainer

Ini keputusan produk, bukan teknis, dan menentukan semua yang lain.

Bingkai Sal&Sal dan ENG adalah karya desain serius — botanical line-art,
rangkaian bunga, komposisi tipografi. **Calon pengantin tidak akan bisa
(dan tidak mau) membuat itu di editor web.** Yang mereka butuhkan:

> "Kasih saya desain yang cantik, taruh nama saya di situ."

Jadi pembagian perannya:

| Siapa | Mengerjakan apa | Frekuensi |
|---|---|---|
| **Desainer Glyka** | Bikin bingkai indah tanpa teks + posisikan layer teks default | Sekali per template, dipakai selamanya |
| **Klien** | Pilih template, geser/ganti font/warna teksnya | Tiap acara, 5 menit |

Satu template yang dibuat sekali bisa dijual ke ratusan acara. **Itu
yang membuat biaya per klien turun.**

---

## 2. Kabar baik: mesinnya sudah ada

`drawTextLayer()` di [`lib/compositor.ts`](../../lib/compositor.ts) sudah
mendukung:

| Kemampuan | Status |
|---|---|
| Token `{{names}}` `{{date}}` `{{venue}}` `{{hashtag}}` `{{code}}` | ✅ |
| Posisi x/y | ✅ |
| Ukuran font | ✅ |
| Perataan kiri/tengah/kanan | ✅ |
| Warna | ✅ |
| Pilihan font (display/mono) | ✅ |
| Ketebalan (weight) | ✅ |
| Jarak antar-huruf (tracking) | ✅ |
| HURUF KAPITAL otomatis | ✅ |
| **Penyusutan font otomatis** bila melebihi `maxWidth` | ✅ |

Yang **belum** ada:

| Kemampuan | Perlu? | Catatan |
|---|---|---|
| Teks multi-baris | **Ya, tambahkan** | Ucapan/quote sering 2 baris. Tambahan kecil di `drawTracked` |
| Rotasi | Nanti | Untuk teks miring dekoratif |
| Bayangan / garis tepi teks | Nanti | Membantu keterbacaan di atas foto |
| Teks melengkung | Tidak | Terlalu jauh untuk kebutuhan ini |
| Opacity per layer | Nanti | Murah, tapi jarang dipakai |

**Artinya: tidak perlu bangun mesin baru. Cukup bangun editornya**, plus
satu tambahan kecil (multi-baris).

---

## 3. Masalah paling kritis: WYSIWYG

Kalau editor menggambar teks pakai HTML (`<div>` yang diposisikan), lalu
hasil akhirnya digambar pakai canvas `fillText()` — **keduanya tidak akan
pernah sama persis**. Beda baseline, beda letter-spacing, beda font
rendering. Klien menggeser teks sampai pas di editor, hasil unduhannya
meleset. Ini melanggar prinsip P3 di [dokumen 00](00-ikhtisar.md).

### Solusi: canvas adalah satu-satunya sumber kebenaran visual

```
┌─────────────────────────────────────┐
│  Lapisan 3: HANDLE (DOM, transparan)│ ← interaksi: drag, resize
├─────────────────────────────────────┤
│  Lapisan 2: TEKS (canvas)           │ ← digambar drawTextLayer() asli
├─────────────────────────────────────┤
│  Lapisan 1: DASAR (canvas, di-cache)│ ← kertas + foto contoh + overlay PNG
└─────────────────────────────────────┘
```

- **Yang dilihat klien** = hasil `drawTextLayer()` yang sama persis dengan
  yang dipakai saat ekspor. Nol kemungkinan meleset.
- **Yang diklik/digeser klien** = kotak DOM transparan di atasnya.

### Kenapa dipisah dua canvas

Memanggil `compose()` penuh setiap gerakan mouse terlalu berat (memuat
gambar overlay, menggambar semua foto). Dengan dipisah:

- **Lapisan dasar** hanya digambar ulang saat bingkai/foto contoh berubah
- **Lapisan teks** digambar ulang tiap gerakan — murah, cuma `fillText`

Hasilnya: **tetap WYSIWYG sempurna bahkan saat sedang di-drag**, karena
kode penggambar teksnya persis sama.

### Refactor yang dibutuhkan di compositor

```ts
// Pecah compose() jadi dua, tanpa mengubah perilaku yang sudah ada
export async function composeBase(opts): Promise<HTMLCanvasElement>;  // kertas+foto+overlay
export function drawTextLayers(ctx, template, tokens, scale): void;   // teks saja

// compose() lama tetap ada, sekarang memanggil keduanya —
// supaya playground & ekspor tidak berubah sama sekali
export async function compose(opts) {
  const canvas = await composeBase(opts);
  drawTextLayers(canvas.getContext("2d")!, opts.template, opts.tokens, opts.scale);
  return canvas;
}
```

Plus satu fungsi baru untuk menempatkan handle:

```ts
/** Kotak batas tiap layer teks, untuk menempatkan handle DOM di atasnya.
    Memakai logika ukuran & penyusutan yang SAMA dengan drawTextLayer. */
export function measureTextLayers(
  template: Template,
  tokens: Record<string, string>,
  scale: number
): Array<{ index: number; x: number; y: number; w: number; h: number }>;
```

> Logika "hitung ukuran final setelah auto-shrink" harus diekstrak jadi
> satu fungsi yang dipakai bersama `drawTextLayer` dan `measureTextLayers`.
> Kalau dua-duanya menghitung sendiri, cepat atau lambat akan berbeda.

---

## 4. Tata Letak Editor

```
┌──────────────┬────────────────────────────┬──────────────────┐
│ LAYER        │                            │ PROPERTI         │
│              │      ┌──────────────┐      │                  │
│ ▸ Nama       │      │              │      │ Teks             │
│   {{names}}  │      │   [ FOTO 1 ] │      │ ┌──────────────┐ │
│ ▸ Tanggal    │      │              │      │ │{{names}}     │ │
│   {{date}}   │      │  ╔════════╗  │      │ └──────────────┘ │
│ ▸ Tagar      │      │  ║ Salma  ║◄─┼──────┤ + Sisipkan token │
│   {{hashtag}}│      │  ╚════════╝  │      │                  │
│              │      │   8 Agustus  │      │ Font  [Playfair▾]│
│ + Tambah     │      │              │      │ Ukuran ──●────   │
│              │      │   [ FOTO 2 ] │      │ Warna  [■] #A98D │
│              │      │              │      │ Rata   [≡][≣][≡] │
│ ─────────    │      └──────────────┘      │ Spasi  ──●────   │
│ Data preview │       ○ 50%  ○ 100%        │ ☑ HURUF BESAR    │
│ Nama: Salma  │                            │ Lebar maks ───●  │
│ Tgl : 8 Agu  │                            │                  │
└──────────────┴────────────────────────────┴──────────────────┘
```

### Kolom kiri — daftar layer
- Urutan gambar (atas = digambar terakhir = paling depan)
- Klik untuk memilih, geser untuk mengurutkan
- Ikon mata untuk sembunyikan sementara (bantu saat mengatur yang bertumpuk)
- **Panel data preview**: klien mengisi nama/tanggal contoh supaya bisa
  melihat hasil dengan data nyata, bukan `{{names}}` mentah

### Kolom tengah — kanvas
- Bingkai ditampilkan terskala; koordinat disimpan dalam **piksel asli PNG**
- Foto contoh otomatis dimasukkan ke slot (supaya klien lihat konteks utuh)
- Garis bantu slot foto (putus-putus) — supaya teks tidak tanpa sengaja
  tertutup/menutupi foto
- Zoom 50% / 100% / fit

### Kolom kanan — properti layer terpilih
Semua field `TextLayer`, dengan label manusiawi (bukan `tracking`, tapi
"Jarak antar huruf").

**Pemilih token** adalah fitur kunci — tombol yang menyisipkan
`{{names}}`, `{{date}}`, dst. ke dalam teks, sehingga klien tidak perlu
tahu sintaks kurung kurawal.

---

## 5. Interaksi yang wajib ada

| Interaksi | Perilaku |
|---|---|
| Klik layer | Pilih, tampilkan handle |
| Drag | Geser posisi; tampilkan koordinat live |
| Drag + Shift | Kunci sumbu (horizontal/vertikal saja) |
| Handle samping | Ubah `maxWidth` (bukan ukuran font — ini yang mengatur kapan font menyusut) |
| Panah keyboard | Geser 1px; + Shift = 10px |
| Delete | Hapus layer |
| Ctrl+Z / Ctrl+Y | **Undo/redo — wajib.** Klien harus berani bereksperimen |

### Snapping (yang membuat hasilnya terlihat rapi)
- Tengah horizontal & vertikal kanvas
- Tepi kiri/kanan/atas/bawah slot foto
- Sejajar dengan layer teks lain
- Garis bantu magenta muncul saat menempel, hilang saat lepas

Tanpa snapping, teks klien akan selalu miring 2–3 piksel dari tengah, dan
hasilnya terlihat amatir — padahal desain dasarnya bagus.

---

## 6. Alur Kerja Pustaka Template (sisi Glyka)

Ini yang mengubah aset jadi produk yang bisa dijual berkali-kali:

```
1. Desainer bikin bingkai di Photoshop — TANPA teks nama/tanggal
2. Export PNG, area foto benar-benar transparan
3. Staff Glyka upload lewat /admin/frames/new
4. Slot terdeteksi otomatis → dikoreksi kalau perlu
5. ► Staff memasang LAYER TEKS DEFAULT pakai token,
     diposisikan pas di tempat teks seharusnya
6. Simpan sebagai template global (clientId: null)
```

**Langkah 5 adalah inti dari "template".** Klien yang memilih template ini
langsung mendapat nama & tanggalnya terpasang rapi di posisi yang sudah
dirancang desainer — tinggal ganti font/warna kalau mau. Bukan disodori
kanvas kosong.

### Nasib bingkai yang sudah ada

Sesuai keputusan **"keduanya"**:

| Bingkai | Perlakuan |
|---|---|
| `sal-s1`…`sal-s7`, `eng-1`…`eng-3` | Tetap apa adanya (`textLayers: []`), melayani event Salma & Faizal. Tidak disentuh |
| Versi polos hasil export ulang | Masuk pustaka global sebagai `tpl-*` dengan layer teks default |

Modalnya tinggal menyembunyikan layer teks di `Eng.psd` lalu export ulang —
pekerjaan desain beberapa menit, tapi mengubah satu aset sekali-pakai
menjadi template yang bisa dijual ke semua klien.

> Untuk seri Sal&Sal (S1–S7) file sumbernya belum ada di repo — kalau
> PSD/AI-nya masih tersimpan, seri itu juga layak di-export ulang. Kalau
> tidak ada, biarkan sebagai bingkai kustom event tersebut.

---

## 7. Tambahan pada Model Data

`TextLayer` di [dokumen 02](02-model-data.md) ditambah:

```ts
export interface TextLayer {
  // … field yang sudah ada …

  /** Nama layer di daftar editor. Kalau kosong, pakai cuplikan teksnya. */
  label?: string;

  /** Multi-baris: jarak antar baris, kelipatan ukuran font. Default 1.2 */
  lineHeight?: number;

  /** Sembunyikan tanpa menghapus — untuk klien yang tidak mau tagar, dll. */
  hidden?: boolean;

  /** Dikunci staff Glyka: klien boleh ganti isi/warna, tapi tidak boleh
      menggeser. Menjaga template tetap terlihat rapi. */
  locked?: boolean;
}
```

`locked` layak dipertimbangkan serius: template yang dirancang dengan
komposisi seimbang bisa rusak kalau klien menggeser judul ke pojok. Dengan
`locked`, klien tetap bisa personalisasi (isi, font, warna) tanpa merusak
tata letak yang sudah dirancang desainer.

---

## 8. Urutan Pengerjaan

Masuk sebagai **Fase 3b**, setelah editor slot ([dokumen 05](05-peta-jalan.md)):

| Langkah | Ukuran | Hasil | Status |
|---|---|---|:--:|
| 3b.1 Pecah `compose()` → `composeBase()` + `drawTextLayers()` | `S` | Tidak ada perubahan tampilan; uji regresi harus identik | ✅ |
| 3b.2 `measureTextLayers()` + ekstrak logika auto-shrink | `S` | Dasar penempatan handle | ✅ |
| 3b.3 Dukungan multi-baris di `drawTracked` | `S` | `\n` + `lineHeight` | ✅ |
| 3b.4 Kanvas editor: dasar + teks + handle, pilih & geser | `M` | Sudah bisa memindahkan teks | ✅ |
| 3b.5 Panel properti + pemilih token | `M` | Sudah bisa personalisasi penuh | ✅ |
| 3b.6 Snapping + garis bantu + undo/redo | `M` | Hasilnya terlihat rapi & aman dicoba-coba | 🔧 belum |
| 3b.7 Pustaka template global + layer default | `S` | Model bisnisnya jalan | 🔧 belum ada template polos untuk dicoba |

Langkah **3b.1–3b.3 tidak menyentuh UI sama sekali** — murni penyiapan
mesin, diverifikasi lewat unduhan PNG sungguhan dari `?preview=struk`
sebelum/sesudah refactor (identik, tanpa error konsol) — lihat
[`components/admin/frame-editor/TextLayerEditor.tsx`](../../components/admin/frame-editor/TextLayerEditor.tsx)
untuk 3b.4–3b.5, dibuka lewat tombol **"Atur Teks"** di kartu bingkai
(`/admin/frames/[id]`).

**Yang sengaja ditunda ke iterasi berikutnya (3b.6):** snapping ke
tengah/tepi slot/layer lain, garis bantu magenta, dan undo/redo. Tanpa
snapping klien tetap bisa menata posisi lewat drag (dibulatkan ke piksel
terdekat) atau panah keyboard (1px, +Shift 10px) — cukup presisi untuk
memindahkan teks, tapi tidak otomatis "menempel rapi" seperti Figma/Canva.
Tanpa undo, kesalahan drag dibatalkan manual (geser balik) — belum
berisiko karena `layers` di editor adalah salinan kerja, tidak tersimpan
sampai tombol Simpan ditekan.

**3b.7 belum dikerjakan sama sekali** — pustaka 12 bingkai yang ada
semuanya punya teks TERBAKAR di dalam PNG-nya (dibuat untuk satu acara
spesifik, lihat §6 di atas), jadi belum ada satu pun bingkai "template
polos" untuk didemokan editor teksnya. Editor sudah siap dipakai begitu
ada PNG bingkai tanpa teks — ini pekerjaan desain (export ulang dari
Photoshop tanpa layer teks), bukan pekerjaan kode.

---

## 9. Ukuran Keberhasilan

Editor ini berhasil kalau **satu template yang sama** bisa dipakai dua
acara berbeda tanpa menyentuh Photoshop:

```
Template "Botanical Gold"
   ├─ dipakai "Salma & Faizal · 8 Agustus 2026"  → tampil rapi
   └─ dipakai "Nur Aisyah Rahmadhani &            → nama panjang,
       Muhammad Fadhlurrahman · 12 Desember 2027"    font menyusut
                                                     otomatis, tetap rapi
```

Kasus kedua bukan mengada-ada — komentar di `compositor.ts` sudah
mengantisipasinya: *"Nama pengantin bisa sangat panjang dan tidak boleh
keluar dari kertas — ini kasus yang pasti terjadi, bukan tepi jarang."*
Auto-shrink sudah ada; editor harus memperlihatkannya bekerja supaya klien
percaya.
