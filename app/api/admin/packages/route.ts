import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/adminAuth";
import { createPackage, listPackages, validatePackageInput, type PackageInput } from "@/lib/db/queries/packages";

export async function GET() {
  const guard = await requireStaff();
  if (guard instanceof NextResponse) return guard;

  const items = await listPackages();
  return NextResponse.json({ packages: items });
}

export async function POST(request: Request) {
  const guard = await requireStaff();
  if (guard instanceof NextResponse) return guard;

  const body = (await request.json().catch(() => null)) as Partial<PackageInput> | null;
  if (!body?.code || !body?.name || !body?.audience || !body?.allocationMode) {
    return NextResponse.json({ error: "Kode, nama, audience, dan mode alokasi wajib diisi." }, { status: 400 });
  }
  if (!body.strips || body.strips < 1) {
    return NextResponse.json({ error: "strips wajib diisi, minimal 1." }, { status: 400 });
  }
  if (body.priceIdr == null || body.priceIdr < 0) {
    return NextResponse.json({ error: "price_idr wajib diisi, tidak boleh negatif." }, { status: 400 });
  }

  const input: PackageInput = {
    code: body.code.trim().toUpperCase(),
    name: body.name.trim(),
    tagline: body.tagline?.trim() || null,
    audience: body.audience,
    allocationMode: body.allocationMode,
    strips: body.strips,
    minStrips: body.minStrips ?? null,
    priceIdr: body.priceIdr,
    activeDays: body.activeDays ?? 7,
    maxEvents: body.audience === "personal" ? 1 : body.maxEvents ?? null,
    maxVoiceSeconds: body.maxVoiceSeconds ?? 15,
    allowCustomFrame: body.allowCustomFrame ?? true,
    allowGallery: body.allowGallery ?? true,
    allowVideoCard: body.allowVideoCard ?? true,
    maxOperators: body.maxOperators ?? null,
    templateScope: body.templateScope ?? "all",
    templateIds: body.templateIds ?? null,
    walletValidMonths: body.walletValidMonths ?? 12,
    isTopup: body.isTopup ?? false,
    sortOrder: body.sortOrder ?? 0,
  };
  // is_topup mengunci max_events & active_days (P-03) — dipaksa null/tetap
  // di sini, bukan diserahkan ke form untuk diisi bebas.
  if (input.isTopup) {
    input.maxEvents = null;
  }

  const validationError = validatePackageInput(input);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const created = await createPackage(input).catch((e) => {
    if (e instanceof Error && e.message.includes("packages_code_unique")) return null;
    throw e;
  });
  if (!created) {
    return NextResponse.json({ error: "Kode paket ini sudah dipakai." }, { status: 409 });
  }

  return NextResponse.json({ package: created }, { status: 201 });
}
