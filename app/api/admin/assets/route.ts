import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/adminAuth";
import { getRepo } from "@/lib/repo";

/** ⚠️ Route ini menjaga dirinya sendiri — layout admin cuma melindungi
    halaman, bukan route handler. Lihat catatan di lib/adminAuth.ts.

    Sama seperti app/api/moments/upload-local/route.ts: cuma jalan di
    `next dev` lokal. Filesystem Vercel sementara & read-only, jadi upload
    "berhasil" di sana lenyap begitu request selesai — lebih baik gagal
    jelas sekarang daripada admin kehilangan aset diam-diam nanti. Upload
    aset baru bisa dipakai produksi setelah Fase 7 (database + storage
    beneran, docs/blueprint/05-peta-jalan.md). */
const ALLOWED_KINDS = new Set(["decor-corner", "video-bg", "frame-overlay"]);
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "assets");

export async function POST(request: Request) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "Belum masuk." }, { status: 401 });
  }
  if (process.env.VERCEL) {
    return NextResponse.json(
      { error: "Upload aset cuma untuk local dev, bukan Vercel (lihat Fase 7 di roadmap)." },
      { status: 400 }
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  const kind = String(form.get("kind") ?? "");
  const width = Number(form.get("width") ?? 0);
  const height = Number(form.get("height") ?? 0);

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File wajib diisi." }, { status: 400 });
  }
  if (!ALLOWED_KINDS.has(kind)) {
    return NextResponse.json({ error: "Jenis aset tidak valid." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File harus berupa gambar." }, { status: 400 });
  }
  // Overlay bingkai wajib PNG — deteksi slot (lib/services/slots.ts)
  // baca kanal alpha lewat pngjs, tidak mengerti format lain.
  if (kind === "frame-overlay" && !file.type.includes("png")) {
    return NextResponse.json({ error: "Overlay bingkai harus PNG transparan." }, { status: 400 });
  }
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return NextResponse.json({ error: "Dimensi gambar tidak valid." }, { status: 400 });
  }

  const repo = getRepo();
  const ext = file.type.includes("png") ? "png" : file.type.includes("webp") ? "webp" : "jpg";
  const bytes = Buffer.from(await file.arrayBuffer());

  // ID dulu (bukan nama file asli) — nama asli tamu/admin bisa berisi
  // spasi/karakter aneh, dan dua upload dengan nama sama tidak boleh
  // saling menimpa.
  const tempAsset = await repo.assets.create({
    clientId: null,
    kind: kind as "decor-corner" | "video-bg" | "frame-overlay",
    filename: file.name || `upload.${ext}`,
    url: "",
    contentType: file.type,
    bytes: bytes.byteLength,
    width,
    height,
  });

  await mkdir(UPLOAD_DIR, { recursive: true });
  const diskName = `${tempAsset.id}.${ext}`;
  await writeFile(path.join(UPLOAD_DIR, diskName), bytes);

  // URL final baru diketahui setelah id ada (nama file = id) — tulis
  // ulang record dengan url yang benar. Sedikit boros (dua tulis JSON),
  // tapi menjaga id tetap sumber-kebenaran nama file, bukan sebaliknya.
  const url = `/uploads/assets/${diskName}`;
  const updated = await repo.assets.update(tempAsset.id, { url });

  return NextResponse.json({ asset: updated ?? { ...tempAsset, url } }, { status: 201 });
}
