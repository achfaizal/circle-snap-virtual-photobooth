import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireAccountRole } from "@/lib/clientAuth";
import { getEventForAccount } from "@/lib/db/queries/events";
import { listEventFrames, countCustomEventFrames, createCustomEventFrame } from "@/lib/db/queries/eventFrames";
import { validateFrame } from "@/lib/services/frameValidator";
import { detectSlots } from "@/lib/services/slots";
import { stripImageMetadata } from "@/lib/services/imageProcessing";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "event-frames");
const MAX_CUSTOM_FRAMES = 10; // dok 05 §5.4: "batas bawaan 10 bingkai kustom per acara"

/**
 * Unggah bingkai KLIEN (Langkah 8 Tahap 3, D-10/D-11) — jalur validasi
 * yang SAMA persis dengan /admin/system-frames (V1-V8 keras + W1-W5,
 * lib/services/frameValidator.ts) sekarang TERSAMBUNG ke klien juga,
 * bukan cuma staf. Beda dari app/api/admin/frames/route.ts LAMA (JSON)
 * yang cuma cek "slots.length > 0" — jalur itu dipensiunkan Langkah 11.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAccountRole("manager");
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const event = await getEventForAccount(id, guard.accountId);
  if (!event) return NextResponse.json({ error: "Acara tidak ditemukan." }, { status: 404 });

  const list = await listEventFrames(id);
  return NextResponse.json({ frames: list });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAccountRole("manager");
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const event = await getEventForAccount(id, guard.accountId);
  if (!event) return NextResponse.json({ error: "Acara tidak ditemukan." }, { status: 404 });

  if (process.env.VERCEL) {
    return NextResponse.json({ error: "Unggah bingkai cuma untuk dev lokal." }, { status: 400 });
  }

  const customCount = await countCustomEventFrames(id);
  if (customCount >= MAX_CUSTOM_FRAMES) {
    return NextResponse.json({ error: `Maksimal ${MAX_CUSTOM_FRAMES} bingkai kustom per acara.` }, { status: 400 });
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

  const original = Buffer.from(await file.arrayBuffer());
  // K7/D-17 — dibersihkan SEBELUM deteksi slot/validasi, supaya berkas
  // yang divalidasi PERSIS SAMA dengan yang disimpan (satu sumber
  // kebenaran, bukan dua buffer berbeda yang kebetulan mirip). Re-encode
  // PNG lossless (diuji Langkah 1: piksel+alpha identik), jadi hasil
  // deteksi slot tidak terpengaruh.
  let bytes: Buffer;
  try {
    bytes = (await stripImageMetadata(original)).buffer;
  } catch {
    return NextResponse.json({ error: "Berkas ini bukan PNG yang valid." }, { status: 400 });
  }

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
    return NextResponse.json({ error: "Bingkai gagal validasi otomatis.", failedChecks, report }, { status: 400 });
  }

  const assetId = randomUUID();
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, `${assetId}.png`), bytes);

  const { eventFrame, frame } = await createCustomEventFrame({
    eventId: id,
    accountId: guard.accountId,
    uploadedByUserId: guard.userId,
    name,
    storageKey: `/uploads/event-frames/${assetId}.png`,
    mime: file.type,
    bytes: bytes.byteLength,
    width: detected.width,
    height: detected.height,
    paper: detected.paper,
    slots: plainSlots,
    validationReport: report,
    checksumSha256: createHash("sha256").update(bytes).digest("hex"),
  });

  return NextResponse.json({ eventFrame, frame, report }, { status: 201 });
}
