# Data yang disembunyikan sementara (2026-08-12)

Tiga event lama (`engagement-salfaizal`, `salma-faizal`, `jay-nifa`) beserta
subscription-nya **disembunyikan sementara** supaya alur "daftar → beli paket →
bikin bingkai sendiri → bangun Visual Builder" bisa diuji dari nol tanpa
tercampur data lama.

**Tidak ada yang dihapus.** File `*.bak-2026-08-12` di folder ini adalah salinan
UTUH seluruh koleksi sebelum disembunyikan.

## Cara mengembalikan

```bash
cd glyka-virtual-photobooth
cp data/_hidden/events.json.bak-2026-08-12        data/events.json
cp data/_hidden/subscriptions.json.bak-2026-08-12 data/subscriptions.json
```

Kalau ingin mengembalikan SEMUANYA (termasuk klien/pesanan/bingkai ke keadaan
saat itu), salin balik keenam file `.bak-2026-08-12` ke `data/`.

## Yang TIDAK disentuh sama sekali

- `public/moments-local/` — momen tamu (ENGAGEMENT-SALFAIZAL, SALMA-FAIZAL)
  tetap utuh di tempatnya.
- `data/frames.json` — 12 bingkai pustaka Circle Snap masih aktif.
- `data/clients.json` — akun `demo@circlesnap.app` masih ada (dibutuhkan
  sebagai STAFF untuk mengonfirmasi pesanan).
