import QRCode from "qrcode";

/**
 * D-21 Langkah 2 — dok 05 §5.5: "QR versi PDF siap cetak bukan tambahan
 * kecil... pemindaian gagal adalah kegagalan produk." Resolusi dibuat
 * besar (900px) — ini untuk DICETAK, bukan cuma dilihat di layar;
 * `errorCorrectionLevel: "M"` (bawaan pustaka) cukup toleran kalau
 * kertas sedikit kusut/kotor di lokasi acara.
 */
export async function generateQrPngBuffer(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    type: "png",
    width: 900,
    margin: 2,
    errorCorrectionLevel: "M",
  });
}
