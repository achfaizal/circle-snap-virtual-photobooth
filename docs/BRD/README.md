# BRD — Circle Snap Virtual Booth

Baseline dokumen kebutuhan bisnis. **Dokumen ini yang menang kalau bertentangan
dengan kode.** Kalau saat coding ada aturan yang tidak masuk akal, ubah BRD-nya
lewat catatan revisi (dok 09 §7) — jangan diam-diam menyimpang.

## Urutan baca

| Urutan | Dokumen | Kenapa |
|---|---|---|
| **1** | `09-DELTA-DARI-IMPLEMENTASI.md` | Apa yang bertentangan dengan kode sekarang, dan urutan pengerjaan |
| **2** | `00-RINGKASAN-DAN-ATURAN-BISNIS.md` | Glosarium + 22 aturan bisnis (AB-01…AB-22) yang dirujuk dokumen lain |
| 3 | `01-AKTOR-PERAN-DAN-HAK-AKSES.md` | Siapa boleh apa |
| 4 | `02-MODEL-KOMERSIAL-DAN-KUOTA.md` | Paket, dompet strip, buku besar, pesanan |
| 5 | `03-MODEL-DATA.md` | ERD + seluruh tabel & field |
| 6 | `04-PORTAL-ADMIN.md` | CMS staf platform |
| 7 | `05-PORTAL-KLIEN.md` | Perjalanan klien |
| 8 | `06-TEMPLATE-BINGKAI-VISUAL-BUILDER.md` | Kelas vs instans, validasi bingkai |
| 9 | `07-PENGALAMAN-TAMU.md` | Booth publik & klaim kuota |
| 10 | `08-NONFUNGSIONAL.md` | Keamanan, privasi, performa |

Dokumen pendamping di luar folder ini: `ADMIN-DESIGN-BRIEF.md` (arah visual
portal admin) dan `ALUR-PLAYGROUND.md` (aturan membuat template — masih
berlaku kecuali yang dibatalkan di dok 09).

## Konvensi

- Aturan bisnis diberi kode `AB-xx` dan dirujuk lintas dokumen serta di komentar kode
- Perbedaan dengan kode sekarang diberi kode `D-xx`
- Aturan paket diberi kode `P-xx`
- Pemeriksaan validasi bingkai diberi kode `V-x` / `W-x`

## Lima keputusan yang membentuk sisanya

1. **Satu mekanisme untuk dua jenis klien.** Semua pembelian masuk dompet;
   yang membedakan hanya `allocation_mode` paket. Bukan dua sistem terpisah.
2. **Kuota adalah buku besar, bukan penghitung.** Saldo dihitung dari jurnal
   yang hanya bisa ditambah.
3. **Template adalah kelas, acara adalah instans.** Tidak ada operasi klien
   yang menulis ke tabel template.
4. **Acara live memakai snapshot template yang dibekukan.** Perbaikan template
   tidak boleh mengubah acara yang sedang berjalan.
5. **Klien mengubah isi, bukan desain.** Kalau butuh tampilan lain, jawabannya
   template baru — bukan tombol baru di Visual Builder.
