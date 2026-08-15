import type { CSSProperties } from "react";
import type { CopyOverrides } from "./models/event";

/**
 * MODEL EVENT
 *
 * Di produk, ini datang dari API setelah tamu memindai QR. Di playground,
 * event di-hardcode dan kuota disimpan di localStorage supaya perilaku
 * "paket 200 foto habis" bisa benar-benar diuji tanpa backend.
 *
 * Bentuk objek ini sengaja dibuat menyerupai baris tabel `events` yang akan
 * dipakai nanti, jadi penggantian sumber data tidak menyentuh komponen.
 */

/**
 * Tema visual per event. Semua nilai warna di sini adalah CSS custom
 * property yang dipakai ulang oleh setiap util Tailwind (`bg-flash`,
 * `text-smoke`, `.btn-primary`, dst.) lewat `var(--color-*)` — jadi
 * menerapkan tema cukup dengan override variable ini di elemen pembungkus
 * sesi, tanpa menyentuh satu pun komponen langkah (bingkai/potret/suara/
 * struk). Kalau `theme` kosong, event memakai tampilan Circle Snap default.
 */
export interface EventTheme {
  ink: string;
  film: string;
  edge: string;
  smoke: string;
  paper: string;
  flash: string;
  live: string;
  brandPurple: string;
  brandGold: string;
  /** Nilai `--font-display` pengganti, mis. `var(--font-playfair)`. */
  fontDisplay?: string;
  /** Pasangan wajib dari `fontDisplay` di atas — nilai `--canvas-display`
      pengganti, mis. `var(--canvas-font-playfair)`. lib/compositor.ts
      TIDAK BISA membaca CSS variable berlapis (`--font-display`) untuk
      menggambar teks ke <canvas>, jadi field terpisah ini wajib diisi
      BARENGAN setiap kali `fontDisplay` diisi — kalau lupa, hasil unduhan
      foto akan pakai font default (Jakarta) padahal layar menampilkan
      font event. Lihat app/layout.tsx untuk daftar var `--canvas-font-*`
      yang tersedia, satu per font di FONT_DISPLAY_CSS (lib/adapters/legacy.ts). */
  canvasFontDisplay?: string;
  /** URL LANGSUNG ke satu PNG dekorasi sudut (transparan) — dipantulkan 4
      arah lewat CSS oleh komponen yang memakainya (EventBooth,
      MomentsGallery, lib/video.ts), bukan 4 file terpisah.
      ⚠️ Sebelum 2026-08-12 field ini bernama `decorDir` dan berupa FOLDER
      (komponen menambahkan "/decor-tl.png" sendiri) — cocok untuk aset
      lama di public/templates/*, tapi bingkai/dekorasi hasil UPLOAD klien
      (Asset.url) tidak pernah bernama persis "decor-tl.png", jadi selalu
      404 diam-diam. Sekarang field ini SUDAH berisi URL file lengkap;
      tidak ada lagi penggabungan nama file di pemakainya. */
  decorUrl?: string;
  /** Pengaturan elemen per layar (monogram, bentuk tombol, radius kartu)
      — lihat ThemeElements di lib/models/theme.ts. Semua opsional dan
      default-nya menyamai perilaku lama. */
  elements?: {
    monogram?: { mode: "initials" | "image" | "hidden"; url?: string; size?: number; ring?: boolean };
    /** Foto besar layar sambutan — `url` sudah diresolusi adapter dari
        assetId (komponen playground tidak tahu apa-apa soal Asset). */
    heroPhoto?: {
      mode: "hidden" | "circle" | "cover";
      url?: string;
      size?: number;
      overlay?: number;
    };
    buttonShape?: "pill" | "rounded" | "square";
    buttonStyle?: "gradient" | "solid" | "outline";
    cardRadius?: number;
  };
  /** Latar penuh 1080×1920 siap pakai untuk kartu video pesan suara (lihat
      `VoiceCardOptions.bgVideo` di lib/video.ts) — kalau diisi, gantikan
      latar putih + sapaan/nama/tanggal/hashtag bawaan, karena semua itu
      sudah tercetak di dalam gambarnya sendiri. */
  videoBg?: string;
  /** Toggle animasi ambien — dulu hardcode selalu-nyala di WelcomeScreen
      (blob+kelopak) dan StepResult (konfeti), sekarang bisa diatur admin
      lewat tab Tema (docs/blueprint/05-peta-jalan.md Fase 2). Opsional:
      undefined = semua nyala (perilaku lama, event tanpa field ini tidak
      berubah tampilannya sama sekali — prinsip P4 "gagal lembut"). */
  effects?: {
    petals: { enabled: boolean; count: number };
    blobs: boolean;
    confetti: boolean;
    /** Dua efek di bawah ditambahkan 2026-08-12 — opsional dan default
        MATI di pemakainya (WelcomeScreen), beda dari petals/blobs yang
        default menyala demi kompatibilitas event lama. */
    bokeh?: boolean;
    sparkle?: boolean;
  };
  /** Warna kartu video pesan suara (lib/video.ts) — dulu HARDCODE konstanta
      modul, tidak pernah ikut tema event sama sekali (temuan
      docs/blueprint/06-temuan-risiko.md T2/T4). undefined = kartu putih
      polos bawaan lama, perilaku event yang belum set field ini tidak
      berubah. */
  videoCard?: {
    bg: string;
    ink: string;
    smoke: string;
    waveActive: string;
    waveTrack: string;
    headingGradient: [string, string, string];
  };
}

/** Variable CSS yang dipakai ulang oleh setiap util Tailwind di seluruh
    komponen langkah (EventBooth, MomentsGallery, dst.). Override di sini
    saja sudah cukup untuk mengubah tampilan keseluruhan sesi. Komponen yang
    di-render lewat portal (di luar wrapper tema EventBooth, mis. modal)
    wajib menerapkan ini sendiri di root elemennya — CSS variable inline
    style tidak ikut terbawa lewat portal karena bukan lagi descendant DOM
    dari elemen yang di-style. */
export function themeVars(theme: EventTheme): CSSProperties {
  return {
    "--color-ink": theme.ink,
    "--color-film": theme.film,
    "--color-edge": theme.edge,
    "--color-smoke": theme.smoke,
    "--color-paper": theme.paper,
    "--color-flash": theme.flash,
    "--color-live": theme.live,
    "--color-brand-purple": theme.brandPurple,
    "--color-brand-gold": theme.brandGold,
    ...(theme.fontDisplay ? { "--font-display": theme.fontDisplay } : {}),
    ...(theme.canvasFontDisplay ? { "--canvas-display": theme.canvasFontDisplay } : {}),
  } as React.CSSProperties;
}

export interface EventConfig {
  /** ID event di repository (lib/repo/) — diisi kalau EventConfig ini hasil
      adaptasi dari model Event baru (lib/adapters/legacy.ts). Dipakai untuk
      klaim kuota server-authoritative (POST /api/quota/claim). Kosong untuk
      event lama yang masih hardcode di EVENTS bawah ini. */
  id?: string;
  /** Kosong untuk event lama. "ended" berarti sesi foto BARU ditolak (mirip
      kuota habis), tapi WelcomeScreen & galeri Momen tetap bisa dibuka —
      acara yang sudah lewat masih boleh dilihat-lihat lagi.
      "expired" (masa aktif 7 hari habis, lib/services/eventLifecycle.ts)
      beda dari "ended": momen JUGA terkunci — itu batas komersial, bukan
      keputusan panitia. Nilai ini dihitung server-side di
      toEventConfig(), tidak pernah disimpan sebagai status Event
      sungguhan. */
  status?: "draft" | "live" | "ended" | "expired";
  code: string;
  names: string;
  date: string;
  venue: string;
  hashtag: string;
  /** Jumlah strip yang dibeli klien, bukan jumlah jepretan. */
  quota: number;
  allowedTemplates: string[];
  /** Pesan sambutan dari tuan rumah, muncul sebelum sesi dimulai. */
  greeting: string;
  voiceNoteEnabled: boolean;
  maxVoiceSeconds: number;
  theme?: EventTheme;
  /** Sapaan besar di header sesi, galeri Momen, dan kartu video pesan
      suara — "Happy Wedding" kalau kosong, supaya event pernikahan yang
      sudah ada tidak perlu diubah. Event non-wedding (mis. lamaran) wajib
      isi ini sendiri. */
  brandLabel?: string;
  /** Perilaku sesi (docs/blueprint/02-model-data.md SessionConfig) — kalau
      ada, dipakai attach() di lib/store.ts untuk mengisi state sesi
      (hitung mundur, auto-lanjut, cermin, batas ulang, dst.) alih-alih
      nilai default hardcoded. Ini yang menghidupkan pengaturan yang dulu
      ada di store tapi tidak pernah bisa diubah dari UI mana pun (temuan
      06-T5: countdownFrom/autoContinue/mirror sudah ada field-nya di
      store sejak awal, cuma tidak pernah ada yang memanggil setter-nya). */
  session?: {
    countdownSeconds?: 0 | 3 | 5 | 10;
    autoContinue?: boolean;
    mirror?: boolean;
    maxRetakes?: number;
    revealMs?: number;
    filterCss?: string;
    cameraAspect?: "1:1" | "4:5" | "3:4";
    guestNameRequired?: boolean;
    /** Dua kelompok di bawah sudah lama ada di SessionConfig
        (lib/models/event.ts) tapi tidak pernah ikut sampai ke
        playground — jadi galeri & tombol bagikan selalu tampil apa pun
        isi datanya. Sekarang benar-benar dipakai. */
    moments?: {
      enabled?: boolean;
      showGuestName?: boolean;
    };
    share?: {
      instagram?: boolean;
      whatsapp?: boolean;
      nativeShare?: boolean;
      downloadPng?: boolean;
      downloadJpg?: boolean;
      downloadVideo?: boolean;
    };
  };

  /** Override teks antarmuka. Kosong = pakai default lib/copy.ts.
      Dibaca lewat resolveCopy(), bukan langsung. */
  copy?: CopyOverrides;

  /** Variabel DINAMIS per-template (Tahap 3 D-12, koreksi 16 Agu) —
      isi `event_variable_values` KLIEN, dipetakan dari definisi
      `template_variables` MILIK template acara. Kosong untuk event
      lama/hardcode (EVENTS di bawah). `key` yang bertabrakan dengan 5
      token tetap (names/date/venue/hashtag/code) SENGAJA tidak dobel
      ditampilkan di WelcomeScreen — lihat STANDARD_TOKEN_KEYS di bawah
      dan komponen yang memakainya. */
  variables?: { key: string; label: string; value: string; usedIn: string[] }[];
}

/** 5 token tetap yang sudah punya field khusus di EventConfig sendiri
    (names/date/venue/hashtag/code) — dipakai dua tempat: tokensFor()
    supaya nilai FIELD TETAP selalu menang kalau kebetulan ada variabel
    custom bernama sama, dan WelcomeScreen supaya variabel dinamis yang
    namanya sama tidak dobel ditampilkan. */
export const STANDARD_TOKEN_KEYS = new Set(["names", "date", "venue", "hashtag", "code"]);

// Event wedding (SALMA-FAIZAL) sengaja dikeluarkan dari daftar aktif per
// permintaan user — situs sekarang untuk satu klien (lamaran), bukan
// katalog beberapa event. Template & asetnya (lib/templates.ts sal-s1..s7,
// public/templates/Sal&Sal/*) SENGAJA TIDAK dihapus, cuma jadi tidak
// terjangkau — supaya gampang diaktifkan lagi lewat git history/backup
// kalau suatu saat dibutuhkan lagi, tanpa desain ulang dari nol.
export const EVENTS: EventConfig[] = [
  {
    // Sesi lamaran — satu-satunya event aktif sekarang, jadi juga yang
    // ditampilkan di root "/" (lihat app/page.tsx, EVENTS[0]).
    code: "ENGAGEMENT-SALFAIZAL",
    names: "Salma & Faizal",
    // Tercetak di dalam frame baru (ENG1-3.png) sebagai "2026 · 08-08".
    date: "8 Agustus 2026",
    venue: "Gedung Pernikahan",
    hashtag: "#SalmaFaizal",
    quota: 200,
    allowedTemplates: ["eng-1", "eng-2", "eng-3"],
    brandLabel: "Happy Engagement",
    greeting:
      "Terima kasih sudah datang di acara lamaran kami. Ambil foto sebanyak yang kamu mau, lalu titip pesan suara untuk kami.",
    voiceNoteEnabled: true,
    maxVoiceSeconds: 15,
    // Tema TERANG — beda dari wedding di atas (yang tetap maroon gelap).
    // Kontras dibalik dari skema gelap standar app, bukan cuma ganti 2
    // warna: `ink` di sini jadi krem terang (latar HALAMAN, dan warna teks
    // di atas tombol gradient/terang lewat class text-ink), `paper` jadi
    // cokelat gelap (teks utama di atas latar krem, DAN latar tombol
    // sekunder lewat bg-paper) — dua warna itu saling berlawanan kontras
    // di kedua skema, cuma peran dark/light-nya ditukar. `flash` persis
    // a98d4a sesuai permintaan; brandPurple/brandGold diganti jadi nuansa
    // emas gelap→terang (bukan ungu-pink) supaya gradient tombol & sapaan
    // "Happy Engagement" senada dengan bingkainya, bukan warna wedding.
    theme: {
      ink: "#F3F3E9",
      film: "#EAE7D8",
      edge: "#C9B78A",
      smoke: "#6B5D3F",
      paper: "#2E2A1E",
      flash: "#A98D4A",
      live: "#A63B2E",
      brandPurple: "#7A5E28",
      brandGold: "#D8C08A",
      fontDisplay: "var(--font-playfair)",
      // Sekarang punya dekorasi sudut sendiri (bukan pinjam Sal&Sal).
      decorUrl: "/templates/Engagement Photo Frame/decor-tl.png",
      // Latar video siap pakai — sudah ada "Sal & Sal · Engagement ·
      // 2026 · 08-08" tercetak di dalamnya, jadi renderVoiceCard tidak
      // perlu gambar ulang sapaan/nama/tanggal/hashtag di atasnya.
      videoBg: "/templates/Engagement Photo Frame/bg-video.png",
    },
  },
];

export function getEvent(code: string): EventConfig | undefined {
  return EVENTS.find((e) => e.code.toLowerCase() === code.toLowerCase());
}

/** Koreksi 16 Agu 2026 — dulu cuma 5 token tetap, sekarang juga
    mencampur `ev.variables` (template_variables dinamis, Tahap 3
    D-12) supaya `{{student_name}}` dkk di layer teks bingkai benar-benar
    tersubstitusi lib/compositor.ts, bukan diam-diam kosong. Field
    TETAP di-spread BELAKANGAN supaya selalu menang kalau kebetulan ada
    variabel custom bernama sama (mis. "names") — satu sumber kebenaran
    per key standar. */
export function tokensFor(ev: EventConfig): Record<string, string> {
  const custom = Object.fromEntries((ev.variables ?? []).map((v) => [v.key, v.value]));
  return {
    ...custom,
    names: ev.names,
    date: ev.date,
    venue: ev.venue,
    hashtag: ev.hashtag,
    code: ev.code,
  };
}

/* ----------------------------------------------------------- kuota lokal */

const key = (code: string) => `circlesnap-photobox:used:${code}`;

function readUsed(code: string): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(key(code));
  const n = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function bumpUsed(code: string): number {
  const next = readUsed(code) + 1;
  window.localStorage.setItem(key(code), String(next));
  return next;
}


/** Nomor strip untuk struk — dipakai sebagai bukti pemakaian kuota, dan
    sebagai nama dasar file unduhan (lihat `base` di StepResult.tsx) — jadi
    prefix-nya sengaja pendek (3 huruf, mis. "ENG-0001"), bukan slug penuh
    kode event, supaya nama filenya tidak kepanjangan. */
export function receiptNo(code: string, used: number): string {
  const prefix = code.replace(/[^A-Z0-9]/gi, "").slice(0, 3).toUpperCase();
  return `${prefix}-${String(used).padStart(4, "0")}`;
}
