# Blueprint 04 — Arsitektur Teknis

> Bagaimana admin dan playground berbagi data tanpa database, dan bagaimana
> caranya supaya pindah ke database nanti tidak membongkar apa pun.

---

## 1. Struktur Direktori Sasaran

```
app/
  (playground)/
    page.tsx                    root → event default
    e/[slug]/page.tsx           playground per event
  admin/
    layout.tsx                  shell admin + penjaga auth
    login/page.tsx
    page.tsx                    dashboard
    events/[id]/page.tsx        editor bertab
    frames/[id]/page.tsx        editor bingkai
  api/
    moments/                    (sudah ada)
    admin/
      events/route.ts           CRUD event
      frames/route.ts           CRUD bingkai
      frames/detect/route.ts    deteksi slot dari PNG
      assets/route.ts           upload aset
      quota/route.ts            klaim strip (server-authoritative)

components/
  booth/                        komponen playground (pindahan dari components/)
  admin/                        komponen khusus admin
    ColorField.tsx
    SlotEditor.tsx
    LivePreview.tsx
    ...

lib/
  models/                       tipe murni, tanpa logika (dari dokumen 02)
    event.ts  frame.ts  theme.ts  plan.ts  moment.ts
  repo/                         ← LAPISAN KUNCI
    index.ts                    interface + pemilih implementasi
    json-file.ts                implementasi fase ini
    db.ts                       implementasi nanti (belum ada)
  services/                     logika bisnis, tidak tahu soal penyimpanan
    quota.ts                    klaim & hitung strip
    slots.ts                    deteksi slot dari PNG
    theme.ts                    themeVars, pemeriksa kontras
  compositor.ts  video.ts  camera.ts  voice.ts   (sudah ada)

data/                           ← penyimpanan fase ini (gitignore kecuali seed)
  clients.json
  events.json
  frames.json
  subscriptions.json
  seed/                         data contoh, ikut ke git
    events.seed.json
    frames.seed.json

public/
  uploads/{clientId}/           aset upload (lokal)
  templates/                    aset lama, jadi pustaka bawaan Glyka
```

---

## 2. Lapisan Repository — jantung keputusan "belum pakai DB"

Satu interface, banyak implementasi. Admin dan playground **hanya bicara ke
interface**, tidak pernah tahu datanya dari file JSON atau Postgres.

```ts
// lib/repo/index.ts
export interface Repo {
  events: {
    list(clientId?: string): Promise<Event[]>;
    getById(id: string): Promise<Event | null>;
    getBySlug(slug: string): Promise<Event | null>;
    create(input: NewEvent): Promise<Event>;
    update(id: string, patch: Partial<Event>): Promise<Event>;
    remove(id: string): Promise<void>;
    slugTaken(slug: string, exceptId?: string): Promise<boolean>;
  };
  frames: {
    list(clientId: string | null): Promise<Frame[]>;
    getById(id: string): Promise<Frame | null>;
    getMany(ids: string[]): Promise<Frame[]>;
    create(input: NewFrame): Promise<Frame>;
    update(id: string, patch: Partial<Frame>): Promise<Frame>;
    remove(id: string): Promise<void>;
  };
  subscriptions: {
    getByEventId(eventId: string): Promise<Subscription | null>;
    /** Menaikkan stripUsed secara atomik. Mengembalikan null bila habis. */
    claimStrip(eventId: string): Promise<Subscription | null>;
  };
  assets: { /* … */ };
  clients: { /* … */ };
}

/** Satu-satunya tempat implementasi dipilih. Ganti di sini saat pindah DB. */
export function getRepo(): Repo {
  return jsonFileRepo;   // nanti: process.env.DATABASE_URL ? dbRepo : jsonFileRepo
}
```

**Aturan:** tidak ada satu pun komponen atau route yang boleh `import` dari
`repo/json-file.ts` langsung. Semua lewat `getRepo()`. Kalau aturan ini
dijaga, migrasi ke DB benar-benar cuma menyentuh satu file.

### Implementasi JSON — hal yang gampang salah

```ts
// lib/repo/json-file.ts — pola penulisan aman
async function writeJson(file: string, data: unknown) {
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
  await rename(tmp, file);          // rename bersifat atomik di OS yang sama
}
```

Tiga jebakan yang harus ditangani sejak awal:

1. **Tulis-baca bersamaan** — dua tab admin menyimpan bersamaan bisa saling
   menimpa. Solusi fase ini: antrean tulis dalam proses (mutex sederhana per
   file). Ini cukup karena hanya ada satu proses Next.js saat dev.
2. **Penulisan setengah jalan** — kalau proses mati di tengah `writeFile`,
   file JSON rusak dan **semua event hilang**. Karena itu tulis ke `.tmp`
   lalu `rename` (atomik), jangan pernah menulis langsung ke file asli.
3. **Cache Next.js** — playground membaca lewat Server Component. Kalau
   di-cache, perubahan dari admin tidak muncul. Route playground harus
   `export const dynamic = "force-dynamic"` (fase ini), atau pakai
   `revalidateTag()` yang dipanggil setiap admin menyimpan (lebih baik,
   tapi menyusul).

> ⚠️ **Batas jujur pendekatan JSON:** filesystem Vercel bersifat sementara
> dan read-only untuk hal seperti ini. Artinya **admin berbasis JSON hanya
> bekerja di lokal.** Playground yang sudah live sekarang tetap jalan
> (datanya di-*bundle* saat build). Ini konsekuensi yang diterima dengan
> sadar karena tujuannya membangun admin dulu; begitu admin matang, pindah
> ke DB adalah syarat untuk deploy admin ke produksi. Lihat dokumen 05.

---

## 3. Bagaimana Playground Membaca

Sekarang:
```ts
// app/e/[code]/page.tsx
const ev = getEvent(decodeURIComponent(code));   // array hardcoded
```

Menjadi:
```ts
const repo = getRepo();
const event = await repo.events.getBySlug(slug);
if (!event || event.status === "draft") notFound();
const frames = await repo.frames.getMany(event.frameIds);
return <EventBooth event={event} frames={frames} />;
```

**Refactor yang dibutuhkan di `EventBooth`:** sekarang menerima
`code: string` lalu memanggil `getEvent()` sendiri di `useEffect`. Harus
diubah jadi menerima objek `event` + `frames` sebagai prop. Ini juga yang
memungkinkan preview hidup di admin (dokumen 03).

Komponen yang ikut terdampak:
- `StepFrame` — sekarang `import { TEMPLATES }` langsung, harus terima prop
- `StepShoot`, `StepVoice`, `StepResult` — baca `session.*` dari event,
  bukan konstanta
- `lib/store.ts` — `attach()` menerima konfigurasi sesi, bukan cuma event

---

## 4. Aset: Upload & Penyajian

Dua backend, pola yang sama dengan yang sudah dipakai di `lib/moments.ts`
(deteksi `process.env.VERCEL`):

| Lingkungan | Simpan ke | URL |
|---|---|---|
| Lokal (`next dev`) | `public/uploads/{clientId}/{assetId}.png` | `/uploads/...` |
| Vercel | Vercel Blob, prefix `assets/{clientId}/` | URL publik Blob |

Validasi wajib saat upload:
- Tipe: `image/png` saja untuk overlay & dekorasi (butuh alpha)
- Ukuran file: maks 10MB
- Dimensi: maks 4000×4000 (di atas itu compositing jadi lambat di HP)
- Untuk `video-bg`: wajib rasio 9:16, sarankan tepat 1080×1920

> Aset lama di `public/templates/` **tidak dipindah**. Ia didaftarkan
> sebagai `Asset` dengan `clientId: null` → jadi pustaka bawaan Glyka yang
> bisa dipakai semua klien sebagai titik awal.

---

## 5. Deteksi Slot di Node

Memindahkan algoritma yang sudah terbukti (dipakai untuk S4–S7, ENG1–3)
dari Python ke Node.

**Pilihan pustaka:**

| Pustaka | Kelebihan | Kekurangan |
|---|---|---|
| `sharp` | Sangat cepat, matang | Binary native — kadang rewel di serverless |
| `pngjs` | Murni JS, tanpa binary | Lebih lambat, PNG saja |
| `@napi-rs/canvas` | Bisa sekalian dipakai render preview server-side | Binary native |

**Rekomendasi: `pngjs`.** Cukup untuk kebutuhan ini (kita hanya perlu baca
alpha channel), tanpa risiko binary di serverless, dan input memang selalu
PNG.

```ts
// lib/services/slots.ts
export interface DetectedSlot extends Slot {
  /** area/bbox — mendekati 1 berarti benar-benar persegi. */
  fillRatio: number;
  /** true kalau kecil/aneh, tampilkan peringatan di admin. */
  suspicious: boolean;
}

export async function detectSlots(png: Buffer): Promise<{
  width: number;
  height: number;
  paper: string;          // warna opak paling sering muncul
  slots: DetectedSlot[];
}>;
```

Algoritma (persis yang sudah terbukti):
1. Mask `alpha < 10`
2. Connected components, 8-connectivity
3. Buang area < 5000px
4. Bounding box per komponen
5. Urut berdasarkan `y`
6. `paper` = warna opak dengan frekuensi tertinggi (bukan sampling sudut —
   sudut sering kena dekorasi gelap; ini pelajaran nyata dari analisis E1–E5)

---

## 6. Kuota — harus pindah ke server

**Masalah sekarang** (detail di dokumen 06): kuota dihitung di
`localStorage` **perangkat tamu**. Tiap HP punya penghitung sendiri, jadi
kuota 200 strip tidak pernah benar-benar habis. Untuk produk yang dijual
per strip, ini lubang mendasar.

**Rancangan pengganti:**

```
Tamu selesai sesi (StepResult)
   │
   ├─ POST /api/admin/quota/claim { eventId }
   │     server: baca subscription
   │             kalau stripUsed >= stripQuota → 409 (kuota habis)
   │             kalau tidak → stripUsed += 1 (atomik) → 200 { receipt }
   │
   ├─ 200 → tampilkan struk, lanjut upload momen
   └─ 409 → tampilkan "kuota acara sudah habis", momen tidak diupload
```

Yang harus dijaga:
- **Idempoten** — kirim `momentId` (UUID) bersama klaim; klaim ulang dengan
  UUID sama tidak menambah hitungan. Melindungi dari React Strict Mode,
  retry jaringan, dan tamu yang me-refresh.
- **Atomik** — di JSON: mutex; di DB nanti: `UPDATE ... WHERE strip_used <
  strip_quota RETURNING *`.
- **Gagal pelan** — kalau server tidak bisa dihubungi, jangan kunci tamu di
  layar kosong. Putuskan: izinkan lewat (risiko kelebihan pakai sedikit)
  atau tolak (risiko tamu kecewa). **Rekomendasi: izinkan lewat, catat
  sebagai `pendingClaim`** — kehilangan beberapa strip lebih murah daripada
  tamu marah di acara orang.

---

## 7. Autentikasi Admin

**Fase ini — sederhana tapi jangan asal:**
- Satu password di `ADMIN_PASSWORD` (environment variable)
- Login → set cookie `httpOnly`, `sameSite=lax`, `secure` di produksi,
  berisi token bertanda tangan (HMAC), bukan password
- `app/admin/layout.tsx` memeriksa cookie, redirect ke `/login` bila tidak
  valid
- Route `/api/admin/*` **wajib memeriksa sendiri** — jangan mengandalkan
  penjagaan di layout saja (layout tidak melindungi route handler)

**Yang sengaja ditunda:** registrasi, multi-user, reset password, OAuth,
peran (owner/editor). Semua butuh DB.

---

## 8. Isolasi Antar-Klien

Sejak awal, meski baru satu klien:

- Setiap query lewat repo **wajib** menyertakan `clientId`
- Route `/api/admin/*` mengambil `clientId` dari session, **tidak pernah**
  dari body request (kalau dari body, klien bisa mengarang milik orang lain)
- Aset disimpan berprefiks `{clientId}/`
- Momen berprefiks `{eventId}/`

Menambahkan ini nanti jauh lebih mahal daripada sejak awal.

---

## 9. Yang Tidak Berubah

Bagian ini sudah matang, admin dibangun **di atas**-nya, bukan
menggantikannya:

- `lib/compositor.ts` — mesin compositing, sudah dipakai bersama preview &
  ekspor
- `lib/camera.ts`, `lib/voice.ts` — akses perangkat + klasifikasi error
- `lib/video.ts` — kartu video (hanya perlu warnanya dijadikan parameter)
- `lib/moments.ts` + `app/api/moments/*` — penyimpanan momen, sudah
  dua-mode dan sudah diperbaiki dari bug tabrakan ID
- Pola CSS/WebKit di dokumen 01-I — **jangan diutak-atik saat refactor**
