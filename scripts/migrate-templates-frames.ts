/**
 * Langkah 5 rencana Tahap 1 — pindahkan aset, bingkai, dan template
 * playground dari data/*.json (atau lib/services/playgroundTemplates.ts)
 * ke tabel di lib/db/schema/templates.ts. BUKAN sekali pakai — dipanggil
 * ulang di Langkah 13 (verifikasi akhir, jalan dari DB kosong) dan
 * setiap kali data live sungguhan siap dipindah.
 *
 * Jalan:
 *   npx tsx --env-file=.env.local scripts/migrate-templates-frames.ts --source=seed --dry-run
 *   npx tsx --env-file=.env.local scripts/migrate-templates-frames.ts --source=seed
 *   npx tsx --env-file=.env.local scripts/migrate-templates-frames.ts --source=live
 *
 * --source=seed  baca data/seed/{frames,assets}.seed.json (fixture nyata
 *                 — data/*.json live sekarang kosong, lihat docs/AUDIT-AWAL.md §2)
 * --source=live   baca data/frames.json + data/assets.json sungguhan
 * --dry-run       cetak ringkasan jumlah baris saja, tidak menulis ke DB
 *
 * PK lama berupa string (`ast_sal_s1`, `frm_eng_1`, ...), kolom `id` baru
 * bertipe uuid — skrip ini membangun peta id-lama→uuid-baru DI MEMORI
 * selama satu kali jalan (insert lalu langsung verifikasi di proses yang
 * sama), bukan menyimpannya sebagai kolom permanen di DB.
 *
 * ⚠️ TEMUAN yang diterima hilang, dicatat di sini (bukan dipindah diam-diam):
 * - `Frame.slotSource` (lib/models/frame.ts) — jejak audit dari mana
 *   koordinat slot berasal, cuma dipakai internal di wizard admin
 *   (components/admin/CreateFrameWizard.tsx), tidak pernah ditampilkan ke
 *   tamu. Tabel `frames` BRD tidak punya kolom untuk ini. Beda dengan
 *   `blurb` (lihat docs/BRD/09-DELTA-DARI-IMPLEMENTASI.md §7) — ini murni
 *   metadata pembuatan, bukan sesuatu yang sedang dilihat siapa pun.
 * - `Asset.filename` tidak punya kolom sendiri di tabel `assets` baru —
 *   dipetakan jadi bagian dari `storage_key` (lihat komentar di ASSET_KIND_MAP
 *   di bawah), bukan hilang, tapi tidak lagi field terpisah.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { eq, inArray } from "drizzle-orm";
import { db } from "../lib/db/client";
import { assets, frames } from "../lib/db/schema";
import { PLAYGROUND_TEMPLATES } from "../lib/services/playgroundTemplates";

const PROJECT_ROOT = join(__dirname, "..");

// --- tipe data lama (disalin field-nya di sini, bukan diimpor dari
//     lib/models/*, supaya skrip ini tidak ikut rusak kalau model lama
//     nanti dihapus setelah Tahap 3 selesai rewire) ---
interface OldAsset {
  id: string;
  clientId: string | null;
  kind: "frame-overlay" | "decor-corner" | "video-bg";
  filename: string;
  url: string;
  contentType: string;
  bytes: number;
  width: number;
  height: number;
  createdAt: string;
}
interface OldSlot {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface OldTextLayer {
  [key: string]: unknown;
}
interface OldFrame {
  id: string;
  clientId: string | null;
  name: string;
  blurb: string;
  width: number;
  height: number;
  printSize: string;
  overlayAssetId: string;
  paper: string;
  slots: OldSlot[];
  textLayers: OldTextLayer[];
  slotSource: "auto" | "manual" | "auto-adjusted";
  createdAt: string;
  updatedAt: string;
}

// Asset.kind (3 nilai) → assets.kind BRD (9 nilai) — tidak 1:1, ini
// keputusan pemetaan, bukan padanan resmi:
//   frame-overlay → frame   (PNG bingkai itu sendiri)
//   decor-corner  → decor   (padanan langsung)
//   video-bg      → video   (paling dekat; BRD tidak punya "video-bg" khusus)
const ASSET_KIND_MAP: Record<OldAsset["kind"], string> = {
  "frame-overlay": "frame",
  "decor-corner": "decor",
  "video-bg": "video",
};

function parseArgs() {
  const args = process.argv.slice(2);
  const source = args.includes("--source=live") ? "live" : "seed"; // bawaan: seed
  const dryRun = args.includes("--dry-run");
  return { source, dryRun } as const;
}

function loadJson<T>(relPath: string): T {
  return JSON.parse(readFileSync(join(PROJECT_ROOT, relPath), "utf-8")) as T;
}

/** Deep-equal yang tidak peduli urutan KEY objek (Postgres jsonb
    menyusun ulang key secara internal — itu bukan perubahan data,
    cuma representasi) tapi TETAP peduli urutan ELEMEN array (urutan
    slot/carousel itu berarti). */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (typeof a === "object" && typeof b === "object") {
    const aKeys = Object.keys(a as object).sort();
    const bKeys = Object.keys(b as object).sort();
    if (aKeys.length !== bKeys.length || aKeys.some((k, i) => k !== bKeys[i])) return false;
    return aKeys.every((k) => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }
  return false;
}

/** Checksum SUNGGUHAN dari berkas PNG di public/ — bukan dikarang, sebab
    Asset lama tidak punya kolom checksum sama sekali. Kalau berkasnya
    tidak ada di disk (mis. aset yang cuma ada di object storage
    produksi), gagal jelas daripada diam-diam diisi string kosong. */
function realChecksum(url: string): string {
  const filePath = join(PROJECT_ROOT, "public", url.replace(/^\//, ""));
  const bytes = readFileSync(filePath); // sengaja tanpa try/catch — lihat komentar di atas
  return createHash("sha256").update(bytes).digest("hex");
}

async function main() {
  const { source, dryRun } = parseArgs();
  const assetsPath = source === "seed" ? "data/seed/assets.seed.json" : "data/assets.json";
  const framesPath = source === "seed" ? "data/seed/frames.seed.json" : "data/frames.json";

  const oldAssets = loadJson<OldAsset[]>(assetsPath);
  const oldFrames = loadJson<OldFrame[]>(framesPath);

  console.log(`Sumber: ${source}`);
  console.log(`  ${assetsPath}: ${oldAssets.length} aset`);
  console.log(`  ${framesPath}: ${oldFrames.length} bingkai`);
  console.log(`  playgroundTemplates.ts: ${PLAYGROUND_TEMPLATES.length} template`);

  for (const a of oldAssets) {
    if (a.clientId !== null) {
      throw new Error(
        `Aset ${a.id} punya clientId=${a.clientId} — pemetaan client→account belum ada ` +
          `(itu Langkah 7). Skrip ini cuma menangani aset milik sistem (clientId: null).`
      );
    }
  }
  for (const f of oldFrames) {
    if (f.clientId !== null) {
      throw new Error(
        `Bingkai ${f.id} punya clientId=${f.clientId} — pemetaan client→account belum ada ` +
          `(itu Langkah 7). Skrip ini cuma menangani bingkai milik sistem (clientId: null).`
      );
    }
  }

  if (dryRun) {
    console.log("\n--dry-run: tidak menulis apa pun ke DB.");
    process.exit(0);
  }

  // --- 1. assets ---
  const assetIdMap = new Map<string, string>(); // id lama -> uuid baru
  for (const a of oldAssets) {
    const [row] = await db
      .insert(assets)
      .values({
        accountId: null,
        kind: ASSET_KIND_MAP[a.kind] as (typeof assets.$inferInsert)["kind"],
        storageKey: a.url, // lihat catatan berkas di atas — tidak ada storage_key asli
        mime: a.contentType,
        bytes: a.bytes,
        width: a.width,
        height: a.height,
        checksumSha256: realChecksum(a.url),
        visibility: "public", // semua aset sistem/template, bukan unggahan tamu
        createdAt: new Date(a.createdAt),
      })
      .returning({ id: assets.id });
    assetIdMap.set(a.id, row.id);
  }
  console.log(`\nassets: ${assetIdMap.size} baris dimasukkan`);

  // --- 2. frames ---
  const frameIdMap = new Map<string, string>();
  for (const f of oldFrames) {
    const newAssetId = assetIdMap.get(f.overlayAssetId);
    if (!newAssetId) {
      throw new Error(`Bingkai ${f.id} merujuk overlayAssetId ${f.overlayAssetId} yang tidak ada di ${assetsPath}.`);
    }
    const [row] = await db
      .insert(frames)
      .values({
        accountId: null,
        name: f.name,
        blurb: f.blurb,
        assetId: newAssetId,
        width: f.width,
        height: f.height,
        paper: f.paper,
        slots: f.slots,
        textLayers: f.textLayers,
        printSize: f.printSize,
        slotCount: f.slots.length,
        isLocked: true, // account_id null = bingkai sistem (dok 03 §3.5)
        status: "active",
        createdAt: new Date(f.createdAt),
        updatedAt: new Date(f.updatedAt),
      })
      .returning({ id: frames.id });
    frameIdMap.set(f.id, row.id);
  }
  console.log(`frames: ${frameIdMap.size} baris dimasukkan`);

  // --- 3. templates + template_frames ---
  //
  // PLAYGROUND_TEMPLATES kosong saat ini (lib/services/playgroundTemplates.ts,
  // direset 14 Agu 2026), jadi tidak ada baris nyata untuk dipindah. Kalau
  // katalog itu diisi lagi SEBELUM baris ini diperbarui: berhenti jelas,
  // bukan menebak. `templates.cover_asset_id` dan `default_session_config`
  // wajib (NOT NULL) di tabel baru, tapi `PlaygroundTemplate` lama tidak
  // punya padanan untuk keduanya sama sekali — pemetaan lengkap field lain
  // (code/name/tagline/folder/brandLabel/themeColors/dst.) sudah dicoba di
  // percobaan awal berkas ini, lihat riwayat git kalau perlu contekan saat
  // menuliskannya ulang.
  if (PLAYGROUND_TEMPLATES.length > 0) {
    throw new Error(
      `PLAYGROUND_TEMPLATES sekarang punya ${PLAYGROUND_TEMPLATES.length} entri, tapi skrip ini ` +
        `belum tahu cara mengisi templates.cover_asset_id/default_session_config (tidak ada di ` +
        `model lama). Lengkapi pemetaannya secara sadar di sini dulu sebelum menjalankan migrasi ini.`
    );
  }
  const templateCount = 0;
  const templateFrameCount = 0;
  console.log(`templates: ${templateCount} baris dimasukkan (katalog lama memang kosong)`);
  console.log(`template_frames: ${templateFrameCount} baris dimasukkan`);

  // --- verifikasi lossless: baca balik dari DB, banding field-per-field
  //     dengan sumber — bukan diperiksa mata ---
  console.log("\n--- verifikasi ---");
  let mismatches = 0;

  const dbAssets = await db.select().from(assets).where(inArray(assets.id, [...assetIdMap.values()]));
  const dbAssetById = new Map(dbAssets.map((a) => [a.id, a]));
  for (const a of oldAssets) {
    const row = dbAssetById.get(assetIdMap.get(a.id)!);
    if (!row) {
      console.error(`HILANG: asset ${a.id} tidak ketemu lagi di DB`);
      mismatches++;
      continue;
    }
    const checks: [string, unknown, unknown][] = [
      ["kind", row.kind, ASSET_KIND_MAP[a.kind]],
      ["storageKey", row.storageKey, a.url],
      ["mime", row.mime, a.contentType],
      ["bytes", row.bytes, a.bytes],
      ["width", row.width, a.width],
      ["height", row.height, a.height],
    ];
    for (const [field, dbVal, srcVal] of checks) {
      if (dbVal !== srcVal) {
        console.error(`SELISIH asset ${a.id}.${field}: db=${JSON.stringify(dbVal)} src=${JSON.stringify(srcVal)}`);
        mismatches++;
      }
    }
  }

  const dbFrames = await db.select().from(frames).where(inArray(frames.id, [...frameIdMap.values()]));
  const dbFrameById = new Map(dbFrames.map((f) => [f.id, f]));
  for (const f of oldFrames) {
    const row = dbFrameById.get(frameIdMap.get(f.id)!);
    if (!row) {
      console.error(`HILANG: frame ${f.id} tidak ketemu lagi di DB`);
      mismatches++;
      continue;
    }
    const scalarChecks: [string, unknown, unknown][] = [
      ["name", row.name, f.name],
      ["blurb", row.blurb, f.blurb],
      ["width", row.width, f.width],
      ["height", row.height, f.height],
      ["paper", row.paper, f.paper],
      ["printSize", row.printSize, f.printSize],
      ["slotCount", row.slotCount, f.slots.length],
    ];
    for (const [field, dbVal, srcVal] of scalarChecks) {
      if (dbVal !== srcVal) {
        console.error(`SELISIH frame ${f.id}.${field}: db=${JSON.stringify(dbVal)} src=${JSON.stringify(srcVal)}`);
        mismatches++;
      }
    }
    // slots/textLayers: deep-equal, bukan string mentah — Postgres jsonb
    // menyusun ulang urutan KEY objek (representasi, bukan isinya).
    if (!deepEqual(row.slots, f.slots)) {
      console.error(`SELISIH frame ${f.id}.slots: db=${JSON.stringify(row.slots)} src=${JSON.stringify(f.slots)}`);
      mismatches++;
    }
    if (!deepEqual(row.textLayers, f.textLayers)) {
      console.error(
        `SELISIH frame ${f.id}.textLayers: db=${JSON.stringify(row.textLayers)} src=${JSON.stringify(f.textLayers)}`
      );
      mismatches++;
    }
  }

  console.log(
    mismatches === 0
      ? `COCOK — 0 selisih (${oldAssets.length} aset, ${oldFrames.length} bingkai, ${templateCount} template)`
      : `${mismatches} SELISIH DITEMUKAN`
  );
  process.exit(mismatches === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("GAGAL:", e);
  process.exit(1);
});
