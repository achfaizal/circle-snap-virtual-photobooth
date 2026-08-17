import { NextResponse } from "next/server";
import { requireAccountRole } from "@/lib/clientAuth";
import { getEventForAccount } from "@/lib/db/queries/events";
import { getAppBaseUrl } from "@/lib/services/appUrl";
import { generateQrPngBuffer } from "@/lib/services/qr";
import { generateEventFlyerPdf } from "@/lib/services/eventFlyerPdf";

/**
 * D-21 Langkah 4 — dok 05 §5.5 "Blok Link & QR: ... QR untuk diunduh
 * PNG dan PDF siap cetak (A4 dan A5)". Satu rute, `?format=` memilih
 * bentuknya — dibuat ON-DEMAND tiap dipanggil (lihat catatan rencana:
 * kontennya cuma satu URL pendek, generate ulang jauh lebih murah
 * daripada mengelola penyimpanan+invalidasi cache).
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAccountRole("operator");
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const event = await getEventForAccount(id, guard.accountId); // K5
  if (!event) return NextResponse.json({ error: "Acara tidak ditemukan." }, { status: 404 });

  // SAMA PERSIS definisi `alreadyLive` di EventPublishPanel.tsx — acara
  // `ended` tetap boleh (K15: galeri Momen tetap terbuka), cuma `draft`
  // yang ditolak (slug belum final secara publik, gerbang publikasi
  // belum tentu lolos).
  if (event.status === "draft") {
    return NextResponse.json({ error: "Acara ini belum diterbitkan." }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "png";

  const baseUrl = await getAppBaseUrl();
  const boothUrl = `${baseUrl}/e/${event.slug}`;
  const qrPngBuffer = await generateQrPngBuffer(boothUrl);

  if (format === "png") {
    return new NextResponse(new Uint8Array(qrPngBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${event.slug}-qr.png"`,
      },
    });
  }

  if (format === "pdf-a4" || format === "pdf-a5") {
    const size = format === "pdf-a4" ? "a4" : "a5";
    const pdf = await generateEventFlyerPdf(
      { displayName: event.displayNames ?? event.internalName, boothUrl, qrPngBuffer },
      size
    );
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${event.slug}-flyer-${size}.pdf"`,
      },
    });
  }

  return NextResponse.json({ error: "Format tidak dikenal." }, { status: 400 });
}
