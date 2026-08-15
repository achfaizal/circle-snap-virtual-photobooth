import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireAccountRole } from "@/lib/clientAuth";
import { getOrder } from "@/lib/db/queries/purchaseOrders";
import { db } from "@/lib/db/client";
import { assets, orders } from "@/lib/db/schema";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "payment-proofs");

/**
 * Unggah bukti transfer (Langkah 5 Tahap 3, dok 02 §4 / dok 04 §7).
 * Verifikasi TETAP di /admin/orders (Tahap 2, tidak diubah) —
 * sini cuma menaruh proofAssetId, tidak mengubah status order.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAccountRole("manager");
  if (guard instanceof NextResponse) return guard;

  if (process.env.VERCEL) {
    return NextResponse.json({ error: "Unggah bukti transfer cuma untuk dev lokal." }, { status: 400 });
  }

  const { id } = await params;
  const order = await getOrder(id);
  // K5 — cocokkan account_id, bukan cuma "order ada" (kepemilikan objek,
  // bukan cuma peran).
  if (!order || order.accountId !== guard.accountId) {
    return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
  }
  if (order.status !== "awaiting_payment") {
    return NextResponse.json({ error: "Pesanan ini tidak lagi menunggu pembayaran." }, { status: 400 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Unggah gambar bukti transfer (screenshot/foto struk)." }, { status: 400 });
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
      accountId: guard.accountId,
      kind: "payment_proof",
      storageKey: `/uploads/payment-proofs/${assetId}.${ext}`,
      mime: file.type,
      bytes: bytes.byteLength,
      checksumSha256: createHash("sha256").update(bytes).digest("hex"),
      visibility: "private",
      uploadedByUserId: guard.userId,
    })
    .returning();

  const [updated] = await db.update(orders).set({ proofAssetId: asset.id }).where(eq(orders.id, order.id)).returning();
  return NextResponse.json({ ok: true, order: updated }, { status: 201 });
}
