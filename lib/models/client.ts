/**
 * KLIEN
 *
 * Pemilik event. Fase ini: satu akun = satu klien (multi-user menyusul
 * di Fase 8, lihat docs/blueprint/05-peta-jalan.md).
 */
export interface Client {
  id: string;
  /** Nama ORANG. Untuk vendor ini nama PIC-nya, bukan nama usahanya. */
  name: string;
  email: string;
  createdAt: string;
  /**
   * Akun internal Circle Snap — mengelola klien & acara milik orang lain.
   *
   * ⚠️ Staff TIDAK punya acara sendiri. Dulu justru sebaliknya: keempat
   * penjaga di app/api/admin/events/route.ts semuanya di-bypass kalau
   * isStaff, jadi staff adalah akun yang PALING bebas membuat event.
   * Itu kebalikan dari perannya. Sekarang staff ditolak membuat event
   * (lihat penjaga di route yang sama) dan sebagai gantinya mendapat
   * panel /admin/staff/* untuk melihat semua klien & acaranya.
   */
  isStaff?: boolean;
  /**
   * Nomor WhatsApp — jalur kontak WAJIB untuk klien baru.
   *
   * Bukan hiasan: alur pembayaran manual (lib/services/addons.ts →
   * MANUAL_TRANSFER_INSTRUCTIONS) menyuruh klien mengirim bukti transfer
   * ke WhatsApp kami, tapi sebelum field ini ada, staff sama sekali
   * tidak punya nomor klien untuk membalas atau menagih.
   *
   * Opsional di tipe demi klien lama yang terlanjur terdaftar tanpa
   * nomor — pendaftaran BARU mewajibkannya di
   * app/api/admin/register/route.ts.
   */
  whatsapp?: string;
  /**
   * Nama usaha / EO — hanya untuk `type: "vendor"`.
   *
   * Dipisah dari `name` karena keduanya beda: yang login orangnya
   * ("Budi"), yang tampil di daftar staff dan tagihan usahanya
   * ("Kirana Organizer"). Menyatukannya memaksa vendor memilih salah
   * satu dan salah di tempat lain.
   */
  businessName?: string;
  /** "personal" = 1 klien 1 event seumur hidup akun (mis. pengantin
      urus pernikahan sendiri). "vendor" = kelola banyak event (event
      organizer/vendor foto). Dipilih sekali saat daftar (app/admin/
      register/page.tsx), menentukan apakah dashboard menampilkan panel
      "Event Aktif" + boleh membuat event lebih dari satu — lihat
      app/api/admin/events/route.ts (penegakan sungguhan ada di sana,
      bukan cuma disembunyikan di UI) dan components/admin/AdminShell.tsx.
      Opsional supaya Client lama (klien demo, dibuat sebelum field ini
      ada) tidak perlu migrasi data — diperlakukan setara "vendor" kalau
      kosong (lihat eventKindMeta-style fallback di pemakainya). */
  type?: "personal" | "vendor";
  /** Hash password KHUSUS klien ini (format "salt:hash" hex, lihat
      lib/adminAuth.ts hashPassword/verifyClientPassword) — ada karena
      pendaftaran akun baru (app/api/admin/register/route.ts) butuh
      password per-klien sungguhan, beda dari klien demo lama yang masih
      pakai satu ADMIN_PASSWORD environment global (passwordHash kosong
      = fallback ke situ, lihat verifyClientPassword). */
  passwordHash?: string;
  /** Jatah event terbeli untuk Vendor/EO — bertambah lewat Order
      "add_event_slot" (lib/models/order.ts). Kosong/undefined = TIDAK
      DIBATASI (perilaku lama, semua Vendor/EO yang ada sekarang belum
      punya field ini). ⚠️ Field ini BELUM ditegakkan di
      app/api/admin/events/route.ts — menaikkan angkanya sekarang murni
      pencatatan, belum benar-benar mengunci apa pun. Penegakannya
      sengaja ditunda sebagai pekerjaan terpisah (lihat percakapan
      "Apalagi selanjutnya" — dipilih "Model Order" duluan, bukan ini). */
  eventSlotsTotal?: number;
  /** Paket yang dipilih klien saat membuat event PERTAMA (lihat
      app/api/admin/events/route.ts) — dipakai sebagai templat kuota
      untuk setiap event Vendor/EO berikutnya, dan penanda "sudah pernah
      pilih paket" (kosong = wizard buat event WAJIB menanyakan paket
      dulu). Akun demo lama tanpa field ini akan diminta memilih paket
      di event BERIKUTNYA yang dibuat — bukan dipaksa mundur ke event
      yang sudah ada. */
  planId?: string;
}

export type NewClient = Omit<Client, "id" | "createdAt">;
