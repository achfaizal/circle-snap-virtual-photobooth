import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/adminAuth";
import { validateFrame } from "@/lib/services/frameValidator";
import { detectSlots } from "@/lib/services/slots";
import { createSystemAsset, createSystemFrame, listSystemFrames } from "@/lib/db/queries/systemFrames";

/**
 * Bingkai sistem — Langkah 4 rencana Tahap 2. Unggah PNG → deteksi slot
 * otomatis (lib/services/slots.ts) → validasi V1-V8 (lib/services/
 * frameValidator.ts) → tolak kalau gagal, simpan (assets+frames
 * Postgres) kalau lolos.
 *
 * ⚠️ Simplifikasi disengaja (dicatat di rencana Tahap 2 Langkah 4):
 * TIDAK ada langkah "koreksi slot manual" seperti CreateFrameWizard
 * lama — slot yang divalidasi & disimpan adalah hasil deteksi otomatis
 * apa adanya. Koreksi manual bisa ditambah belakangan, bukan dijanjikan
 * di langkah ini.
 *
 * ⚠️ Sama seperti app/api/admin/assets/route.ts lama: cuma jalan di
 * `next dev` lokal (filesystem Vercel sementara). Aman untuk sekarang
 * karena portal admin masih 100% dev — object storage sungguhan itu
 * pekerjaan lain, bukan Tahap 2.
 */
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "system-frames");

export async function GET() {
  const guard = await requireStaff();
  if (guard instanceof NextResponse) return guard;

  const list = await listSystemFrames();
  return NextResponse.json({ frames: list });
}

export async function POST(request: Request) {
  const guard = await requireStaff();
  if (guard instanceof NextResponse) return guard;

  if (process.env.VERCEL) {
    return NextResponse.json(
      { error: "Unggah bingkai sistem cuma untuk dev lokal sampai object storage sungguhan ada." },
      { status: 400 }
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  const name = String(form.get("name") ?? "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Berkas PNG wajib diisi." }, { status: 400 });
  }
  if (!file.type.includes("png")) {
    return NextResponse.json({ error: "Bingkai wajib berkas PNG (RGBA)." }, { status: 400 });
  }
  if (name.length < 2 || name.length > 80) {
    return NextResponse.json({ error: "Nama bingkai wajib diisi, 2–80 karakter." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  // Deteksi otomatis dulu (utk paper + slot awal), lalu jalankan
  // validator V1-V8 terhadap slot hasil deteksi itu.
  let detected;
  try {
    detected = await detectSlots(bytes);
  } catch {
    return NextResponse.json({ error: "Berkas ini bukan PNG yang valid." }, { status: 400 });
  }

  const plainSlots = detected.slots.map((s) => ({ x: s.x, y: s.y, w: s.w, h: s.h }));
  const report = await validateFrame(bytes, plainSlots, []);

  if (!report.passed) {
    const failedChecks = Object.entries(report.checks)
      .filter(([, c]) => !c.passed)
      .map(([key, c]) => `${key}: ${c.message}`);
    return NextResponse.json(
      { error: "Bingkai gagal validasi otomatis.", failedChecks, report },
      { status: 400 }
    );
  }

  const id = randomUUID();
  const ext = "png";
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, `${id}.${ext}`), bytes);
  const storageKey = `/uploads/system-frames/${id}.${ext}`;
  const checksumSha256 = createHash("sha256").update(bytes).digest("hex");

  const asset = await createSystemAsset({
    storageKey,
    mime: file.type,
    bytes: bytes.byteLength,
    width: detected.width,
    height: detected.height,
    checksumSha256,
  });

  const frame = await createSystemFrame({
    name,
    assetId: asset.id,
    width: detected.width,
    height: detected.height,
    paper: detected.paper,
    slots: plainSlots,
    textLayers: [],
    validationReport: report,
  });

  return NextResponse.json({ frame, asset, report }, { status: 201 });
}
