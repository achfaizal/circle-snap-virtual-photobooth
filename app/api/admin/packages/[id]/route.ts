import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/adminAuth";
import {
  getPackageById,
  packageEverSold,
  updatePackage,
  validatePackageInput,
  type PackageInput,
} from "@/lib/db/queries/packages";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireStaff();
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const pkg = await getPackageById(id);
  if (!pkg) return NextResponse.json({ error: "Paket tidak ditemukan." }, { status: 404 });

  const everSold = await packageEverSold(id);
  return NextResponse.json({ package: pkg, everSold });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireStaff();
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const existing = await getPackageById(id);
  if (!existing) return NextResponse.json({ error: "Paket tidak ditemukan." }, { status: 404 });

  const patch = (await request.json().catch(() => null)) as Partial<PackageInput & { status: string }> | null;
  if (!patch) return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });

  // `code` terkunci (P-02: jalur harga baru = arsipkan lama + terbitkan
  // baru, bukan mengetik ulang kode paket yang sudah beredar).
  const { code: _ignoredCode, ...safePatch } = patch;
  void _ignoredCode;

  // Validasi P-04/P-03 memakai gabungan nilai lama+baru — patch parsial
  // tidak boleh menembus lewat kolom yang tidak ikut dikirim.
  const merged: PackageInput = {
    code: existing.code,
    name: safePatch.name ?? existing.name,
    tagline: safePatch.tagline ?? existing.tagline,
    audience: (safePatch.audience ?? existing.audience) as PackageInput["audience"],
    allocationMode: (safePatch.allocationMode ?? existing.allocationMode) as PackageInput["allocationMode"],
    strips: safePatch.strips ?? existing.strips,
    minStrips: safePatch.minStrips ?? existing.minStrips,
    priceIdr: safePatch.priceIdr ?? existing.priceIdr,
    activeDays: safePatch.activeDays ?? existing.activeDays,
    maxEvents: safePatch.maxEvents ?? existing.maxEvents,
    maxVoiceSeconds: safePatch.maxVoiceSeconds ?? existing.maxVoiceSeconds,
    allowCustomFrame: safePatch.allowCustomFrame ?? existing.allowCustomFrame,
    allowGallery: safePatch.allowGallery ?? existing.allowGallery,
    allowVideoCard: safePatch.allowVideoCard ?? existing.allowVideoCard,
    maxOperators: safePatch.maxOperators ?? existing.maxOperators,
    templateScope: (safePatch.templateScope ?? existing.templateScope) as PackageInput["templateScope"],
    templateIds: safePatch.templateIds ?? existing.templateIds,
    walletValidMonths: safePatch.walletValidMonths ?? existing.walletValidMonths,
    isTopup: safePatch.isTopup ?? existing.isTopup,
    sortOrder: safePatch.sortOrder ?? existing.sortOrder,
  };
  if (merged.audience === "personal") merged.maxEvents = 1;
  if (merged.isTopup) merged.maxEvents = null;

  const validationError = validatePackageInput(merged);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const status = patch.status as "draft" | "published" | "archived" | undefined;
  const updated = await updatePackage(id, status ? { ...merged, status } : merged);
  return NextResponse.json({ package: updated });
}
