import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/adminAuth";
import { getTemplate, updateTemplate } from "@/lib/db/queries/templates";
import { db } from "@/lib/db/client";
import { assets } from "@/lib/db/schema";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "template-assets");

/** Sampul etalase template — bukan bingkai (tidak lewat validator
    V1-V8, boleh JPEG/WebP, tidak perlu alpha). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireStaff();
  if (guard instanceof NextResponse) return guard;

  if (process.env.VERCEL) {
    return NextResponse.json({ error: "Unggah aset cuma untuk dev lokal." }, { status: 400 });
  }

  const { id } = await params;
  const template = await getTemplate(id);
  if (!template) return NextResponse.json({ error: "Template tidak ditemukan." }, { status: 404 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Berkas gambar wajib diisi." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = file.type.includes("png") ? "png" : file.type.includes("webp") ? "webp" : "jpg";
  const assetId = randomUUID();
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, `${assetId}.${ext}`), bytes);

  const [asset] = await db
    .insert(assets)
    .values({
      id: assetId,
      accountId: null,
      kind: "cover",
      storageKey: `/uploads/template-assets/${assetId}.${ext}`,
      mime: file.type,
      bytes: bytes.byteLength,
      checksumSha256: createHash("sha256").update(bytes).digest("hex"),
      visibility: "public",
    })
    .returning();

  const updated = await updateTemplate(id, { coverAssetId: asset.id });
  return NextResponse.json({ template: updated, asset }, { status: 201 });
}
