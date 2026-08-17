import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/**
 * D-21 Langkah 3 — dok 05 §5.5: "PDF siap cetak (A4 dan A5 dengan
 * petunjuk singkat untuk tamu)". Ukuran halaman dalam POINT (1/72 inci,
 * satuan baku PDF) — A4 = 595×842, A5 = 420×595 (dibulatkan dari ukuran
 * ISO 216 resmi 595.28×841.89 / 419.53×595.28, selisihnya tidak
 * kelihatan di kertas cetak).
 *
 * URL booth ditulis polos di bawah QR (bukan cuma di dalam kode QR) —
 * kalau pemindaian gagal di lokasi (BRD menekankan ini sebagai risiko
 * nyata), tamu masih bisa ketik manual, bukan buntu total (K14-serupa).
 */
const PAGE_SIZES = {
  a4: { width: 595, height: 842 },
  a5: { width: 420, height: 595 },
} as const;

export interface EventFlyerInput {
  displayName: string;
  boothUrl: string;
  qrPngBuffer: Buffer;
}

export async function generateEventFlyerPdf(
  input: EventFlyerInput,
  size: "a4" | "a5"
): Promise<Buffer> {
  const { width, height } = PAGE_SIZES[size];
  const margin = size === "a4" ? 60 : 40;

  const doc = await PDFDocument.create();
  const page = doc.addPage([width, height]);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

  const qrImage = await doc.embedPng(input.qrPngBuffer);
  const qrSize = Math.min(width - margin * 2, height * 0.45);
  const qrX = (width - qrSize) / 2;

  // Judul di atas — nama acara yang DILIHAT tamu (displayNames, sudah
  // dijamin terisi karena gerbang publikasi poin 2 mensyaratkannya
  // sebelum acara bisa live).
  const titleSize = size === "a4" ? 22 : 16;
  const titleWidth = fontBold.widthOfTextAtSize(input.displayName, titleSize);
  const titleY = height - margin - titleSize;
  page.drawText(input.displayName, {
    x: (width - titleWidth) / 2,
    y: titleY,
    size: titleSize,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  const subtitle = "Pindai untuk mulai berfoto";
  const subtitleSize = size === "a4" ? 13 : 11;
  const subtitleWidth = fontRegular.widthOfTextAtSize(subtitle, subtitleSize);
  page.drawText(subtitle, {
    x: (width - subtitleWidth) / 2,
    y: titleY - subtitleSize - 12,
    size: subtitleSize,
    font: fontRegular,
    color: rgb(0.35, 0.35, 0.35),
  });

  // QR di tengah halaman.
  const qrY = (height - qrSize) / 2 - 20;
  page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });

  // Petunjuk singkat + URL polos (cadangan kalau pindai gagal) di bawah.
  const instruction = "Buka kamera HP, arahkan ke kode di atas, lalu ketuk tautan yang muncul.";
  const instructionSize = size === "a4" ? 12 : 10;
  const instructionWidth = fontRegular.widthOfTextAtSize(instruction, instructionSize);
  const instructionY = qrY - 30;
  page.drawText(instruction, {
    x: (width - instructionWidth) / 2,
    y: instructionY,
    size: instructionSize,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2),
  });

  const urlSize = size === "a4" ? 11 : 9;
  const urlWidth = fontRegular.widthOfTextAtSize(input.boothUrl, urlSize);
  page.drawText(input.boothUrl, {
    x: (width - urlWidth) / 2,
    y: instructionY - urlSize - 10,
    size: urlSize,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.5),
  });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
