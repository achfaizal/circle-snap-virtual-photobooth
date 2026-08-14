import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/adminAuth";
import { detectSlots } from "@/lib/services/slots";

/** Cuma DETEKSI, TIDAK menyimpan apa pun — admin masih bisa koreksi slot
    sebelum bingkai benar-benar dibuat (POST /api/admin/frames). Dipanggil
    berkali-kali dengan aman kalau admin ganti-ganti file sebelum submit. */
export async function POST(request: Request) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "Belum masuk." }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File wajib diisi." }, { status: 400 });
  }
  if (!file.type.includes("png")) {
    return NextResponse.json(
      { error: "Bingkai harus PNG transparan (bukan JPG/WebP)." },
      { status: 400 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await detectSlots(buffer);

    if (result.slots.length === 0) {
      // P4: gagal jelas, bukan diam-diam — tapi tetap kembalikan
      // width/height/paper supaya admin bisa lanjut ke mode manual
      // (tambah slot sendiri di editor) tanpa upload ulang.
      return NextResponse.json({
        ...result,
        warning:
          "Tidak ada area transparan terdeteksi. Pastikan PNG punya lubang foto benar-benar transparan (bukan putih opak), atau tambahkan slot manual di langkah berikutnya.",
      });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Gagal membaca PNG. Pastikan file tidak rusak dan benar-benar format PNG." },
      { status: 400 }
    );
  }
}
