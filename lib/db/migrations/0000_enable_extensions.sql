-- BRD dok 03 §2.1 dkk memakai `citext` untuk semua kolom email
-- (case-insensitive tanpa perlu lower() manual di setiap query).
-- Bukan ekstensi bawaan — harus diaktifkan sebelum tabel yang
-- memakainya dibuat.
CREATE EXTENSION IF NOT EXISTS citext;
