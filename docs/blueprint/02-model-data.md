# Blueprint 02 — Model Data

> Skema lengkap. Ditulis sebagai TypeScript karena itu yang akan langsung
> dipakai di kode, tapi **dirancang supaya tiap `interface` bisa jadi satu
> tabel** saat pindah ke database nanti.

---

## Prinsip perancangan

1. **Semua entitas punya `id` yang tidak pernah berubah.** Slug boleh
   diganti klien, `id` tidak. Referensi antar-entitas selalu pakai `id`.
2. **Salin nilai yang bersifat kesepakatan, jangan referensi.** Contoh:
   `Subscription.stripQuota` disalin dari `Plan` saat pembelian. Kalau
   harga/isi paket berubah bulan depan, kesepakatan klien lama tidak ikut
   berubah.
3. **Angka yang menentukan uang tidak boleh dipercayakan ke klien.**
   `stripQuota` dan `stripUsed` hanya boleh ditulis server.
4. **Semua tanggal disimpan ISO-8601 UTC.** Format tampilan dipisah.

---

## 1. Klien & Akses

```ts
/** Pemilik event. Satu akun = satu klien (multi-user menyusul). */
export interface Client {
  id: string;               // cli_xxx
  name: string;             // "Salma & Faizal" atau "EO Bahagia"
  email: string;            // dipakai login nanti
  createdAt: string;
  /** Ditandai kalau ini akun internal Glyka (bisa lihat semua event). */
  isStaff?: boolean;
}
```

---

## 2. Paket & Langganan

```ts
/** Katalog paket yang dijual. Dikelola GLYKA, bukan klien. */
export interface Plan {
  id: string;                    // plan_intimate
  name: string;                  // "Intimate"
  priceIdr: number;

  /** Batas yang dijual. */
  stripQuota: number;            // 100 / 300 / 1000
  maxFrames: number;             // berapa bingkai boleh dibuat
  maxVoiceSeconds: number;       // plafon; klien atur di bawah ini
  storageMb: number;             // total penyimpanan momen
  activeDays: number;            // masa hidup event sejak publish

  features: {
    voiceNote: boolean;
    momentsGallery: boolean;
    bulkDownload: boolean;
    removeGlykaBranding: boolean;
    customFrameUpload: boolean;  // false = hanya boleh pakai pustaka Glyka
  };
}

/** Kesepakatan nyata untuk SATU event. Nilai disalin dari Plan. */
export interface Subscription {
  id: string;
  clientId: string;
  eventId: string;
  planId: string;                // jejak asal, bukan sumber kebenaran

  /** Disalin saat pembelian — Plan boleh berubah, ini tidak. */
  stripQuota: number;
  maxFrames: number;
  maxVoiceSeconds: number;
  storageMb: number;
  features: Plan["features"];

  /** ⚠️ HANYA server yang boleh menulis. Lihat dokumen 06. */
  stripUsed: number;
  storageUsedMb: number;

  status: "active" | "exhausted" | "expired";
  startsAt: string;
  expiresAt: string;
}
```

---

## 3. Event

Menggantikan `EventConfig` yang sekarang.

```ts
export interface Event {
  id: string;                    // evt_xxx
  clientId: string;
  slug: string;                  // dulu `code` → URL /e/{slug}
  status: "draft" | "live" | "ended";

  identity: EventIdentity;
  frameIds: string[];            // dulu `allowedTemplates`
  theme: Theme;
  session: SessionConfig;
  copy: CopyOverrides;           // sebagian saja, sisanya default

  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface EventIdentity {
  /** Nama internal untuk klien sendiri, tidak tampil ke tamu. */
  internalName: string;          // "Lamaran Salma - Agustus"

  brandLabel: string;            // "Happy Engagement"
  names: string;                 // "Salma & Faizal"
  /** Disimpan sebagai tanggal sungguhan supaya bisa diurut/dibandingkan. */
  date: string;                  // "2026-08-08"
  /** Yang benar-benar dicetak. Klien boleh tulis bebas. */
  dateDisplay: string;           // "8 Agustus 2026"
  venue: string;
  hashtag: string;
  greeting: string;
}
```

> **Catatan `date` vs `dateDisplay`:** sekarang `date` cuma string
> `"8 Agustus 2026"` — tidak bisa dipakai untuk mengurutkan event atau
> menghitung masa aktif. Dipisah supaya keduanya dapat perannya.

---

## 4. Tema

```ts
export interface Theme {
  /** Titik awal. "custom" berarti klien sudah mengubah dari preset. */
  preset: "dark" | "light" | "custom";
  colors: ThemeColors;
  fontDisplayId: string;         // rujuk katalog font, bukan CSS mentah
  fontMonoId: string;
  decorAssetId?: string;         // PNG sudut
  videoBgAssetId?: string;       // latar kartu video 1080×1920
  effects: ThemeEffects;
  videoCard: VideoCardTheme;
}

/** 9 token, dipetakan ke CSS custom property lewat themeVars(). */
export interface ThemeColors {
  ink: string;        // latar halaman + teks di atas tombol terang
  film: string;       // latar sekunder
  edge: string;       // garis & ring
  smoke: string;      // teks redup
  paper: string;      // teks utama + latar tombol sekunder
  flash: string;      // aksen & fokus
  live: string;       // status merekam
  brandPurple: string; // gradasi awal
  brandGold: string;   // gradasi akhir
}

export interface ThemeEffects {
  petals: { enabled: boolean; count: number };
  blobs: boolean;
  confetti: boolean;
}

/**
 * Warna kartu video pesan suara. DIPISAH dari `colors` karena kartu ini
 * berlatar terang dan diunggah ke Reels/TikTok — tidak selalu cocok kalau
 * ikut tema gelap playground. Sekarang semua nilai ini hardcoded di
 * lib/video.ts dan tidak mengikuti tema sama sekali (lihat dokumen 01-E).
 */
export interface VideoCardTheme {
  bg: string;
  ink: string;
  smoke: string;
  waveActive: string;
  waveTrack: string;
  headingGradient: [string, string, string];
}
```

---

## 5. Konfigurasi Sesi

Ini rumah baru untuk semua "kode mati" di `lib/store.ts`.

```ts
export interface SessionConfig {
  countdownSeconds: 0 | 3 | 5 | 10;
  autoContinue: boolean;
  mirror: boolean;
  maxRetakes: number;            // 0-5
  revealMs: number;              // durasi animasi print, 0 = tanpa animasi
  filterCss: string;             // string filter CSS tunggal
  cameraAspect: "1:1" | "4:5" | "3:4";
  guestNameRequired: boolean;

  voice: {
    enabled: boolean;
    maxSeconds: number;          // dibatasi Subscription.maxVoiceSeconds
    /** Judul & ajakan bisa dikustom, lihat CopyOverrides. */
  };

  moments: {
    enabled: boolean;
    showGuestName: boolean;
  };

  share: {
    instagram: boolean;
    whatsapp: boolean;
    nativeShare: boolean;
    downloadPng: boolean;
    downloadJpg: boolean;
    downloadVideo: boolean;
  };
}
```

---

## 5b. Override Teks

Semua teks antarmuka punya nilai default di `lib/copy.ts`. Event hanya
menyimpan **yang diubah** — field kosong berarti pakai default.

```ts
/** Semua opsional. Yang tidak diisi memakai default sistem. */
export interface CopyOverrides {
  /** Layar selamat datang */
  welcomeKicker?: string;        // "Virtual Photobooth"
  welcomeCta?: string;           // "Mulai sesi foto"
  welcomeMomentsCta?: string;    // "Lihat Momen"
  guestNamePlaceholder?: string; // "Nama kamu"

  /** Label langkah di header */
  stepFrame?: string;            // "Pilih Bingkai"
  stepShoot?: string;            // "Sesi Foto"
  stepVoice?: string;            // "Pesan Suara"
  stepResult?: string;           // "Selesai"

  /** Pesan suara — paling sering perlu diubah untuk acara non-pernikahan */
  voiceTitle?: string;           // default memecah `names` pakai " & " (rapuh, lihat 06-T6)
  voiceIntro?: string;

  /** Galeri momen */
  momentsTitle?: string;         // "Momen Tamu Lainnya"
  momentsEmpty?: string;

  /** Layar kuota habis */
  quotaExhaustedTitle?: string;
  quotaExhaustedBody?: string;
}
```

Sisa teks (label tombol unduh, pesan error kamera/mikrofon, aria-label)
**sengaja tidak dibuka** untuk diubah — jarang perlu, dan membiarkan klien
mengubah pesan error justru berisiko membuat panduan pemulihan jadi salah.

---

## 6. Bingkai

Menggantikan `Template`.

```ts
export interface Frame {
  id: string;                    // frm_xxx
  /** null = pustaka bawaan Glyka, bisa dipakai semua klien. */
  clientId: string | null;

  name: string;
  blurb: string;

  /** Diambil otomatis dari PNG, bukan diisi manual. */
  width: number;
  height: number;
  printSize: string;

  overlayAssetId: string;
  paper: string;                 // auto-sampling dari PNG

  slots: Slot[];
  textLayers: TextLayer[];

  /** Jejak audit: dari mana koordinat slot berasal. */
  slotSource: "auto" | "manual" | "auto-adjusted";

  createdAt: string;
  updatedAt: string;
}

export interface Slot {
  x: number; y: number; w: number; h: number;
}

export interface TextLayer {
  /** Boleh memakai token: {{names}} {{date}} {{venue}} {{hashtag}} {{code}} */
  text: string;
  x: number; y: number;
  size: number;
  align: "left" | "center" | "right";
  color: string;
  face: "display" | "mono";
  weight?: number;
  tracking?: number;
  uppercase?: boolean;
  /** Font mengecil otomatis kalau melebihi lebar ini. */
  maxWidth?: number;
}
```

---

## 7. Aset

Sekarang tidak ada — file ditaruh manual ke `public/templates/`.

```ts
export interface Asset {
  id: string;                    // ast_xxx
  clientId: string;
  kind: "frame-overlay" | "decor-corner" | "video-bg";

  filename: string;              // nama asli dari user, untuk ditampilkan
  url: string;                   // path lokal atau URL Vercel Blob
  contentType: string;
  bytes: number;
  width: number;
  height: number;

  createdAt: string;
}
```

---

## 8. Momen

Sudah ada di `lib/moments.ts`, perlu ditambah `eventId` eksplisit.

```ts
export interface Moment {
  id: string;                    // UUID, JANGAN nomor struk (lihat dok 06)
  eventId: string;
  guestName?: string;
  photoUrl?: string;
  videoUrl?: string;
  createdAt: string;

  /** Untuk moderasi — belum ada sekarang, tapi akan dibutuhkan. */
  hidden?: boolean;
}
```

---

## 9. Katalog Font

```ts
/** Dikelola GLYKA. Klien memilih dari daftar ini, tidak upload font. */
export interface FontOption {
  id: string;                    // "playfair"
  label: string;                 // "Playfair Display"
  /** Nama Google Font untuk di-load dinamis. */
  googleFamily: string;
  category: "display" | "mono" | "sans" | "serif";
  weights: number[];
}
```

> Sekarang hanya 3 font, di-`import` statis di `app/layout.tsx`. Untuk
> katalog dinamis, font harus di-load lewat `<link>` ke Google Fonts atau
> `next/font` dengan daftar tetap yang lebih panjang. **Perhatian:** trik
> `--canvas-display` / `--canvas-mono` di `layout.tsx` harus tetap
> berfungsi, kalau tidak teks di canvas akan beda dengan di layar.

---

## 10. Pemetaan dari Model Lama

Untuk migrasi 2 event yang sudah ada menjadi data contoh:

| Lama | Baru | Perubahan |
|---|---|---|
| `EventConfig.code` | `Event.slug` | Ganti nama |
| `EventConfig.names/date/venue/hashtag/greeting/brandLabel` | `Event.identity.*` | Dikelompokkan; `date` dipecah jadi `date` + `dateDisplay` |
| `EventConfig.quota` | `Subscription.stripQuota` | **Pindah entitas** — bukan milik event lagi |
| `EventConfig.allowedTemplates` | `Event.frameIds` | Ganti nama |
| `EventConfig.voiceNoteEnabled` | `Event.session.voice.enabled` | Pindah |
| `EventConfig.maxVoiceSeconds` | `Event.session.voice.maxSeconds` | Pindah |
| `EventTheme.*` (9 warna) | `Theme.colors.*` | Dikelompokkan |
| `EventTheme.fontDisplay` | `Theme.fontDisplayId` | CSS var → id katalog |
| `EventTheme.decorDir` | `Theme.decorAssetId` | Folder → aset spesifik |
| `EventTheme.videoBg` | `Theme.videoBgAssetId` | Path → aset |
| `Template` | `Frame` | Ganti nama |
| `Template.overlay` | `Frame.overlayAssetId` | Path → aset |
| konstanta `MAX_RETAKES` | `session.maxRetakes` | Kode → data |
| konstanta `REVEAL_MS` | `session.revealMs` | Kode → data |
| konstanta `FILTER_CSS` | `session.filterCss` | Kode → data |
| store `countdownFrom` | `session.countdownSeconds` | Kode mati → data |
| store `autoContinue` | `session.autoContinue` | Kode mati → data |
| store `mirror` | `session.mirror` | Kode mati → data |

### Data contoh yang akan dibuat

Dua event yang sudah ada dijadikan seed, dimiliki klien demo:

1. **Wedding Salma & Faizal** — tema gelap maroon, 7 bingkai Sal&Sal,
   status `ended` (sudah dinonaktifkan dari daftar aktif)
2. **Engagement Sal & Sal** — tema terang krem-emas, 3 bingkai ENG,
   status `live`

Keduanya jadi contoh nyata bahwa satu sistem melayani dua tema yang sangat
berbeda — sekaligus bahan uji regresi setiap kali admin diubah.
