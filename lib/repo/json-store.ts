/**
 * Penyimpanan JSON generik dasar — dipakai lib/repo/json-file.ts untuk
 * tiap koleksi (events, frames, clients, subscriptions, assets).
 *
 * Bukan bagian dari kontrak `Repo` (lib/repo/index.ts) — murni detail
 * implementasi. Tidak boleh diimpor di luar lib/repo/.
 *
 * Empat hal yang wajib ditangani (docs/blueprint/04-arsitektur.md #2):
 *
 *  1. Tulis-baca bersamaan — dua permintaan menyimpan hampir berbarengan
 *     bisa saling menimpa. Diselesaikan dengan LOCK FILE di filesystem
 *     (lihat catatan #5 di bawah) — bukan antrean in-memory.
 *  2. Penulisan setengah jalan — kalau proses mati di tengah `writeFile`,
 *     file JSON rusak dan SEMUA data di koleksi itu hilang. Diselesaikan
 *     dengan tulis ke `.tmp` lalu `rename` (atomik di OS yang sama).
 *  3. Data awal — repo baru (`git clone` pertama kali) tidak punya
 *     data/*.json sama sekali. Kalau file koleksi belum ada, disalin dari
 *     data/seed/*.seed.json (yang ikut git) sekali saat pertama dibaca.
 *  4. Cache basi ANTAR KONTEKS BUNDEL — ketemu nyata waktu membangun
 *     pendaftaran klien (app/api/admin/register/route.ts): versi lama di
 *     sini cache in-memory selamanya sekali baca. Kelihatan aman untuk
 *     satu proses, TAPI Next dev (Turbopack) ternyata mengompilasi Route
 *     Handler dan Server Component (page.tsx/layout.tsx) sebagai bundel
 *     TERPISAH, masing-masing dapat instance modul (dan cache-nya)
 *     sendiri-sendiri — bukan satu singleton bersama seperti diasumsikan.
 *     Akibatnya: klien baru yang didaftarkan lewat API tidak kelihatan di
 *     halaman dashboard kalau bundel halaman itu sudah pernah baca
 *     clients.json sebelumnya (redirect balik ke login terus, seolah
 *     akun tidak ada). Diperbaiki dengan TIDAK cache sama sekali — tiap
 *     panggilan baca file langsung dari disk.
 *
 *  5. ⚠️ INSIDEN NYATA (2026-08-13): poin #4 di atas ternyata membuka
 *     bug lain yang lebih parah, ketemu waktu event PRODUKSI klien
 *     ("faizal") hilang total dari events.json. Versi lama menyerialkan
 *     tulis lewat SATU `Promise` di memori (`this.queue`), dengan asumsi
 *     itu cukup karena "next dev cuma satu proses". Asumsi itu SALAH —
 *     persis karena poin #4: tiap bundel Turbopack dapat instance
 *     `JsonCollection` sendiri-sendiri, jadi `this.queue`-nya juga
 *     terpisah-pisah, TIDAK saling tahu. Skenario nyatanya: admin
 *     membuat event baru dari browser (bundel Server Component) di saat
 *     yang RIS bersamaan dengan panggilan API (bundel Route Handler) —
 *     dua-duanya baca events.json (dapat isi lama yang sama), dua-duanya
 *     hitung array baru dari situ, yang nulis BELAKANGAN menang dan
 *     menimpa hasil yang duluan — "lost update" klasik. Data yang
 *     ditambahkan si "duluan" lenyap tanpa jejak, tanpa error di mana
 *     pun, karena masing-masing pihak yakin tulisannya sendiri berhasil.
 *
 *     Diperbaiki dengan LOCK FILE (`acquireLock`/`releaseLock` di bawah)
 *     — bukan `Promise` di memori. File lock hidup di filesystem, jadi
 *     otomatis berlaku lintas SEMUA instance modul dalam proses yang
 *     sama (dan bahkan lintas proses kalau suatu saat perlu), bukan
 *     cuma dalam satu instance. Operasi baca-ubah-tulis (`insert`,
 *     `patch`, `remove`, `mutateOne`) sekarang membaca file DI DALAM
 *     genggaman lock, bukan sebelum mengantre menulis — celah antara
 *     "baca" dan "tulis" yang jadi sumber race-nya sekarang tertutup.
 */
import { mkdir, open, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const SEED_DIR = path.join(DATA_DIR, "seed");

/** Lock lebih tua dari ini dianggap peninggalan proses yang mati di
    tengah jalan (crash/restart dev server) — diambil paksa daripada
    bikin semua penulisan macet selamanya menunggu lock yang tidak
    akan pernah dilepas. */
const STALE_LOCK_MS = 5000;

export class JsonCollection<T extends { id: string }> {
  private readonly file: string;
  private readonly lockFile: string;
  private readonly seedFile: string | null;

  constructor(filename: string, seedFilename?: string) {
    this.file = path.join(DATA_DIR, filename);
    this.lockFile = `${this.file}.lock`;
    this.seedFile = seedFilename ? path.join(SEED_DIR, seedFilename) : null;
  }

  /** Rebutan berbasis `open(..., "wx")` — gagal (EEXIST) kalau file lock
      sudah ada, itulah mekanisme "cuma satu pemenang"-nya. Dicoba ulang
      dengan jeda acak pendek supaya dua-tiga penulis yang menunggu
      bersamaan tidak selalu tabrakan lagi di percobaan berikutnya. */
  private async acquireLock(): Promise<void> {
    const startedAt = Date.now();
    for (;;) {
      try {
        const handle = await open(this.lockFile, "wx");
        await handle.close();
        return;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
        if (Date.now() - startedAt > STALE_LOCK_MS) {
          // Lock basi (proses pemegangnya kemungkinan sudah mati) —
          // ambil paksa daripada macet selamanya.
          await unlink(this.lockFile).catch(() => {});
          continue;
        }
        await new Promise((resolve) => setTimeout(resolve, 15 + Math.random() * 20));
      }
    }
  }

  private async releaseLock(): Promise<void> {
    await unlink(this.lockFile).catch(() => {});
  }

  /** Genggam lock selama `fn` berjalan — baca DAN tulis di dalamnya,
      supaya tidak ada celah antara "baca data lama" dan "tulis data
      baru" yang bisa diselingi penulis lain. */
  private async withLock<R>(fn: () => Promise<R>): Promise<R> {
    await this.acquireLock();
    try {
      return await fn();
    } finally {
      await this.releaseLock();
    }
  }

  private async load(): Promise<T[]> {
    let raw: string;
    try {
      raw = await readFile(this.file, "utf-8");
    } catch (err) {
      /**
       * ⚠️ HANYA "file memang belum ada" yang boleh jatuh ke seed.
       *
       * Versi lama menangkap SEMUA error di sini — termasuk JSON rusak,
       * izin ditolak, dan baca setengah jalan — lalu menimpa file dengan
       * seed/daftar kosong. Itu berarti satu gangguan baca sesaat
       * MENGHAPUS PERMANEN seluruh koleksi, diam-diam, tanpa satu pun
       * pesan error.
       *
       * Terbukti nyata (2026-08-14): acara produksi "q" lenyap dua kali
       * persis saat ada penulisan lain ke data/events.json. writeFileSync
       * memotong file dulu sebelum mengisi, jadi ada jendela beberapa
       * milidetik di mana isinya kosong; permintaan yang kebetulan
       * membaca di jendela itu membuat JSON.parse gagal → blok ini
       * menimpa file dengan `[]` → semua acara hilang.
       *
       * Sekarang: kegagalan selain ENOENT DILEMPAR. Lebih baik satu
       * halaman error yang kelihatan daripada data terhapus diam-diam —
       * error bisa dicoba lagi, data hilang tidak.
       */
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;

      // File koleksi belum ada — mulai dari seed kalau tersedia, kalau
      // tidak dari daftar kosong. Repo yang baru di-clone harus bisa
      // jalan tanpa langkah setup manual.
      let seeded: T[] = [];
      if (this.seedFile) {
        try {
          seeded = JSON.parse(await readFile(this.seedFile, "utf-8")) as T[];
        } catch (seedErr) {
          // Seed tidak ada = wajar. Seed ADA tapi rusak = kesalahan
          // penulis repo yang harus kelihatan, bukan didiamkan.
          if ((seedErr as NodeJS.ErrnoException).code !== "ENOENT") throw seedErr;
        }
      }
      // Tulis salinan kerja supaya perubahan berikutnya tidak menyentuh
      // file seed (yang ikut git dan jadi contoh untuk repo lain).
      await this.persist(seeded);
      return seeded;
    }

    try {
      return JSON.parse(raw) as T[];
    } catch {
      // Isi rusak — JANGAN ditimpa. Kalau ini benar-benar terjadi,
      // pemulihannya manual dari data/_hidden/ dan itu keputusan
      // manusia, bukan sesuatu yang boleh diambil diam-diam oleh kode.
      throw new Error(
        `Isi ${this.file} bukan JSON yang sah. Menolak menimpanya — pulihkan dari cadangan di data/_hidden/ lalu jalankan ulang.`
      );
    }
  }

  private async persist(items: T[]): Promise<void> {
    await mkdir(DATA_DIR, { recursive: true });
    const tmp = `${this.file}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tmp, JSON.stringify(items, null, 2), "utf-8");
    await rename(tmp, this.file); // atomik selama sama filesystem/volume
  }

  async readAll(): Promise<T[]> {
    const items = await this.load();
    return [...items]; // salinan — pemanggil tidak boleh memutasi cache
  }

  async getById(id: string): Promise<T | null> {
    const items = await this.load();
    return items.find((i) => i.id === id) ?? null;
  }

  /** Tulis seluruh koleksi. Dipakai HANYA saat pemanggil sudah menghitung
      array lengkapnya sendiri di dalam withLock (lihat insert/patch/remove
      di bawah) — jangan dipanggil langsung dari luar kelas ini dengan
      array yang dihitung dari readAll() terpisah, itu membuka celah race
      yang sama seperti insiden 2026-08-13. */
  private async writeAllLocked(items: T[]): Promise<T[]> {
    await this.persist(items);
    return items;
  }

  async insert(item: T): Promise<T> {
    return this.withLock(async () => {
      const items = await this.load();
      await this.writeAllLocked([...items, item]);
      return item;
    });
  }

  async patch(id: string, changes: Partial<T>): Promise<T | null> {
    return this.withLock(async () => {
      const items = await this.load();
      const idx = items.findIndex((i) => i.id === id);
      if (idx === -1) return null;
      const next = [...items];
      next[idx] = { ...next[idx], ...changes };
      await this.writeAllLocked(next);
      return next[idx];
    });
  }

  async remove(id: string): Promise<void> {
    await this.withLock(async () => {
      const items = await this.load();
      await this.writeAllLocked(items.filter((i) => i.id !== id));
    });
  }

  /**
   * Baca-ubah-tulis atomik untuk satu baris — dipakai claimStrip() supaya
   * "cek kuota lalu naikkan" tidak punya celah race condition antara dua
   * permintaan yang datang nyaris bersamaan. Diserialkan lewat lock file
   * yang sama dengan insert/patch/remove.
   */
  async mutateOne(id: string, mutate: (item: T) => T | null): Promise<T | null> {
    return this.withLock(async () => {
      const items = await this.load();
      const idx = items.findIndex((i) => i.id === id);
      if (idx === -1) return null;
      const result = mutate(items[idx]);
      if (result === null) return null; // ditolak (mis. kuota habis) — tidak menulis apa pun
      const next = [...items];
      next[idx] = result;
      await this.writeAllLocked(next);
      return result;
    });
  }
}

function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export { makeId };
