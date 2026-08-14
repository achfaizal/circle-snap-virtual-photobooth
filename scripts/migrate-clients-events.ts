/**
 * Langkah 7 rencana Tahap 1 — pindahkan data/clients.json + data/events.json
 * ke users/accounts/account_members (Langkah 2) dan events/event_frames/
 * event_variable_values (Langkah 6). Bukan sekali pakai (dipanggil ulang
 * di Langkah 13), sama pola dengan scripts/migrate-templates-frames.ts.
 *
 * Jalan:
 *   npx tsx --env-file=.env.local scripts/migrate-clients-events.ts --source=seed --dry-run
 *   npx tsx --env-file=.env.local scripts/migrate-clients-events.ts --source=seed
 *   npx tsx --env-file=.env.local scripts/migrate-clients-events.ts --source=live
 *
 * ⚠️ SYARAT: scripts/migrate-templates-frames.ts (Langkah 5) sudah jalan
 * lebih dulu untuk sumber yang sama — bingkai dicari lewat NAMA (lihat
 * FRAME_NAME_MATCH di bawah), bukan id lama, karena id lama tidak
 * disimpan di tabel `frames` baru sama sekali.
 *
 * ⚠️ TEMUAN & keputusan yang tidak dipindah diam-diam:
 *
 * 1. **brandLabel per-acara** — ditanyakan ke pemilik produk (14 Agu
 *    2026): disimpan lewat event_variable_values (variable_key='brandLabel'),
 *    BUKAN kolom baru di `events`, mengikuti mekanisme BRD dok 03 §5.4
 *    apa adanya, bukan deviasi seperti frames.blurb.
 *
 * 2. **Tema per-acara** (identity theme: colors/fontDisplayId/effects/
 *    videoCard/decorAssetId) SENGAJA TIDAK dipindah — ini bukan gap,
 *    ini AB-15/K11 yang MEMANG mencabut kemampuan itu, dan dok 09 §3
 *    eksplisit menulis "Klien mengubah isi, bukan desain — tidak boleh
 *    diubah tanpa alasan kuat". Acara hasil migrasi TIDAK punya tema
 *    sendiri lagi — nanti dapat tema dari template yang dipasang
 *    (Tahap 2/3), bukan dari sini.
 *
 * 3. **`active_days`** wajib diisi (NOT NULL) tapi tidak ada nilainya di
 *    Event lama sama sekali (itu properti Subscription/Plan). Dipakai 7
 *    — BUKAN angka karangan, itu konstanta yang SUNGGUH dipakai sistem
 *    lama untuk semua acara (lihat docs/AUDIT-AWAL.md temuan 7.6,
 *    computeExpiresAt hardcode 7 hari).
 *
 * 4. **`gallery_public`** selalu `false` pada hasil migrasi, BUKAN
 *    dibaca dari mana pun di data lama — sistem lama tidak punya
 *    pembeda publik/privat sama sekali (docs/AUDIT-AWAL.md temuan 7.2:
 *    `GET /api/moments` dulu tanpa otorisasi apa pun). Ini efek samping
 *    migrasi yang MEMPERBAIKI itu (K6), bukan bug.
 *
 * 5. **event_frames.source** dipetakan 'template' untuk semua baris —
 *    bingkai lama semuanya dari pustaka bersama (bukan unggahan klien),
 *    'custom' secara BRD berarti unggahan klien, jadi 'template' lebih
 *    dekat meski acara ini belum benar-benar terpasang ke template mana
 *    pun (`template_id` tetap null).
 *
 * 6. **Klien staff (isStaff=true) tidak boleh "punya" acara** (aturan
 *    yang sudah ditegakkan sejak sesi sebelumnya) — tapi data DEMO lama
 *    (`cli_demo`) justru begitu. Untuk `--source=seed` (data uji, BUKAN
 *    produksi), skrip ini membuat SATU akun personal sintetis khusus
 *    menampung acara demo staf, jelas diberi label di `slug`/`display_name`
 *    supaya tidak tertukar data sungguhan. Untuk `--source=live`, skrip
 *    GAGAL KERAS kalau menemukan pola ini — itu tandanya ada data
 *    produksi yang harus diputuskan manusia, bukan skrip.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { db } from "../lib/db/client";
import { accounts, accountMembers, users } from "../lib/db/schema/identity";
import { eventCategories } from "../lib/db/schema/catalog";
import { frames } from "../lib/db/schema/templates";
import { events, eventFrames, eventVariableValues } from "../lib/db/schema/events";
import { EVENT_KINDS } from "../lib/services/eventKind";

const PROJECT_ROOT = join(__dirname, "..");
const DEMO_STAFF_EVENTS_ACCOUNT_SLUG = "demo-acara-staf-lama";

interface OldClient {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  isStaff?: boolean;
  whatsapp?: string;
  businessName?: string;
  type?: "personal" | "vendor";
  passwordHash?: string;
}
interface OldEvent {
  id: string;
  clientId: string;
  slug: string;
  status: "draft" | "live" | "ended";
  startAt?: string;
  templateId?: string;
  identity: {
    internalName: string;
    kind?: string;
    brandLabel: string;
    names: string;
    date: string;
    dateDisplay: string;
    venue: string;
    hashtag: string;
    greeting: string;
  };
  frameIds: string[];
  session: Record<string, unknown> & { guestNameRequired?: boolean; moments?: { enabled?: boolean } };
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const source = args.includes("--source=live") ? "live" : "seed";
  const dryRun = args.includes("--dry-run");
  return { source, dryRun } as const;
}
function loadJson<T>(relPath: string): T {
  return JSON.parse(readFileSync(join(PROJECT_ROOT, relPath), "utf-8")) as T;
}

async function main() {
  const { source, dryRun } = parseArgs();
  const clientsPath = source === "seed" ? "data/seed/clients.seed.json" : "data/clients.json";
  const eventsPath = source === "seed" ? "data/seed/events.seed.json" : "data/events.json";

  const oldClients = loadJson<OldClient[]>(clientsPath);
  const oldEvents = loadJson<OldEvent[]>(eventsPath);

  console.log(`Sumber: ${source}`);
  console.log(`  ${clientsPath}: ${oldClients.length} klien`);
  console.log(`  ${eventsPath}: ${oldEvents.length} acara`);

  const staffClientIds = new Set(oldClients.filter((c) => c.isStaff).map((c) => c.id));
  const eventsOwnedByStaff = oldEvents.filter((e) => staffClientIds.has(e.clientId));
  if (eventsOwnedByStaff.length > 0 && source === "live") {
    throw new Error(
      `${eventsOwnedByStaff.length} acara PRODUKSI dimiliki akun staf (${[...staffClientIds].join(", ")}) — ` +
        `staf tidak boleh punya acara (aturan sejak sesi sebelumnya). Ini butuh keputusan manusia ` +
        `(pindahkan kepemilikan ke akun klien yang benar?), bukan ditebak skrip.`
    );
  }

  if (dryRun) {
    console.log("\n--dry-run: tidak menulis apa pun ke DB.");
    process.exit(0);
  }

  // --- 1. clients -> users (+ accounts + account_members untuk non-staf) ---
  const userIdMap = new Map<string, string>(); // clientId lama -> users.id baru
  const accountIdMap = new Map<string, string>(); // clientId lama -> accounts.id baru (kosong utk staf)
  for (const c of oldClients) {
    // passwordHash/whatsapp: klien lama (terutama fixture seed) sering
    // tidak punya keduanya sama sekali — placeholder JELAS di sini
    // (bukan string yang menyamar sebagai hash/nomor asli), supaya siapa
    // pun yang lihat baris ini di DB langsung tahu itu perlu diisi ulang
    // lewat admin, bukan kredensial sungguhan yang bisa dipakai login.
    const [userRow] = await db
      .insert(users)
      .values({
        email: c.email,
        passwordHash: c.passwordHash ?? "MIGRASI_PLACEHOLDER_BELUM_ADA_HASH",
        fullName: c.name,
        phoneWa: c.whatsapp ?? "+62000000MIGRASI",
        platformRole: c.isStaff ? "admin" : null,
        createdAt: new Date(c.createdAt),
      })
      .returning({ id: users.id });
    userIdMap.set(c.id, userRow.id);

    if (c.isStaff) continue; // staf tidak punya account/account_member

    const accountType = c.type ?? "vendor"; // Client lama tanpa `type` = vendor (lib/models/client.ts)
    const [accountRow] = await db
      .insert(accounts)
      .values({
        type: accountType,
        displayName: c.businessName ?? c.name,
        slug: slugify(c.businessName ?? c.name ?? c.id),
        businessName: accountType === "vendor" ? c.businessName ?? c.name : null,
        createdAt: new Date(c.createdAt),
      })
      .returning({ id: accounts.id });
    accountIdMap.set(c.id, accountRow.id);

    await db.insert(accountMembers).values({
      accountId: accountRow.id,
      userId: userRow.id,
      role: "owner",
      status: "active",
    });
  }
  console.log(`\nusers: ${userIdMap.size} baris dimasukkan`);
  console.log(`accounts: ${accountIdMap.size} baris dimasukkan (staf tidak dapat account)`);

  // Akun sintetis untuk menampung acara demo yang lama dimiliki staf —
  // HANYA dibuat kalau memang ada acara begitu (lihat catatan #6 di atas).
  let demoOwnerAccountId: string | null = null;
  let demoOwnerUserId: string | null = null;
  if (eventsOwnedByStaff.length > 0) {
    const staffOwnerId = [...staffClientIds][0]!;
    demoOwnerUserId = userIdMap.get(staffOwnerId)!;
    const [row] = await db
      .insert(accounts)
      .values({
        type: "personal",
        displayName: "[DEMO] Pemilik Acara Contoh",
        slug: DEMO_STAFF_EVENTS_ACCOUNT_SLUG,
      })
      .returning({ id: accounts.id });
    demoOwnerAccountId = row.id;
    await db.insert(accountMembers).values({
      accountId: row.id,
      userId: demoOwnerUserId,
      role: "owner",
      status: "active",
    });
    console.log(`akun sintetis dibuat untuk ${eventsOwnedByStaff.length} acara demo bekas milik staf (slug: ${DEMO_STAFF_EVENTS_ACCOUNT_SLUG})`);
  }

  // --- peta bantu: kategori (code -> id), frame (name -> id) ---
  const dbCategories = await db.select().from(eventCategories);
  const categoryIdByCode = new Map(dbCategories.map((c) => [c.code, c.id]));
  const otherCategoryId = categoryIdByCode.get("other");
  if (!otherCategoryId) throw new Error("event_categories 'other' tidak ada — jalankan Langkah 3 dulu.");

  const dbFrames = await db.select().from(frames);
  const frameIdByName = new Map<string, string>();
  for (const f of dbFrames) {
    if (frameIdByName.has(f.name)) {
      throw new Error(`Nama bingkai "${f.name}" dobel di DB — pencocokan lewat nama tidak aman lagi.`);
    }
    frameIdByName.set(f.name, f.id);
  }

  // --- 2. events + event_frames + event_variable_values ---
  let eventCount = 0;
  let eventFrameCount = 0;
  let variableCount = 0;
  for (const e of oldEvents) {
    const isStaffOwned = staffClientIds.has(e.clientId);
    const accountId = isStaffOwned ? demoOwnerAccountId! : accountIdMap.get(e.clientId)!;
    const createdByUserId = isStaffOwned ? demoOwnerUserId! : userIdMap.get(e.clientId)!;
    if (!accountId || !createdByUserId) {
      throw new Error(`Acara ${e.id} merujuk clientId ${e.clientId} yang tidak ketemu di ${clientsPath}.`);
    }

    const categoryId = e.identity.kind
      ? categoryIdByCode.get(e.identity.kind) ?? otherCategoryId
      : otherCategoryId; // kind kosong -> 'other', bukan ditebak dari teks nama

    const startsAt = e.startAt ? new Date(e.startAt) : null;
    const activeDays = 7; // lihat catatan #3 di atas
    const expiresAt = startsAt ? new Date(startsAt.getTime() + activeDays * 86_400_000) : null;

    const [row] = await db
      .insert(events)
      .values({
        accountId,
        createdByUserId,
        categoryId,
        internalName: e.identity.internalName,
        slug: e.slug,
        displayNames: e.identity.names || null,
        dateDisplay: e.identity.dateDisplay || null,
        venue: e.identity.venue || null,
        hashtag: e.identity.hashtag || null,
        greeting: e.identity.greeting || null,
        startsAt,
        activeDays,
        expiresAt,
        status: e.status, // draft|live|ended - subset valid dari enum baru
        publishedAt: e.publishedAt ? new Date(e.publishedAt) : null,
        // session_config dipindah APA ADANYA (termasuk filterCss,
        // moments{}, guestNameRequired lama) — belum dirapikan ke bentuk
        // contoh dok 03 §5.3, itu pekerjaan Visual Builder Tahap 3.
        sessionConfig: e.session,
        galleryEnabled: e.session.moments?.enabled ?? true,
        galleryPublic: false, // lihat catatan #4 di atas — K6, bukan dibaca dari data lama
        guestNameRequired: e.session.guestNameRequired ?? true,
        cachedQuota: 0, // diperbarui Langkah 12 setelah quota_ledger ada
        cachedConsumed: 0,
        createdAt: new Date(e.createdAt),
        updatedAt: new Date(e.updatedAt),
      })
      .returning({ id: events.id });
    eventCount++;

    await db.insert(eventVariableValues).values({
      eventId: row.id,
      accountId,
      variableKey: "brandLabel",
      valueText: e.identity.brandLabel,
    });
    variableCount++;

    for (const [index, oldFrameId] of e.frameIds.entries()) {
      // frameIds lama itu id STRING (mis. "frm_sal_s1") — dicocokkan
      // lewat NAMA bingkai di frameNameByOldId, bukan lewat id lama
      // langsung (lihat catatan berkas soal ketergantungan ke Langkah 5).
      const frameName = FRAME_NAME_BY_OLD_ID[oldFrameId];
      const frameId = frameName ? frameIdByName.get(frameName) : undefined;
      if (!frameId) {
        throw new Error(
          `Acara ${e.id} merujuk frameId lama "${oldFrameId}" yang tidak ketemu padanannya di DB. ` +
            `Pastikan Langkah 5 sudah dijalankan untuk sumber "${source}" ini.`
        );
      }
      await db.insert(eventFrames).values({
        eventId: row.id,
        accountId,
        frameId,
        source: "template", // lihat catatan #5 di atas
        isEnabled: true,
        sortOrder: index,
      });
      eventFrameCount++;
    }
  }
  console.log(`events: ${eventCount} baris dimasukkan`);
  console.log(`event_frames: ${eventFrameCount} baris dimasukkan`);
  console.log(`event_variable_values: ${variableCount} baris dimasukkan`);
  console.log("\nSelesai. Jalankan verifikasi terpisah (lihat rencana Langkah 7) sebelum lanjut.");
}

/** id lama -> nama bingkai, dipetakan manual dari data/seed/frames.seed.json
    (lihat Langkah 5) — bukan dibaca ulang dari berkas itu supaya skrip ini
    tidak diam-diam salah kalau frames.seed.json berubah tanpa berkas ini
    ikut diperbarui. Kalau id lama baru muncul, tambah barisnya di sini. */
const FRAME_NAME_BY_OLD_ID: Record<string, string> = {
  frm_sal_s1: "Dua Foto Elegan",
  frm_sal_s2: "Tiga Foto Elegan",
  frm_sal_s3: "Lengkung Floral",
  frm_sal_s4: "Tiga Foto Peony",
  frm_sal_s5: "Dua Foto Anemone",
  frm_sal_s6: "Dua Foto Mawar",
  frm_sal_s7: "Tiga Foto Pita",
  frm_eng_1: "Satu Foto Botanical",
  frm_eng_2: "Tiga Foto Botanical",
  frm_eng_3: "Dua Foto Botanical",
};

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `akun-${Math.random().toString(36).slice(2, 8)}`
  );
}

main().catch((e) => {
  console.error("GAGAL:", e);
  process.exit(1);
});
