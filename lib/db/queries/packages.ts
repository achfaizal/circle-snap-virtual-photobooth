/**
 * Paket — Langkah 2 rencana Tahap 2. Tabel `packages` (dok 02 §2.1).
 * `lib/services/planCatalog.ts` (JSON, dipakai wizard event & billing
 * klien) TIDAK disentuh — berdampingan sampai Tahap 3.
 */
import { asc, eq } from "drizzle-orm";
import { db } from "../client";
import { orders, packages } from "../schema";

export type PackageInput = {
  code: string;
  name: string;
  tagline?: string | null;
  audience: "personal" | "vendor" | "both";
  allocationMode: "single_event" | "flexible";
  strips: number;
  minStrips?: number | null;
  priceIdr: number;
  activeDays: number;
  maxEvents?: number | null;
  maxVoiceSeconds: number;
  allowCustomFrame: boolean;
  allowGallery: boolean;
  allowVideoCard: boolean;
  maxOperators?: number | null;
  templateScope: "all" | "selected";
  templateIds?: string[] | null;
  walletValidMonths: number;
  isTopup: boolean;
  sortOrder: number;
};

/** P-04: audience=personal WAJIB allocation_mode=single_event DAN
    max_events=1. DB sudah punya CHECK ini sejak Tahap 1 (bukti terakhir
    penjagaan) — divalidasi juga DI SINI supaya pesan errornya bisa
    dibaca staf, bukan cuma "constraint violation" dari Postgres. */
export function validatePackageInput(input: PackageInput): string | null {
  if (input.audience === "personal") {
    if (input.allocationMode !== "single_event") {
      return "Paket audience personal wajib allocation_mode single_event (P-04).";
    }
    if (input.maxEvents !== 1) {
      return "Paket audience personal wajib max_events = 1 (P-04).";
    }
  }
  if (input.templateScope === "selected" && (!input.templateIds || input.templateIds.length === 0)) {
    return "Pilih minimal 1 template kalau cakupan template = 'selected'.";
  }
  if (input.minStrips != null && input.minStrips > input.strips) {
    return "min_strips tidak boleh melebihi strips.";
  }
  return null;
}

export async function listPackages() {
  return db.select().from(packages).orderBy(asc(packages.sortOrder));
}

export async function getPackageById(id: string) {
  const [row] = await db.select().from(packages).where(eq(packages.id, id));
  return row ?? null;
}

export async function createPackage(input: PackageInput) {
  const [row] = await db.insert(packages).values(input).returning();
  return row;
}

export async function updatePackage(id: string, patch: Partial<PackageInput & { status: "draft" | "published" | "archived" }>) {
  const [row] = await db.update(packages).set(patch).where(eq(packages.id, id)).returning();
  return row ?? null;
}

/** P-02: paket yang sudah pernah terjual cuma boleh diubah Super Admin.
    Belum ada peran super_admin sungguhan di sesi JSON (lihat rencana
    Tahap 2, catatan keputusan) — jadi di sini CUMA memberi tahu (dipakai
    UI untuk tampilkan peringatan), bukan memblokir. Dicatat sebagai gap
    yang disengaja, bukan lupa. */
export async function packageEverSold(id: string): Promise<boolean> {
  const [row] = await db.select({ id: orders.id }).from(orders).where(eq(orders.packageId, id)).limit(1);
  return !!row;
}
