-- Provisioning ROLE aplikasi non-superuser — Langkah 8 rencana Tahap 1.
--
-- Dijalankan MANUAL oleh admin DB (bukan lewat drizzle-kit — ini
-- perubahan hak akses, bukan bentuk tabel). Idempoten — aman dijalankan
-- ulang, tidak menghapus data.
--
-- K2 (AB-03): "Baris quota_ledger hanya boleh INSERT. Cabut hak
-- UPDATE/DELETE dari peran aplikasi." — REVOKE di sini yang membuat ini
-- benar-benar berlaku, bukan sekadar disiplin kode. Superuser/owner
-- SELALU bisa melewati GRANT/REVOKE, makanya koneksi RUNTIME aplikasi
-- (lib/db/client.ts) WAJIB pakai role ini, bukan role pemilik skema
-- yang dipakai drizzle-kit untuk migrasi.
--
-- Ganti '__APP_RUNTIME_PASSWORD__' sebelum dijalankan di lingkungan
-- sungguhan (lokal: password apa saja karena pg_hba.conf trust untuk
-- 127.0.0.1; Neon/produksi: WAJIB password kuat sungguhan).

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_runtime') THEN
    CREATE ROLE app_runtime LOGIN PASSWORD '__APP_RUNTIME_PASSWORD__';
  END IF;
END $$;

GRANT CONNECT ON DATABASE circlesnap TO app_runtime;
GRANT USAGE ON SCHEMA public TO app_runtime;

-- Bawaan: akses penuh ke SEMUA tabel yang SUDAH ADA (aplikasi butuh baca-
-- tulis normal ke accounts/events/frames/dst).
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_runtime;

-- Supaya tabel BARU yang dibuat lewat migrasi (role pemilik skema)
-- otomatis ikut ter-grant ke app_runtime tanpa perlu jalankan skrip ini
-- ulang tiap kali ada tabel baru.
ALTER DEFAULT PRIVILEGES FOR ROLE circlesnap_app IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_runtime;

-- K2 — pengecualian TUNGGAL: quota_ledger hanya INSERT + SELECT.
-- Dijalankan SETELAH grant umum di atas supaya urutannya menang benar.
REVOKE UPDATE, DELETE ON quota_ledger FROM app_runtime;
GRANT SELECT, INSERT ON quota_ledger TO app_runtime;
