# Bundel Template Playground

Satu folder di sini = satu template. Semua berkas milik template itu —
PNG bingkai, dekorasi sudut, latar kartu video — tinggal berdampingan di
folder yang sama, supaya menambah/mencabut satu template tidak perlu
menelusuri berkas yang berserak di banyak tempat.

Nama foldernya dicatat di field `folder` pada entri template
(`lib/services/playgroundTemplates.ts`), jadi hubungan "template ↔
berkasnya" terbaca dari kode, bukan cuma tersirat dari URL aset.

## Contoh yang sudah jadi: `Engagement Photo Frame/`

Template **Botanical Terang** (`id: "botanical"`) — satu-satunya template
yang benar-benar lengkap saat ini.

| Berkas          | Dipakai sebagai                     | Terdaftar di                          |
| --------------- | ----------------------------------- | ------------------------------------- |
| `ENG1-token.png` | Bingkai 1 foto — **dipakai**       | `data/frames.json` → `frm_eng_1`       |
| `ENG2-token.png` | Bingkai 3 foto — **dipakai**       | `data/frames.json` → `frm_eng_2`       |
| `ENG3-token.png` | Bingkai 2 foto — **dipakai**       | `data/frames.json` → `frm_eng_3`       |
| `ENG1/2/3.png`   | Versi ASLI, teks tercetak — arsip  | — (tidak dirujuk lagi)                 |
| `decor-tl.png`   | Garis botani di sudut layar tamu   | `data/assets.json` → `ast_eng_decor`   |
| `bg-video.png`   | Latar kartu video pesan suara      | `data/assets.json` → `ast_eng_video_bg` |
| `Eng.psd`        | Berkas sumber (tidak dipakai app)  | —                                      |

Versi `-token.png` dibuat dengan menghapus tulisan "SAL & SAL",
"ENGAGEMENT", dan "2026 / 08-08" dari PNG aslinya — dekorasi botani,
cincin, dan lubang slot foto dipertahankan utuh (kanal alpha identik
byte-per-byte dengan aslinya). Sebagai gantinya `frm_eng_*` punya tiga
layer teks: `{{names}}`, label acara, dan `{{date}}`.

## Cara menambah template baru

Misalnya template "Retro" untuk acara kantor:

1. **Buat foldernya** — `public/templates/Retro/`, isi PNG bingkai +
   dekorasi sudut + latar kartu video.

   Bingkainya **jangan pakai tulisan yang tercetak di gambar**. Nama
   pasangan/tanggal ditaruh sebagai layer teks bertoken (`{{names}}`,
   `{{date}}`) supaya otomatis berganti mengikuti acara klien. Kalau
   teksnya dicetak langsung ke PNG, semua klien yang memakai template
   itu akan melihat nama orang lain di hasil fotonya.

   Contoh yang benar: `frm_eng_*` (setelah dibersihkan) dan
   `frm_polos_*`. Mulai dari PNG yang memang belum ada tulisannya —
   jauh lebih murah daripada menghapusnya belakangan.

2. **Daftarkan asetnya** ke `data/assets.json` (`clientId: null`) dan
   bingkainya ke `data/frames.json` (`clientId: null`, lengkap dengan
   `slots` + `textLayers` bertoken).

3. **Tambah satu entri** di `PLAYGROUND_TEMPLATES`
   (`lib/services/playgroundTemplates.ts`): warna, font, efek, `folder`,
   `decorAssetId`, `videoBgAssetId`, `frameIds`, dan `sample` (nama &
   tanggal contoh yang tampil saat template dipratinjau — bukan data
   klien).

Selesai. Template langsung muncul di menu **Template**, pratinjaunya
memakai `sample`, dan memasangnya otomatis ikut memasang bingkainya.
