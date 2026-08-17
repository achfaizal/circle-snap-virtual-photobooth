import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Klien Midtrans Snap — dok 02 §4.3 "Rilis 2", ditarik maju (dok 09 §7
 * v1.3). `fetch()` LANGSUNG ke REST API (bukan SDK `midtrans-client`) —
 * diputuskan lewat tanya-jawab: tanpa dependency baru, API-nya cukup
 * sederhana untuk itu.
 *
 * Base URL sandbox/produksi mengikuti `MIDTRANS_IS_PRODUCTION` (bukan
 * `NODE_ENV`) — kredensial sandbox punya base URL beda dari produksi,
 * dan keduanya bisa dipakai di lingkungan Node apa pun (dev ATAU
 * produksi bisa saja masih diarahkan ke sandbox saat uji akhir).
 */
function isProduction(): boolean {
  return process.env.MIDTRANS_IS_PRODUCTION === "true";
}

function snapBaseUrl(): string {
  return isProduction() ? "https://app.midtrans.com" : "https://app.sandbox.midtrans.com";
}

function serverKey(): string {
  const key = process.env.MIDTRANS_SERVER_KEY;
  if (!key) throw new Error("MIDTRANS_SERVER_KEY belum diisi di .env.local.");
  return key;
}

export interface CreateSnapTransactionInput {
  orderNumber: string; // dipakai APA ADANYA sebagai order_id Midtrans — orders.number sudah unik global
  grossAmountIdr: number;
  expiresAt: Date; // orders.expiresAt — Snap transaction diberi umur SAMA, bukan hardcode
  customerName?: string;
  customerEmail?: string;
}

export interface CreateSnapTransactionResult {
  token: string;
  redirectUrl: string;
}

/** `POST {base}/snap/v1/transactions` — Basic Auth (server key sebagai
    username, password kosong) adalah pola resmi Midtrans, bukan bearer
    token. */
export async function createSnapTransaction(
  input: CreateSnapTransactionInput
): Promise<CreateSnapTransactionResult> {
  const auth = Buffer.from(`${serverKey()}:`).toString("base64");

  // Umur transaksi Snap disamakan dengan sisa umur order (dok 02 §4.2
  // expires_at, bawaan +48 jam saat order dibuat) — supaya tamu tidak
  // bisa membayar transaksi Snap yang order-nya di sisi kita sudah lewat
  // batas waktu. Minimal 1 menit — kalau order SUDAH lewat expiresAt
  // saat ini dipanggil, itu bug pemanggil (harusnya sudah ditolak
  // sebelum sampai sini), bukan alasan mengirim durasi negatif ke Midtrans.
  const durationMinutes = Math.max(1, Math.round((input.expiresAt.getTime() - Date.now()) / 60000));

  const res = await fetch(`${snapBaseUrl()}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: input.orderNumber,
        gross_amount: input.grossAmountIdr,
      },
      customer_details: {
        first_name: input.customerName || undefined,
        email: input.customerEmail || undefined,
      },
      expiry: {
        unit: "minute",
        duration: durationMinutes,
      },
    }),
  });

  const data = (await res.json().catch(() => null)) as
    | { token?: string; redirect_url?: string; error_messages?: string[] }
    | null;

  if (!res.ok || !data?.token) {
    const detail = data?.error_messages?.join("; ") ?? `HTTP ${res.status}`;
    throw new Error(`Gagal membuat transaksi Midtrans: ${detail}`);
  }

  return { token: data.token, redirectUrl: data.redirect_url ?? "" };
}

export interface MidtransNotificationPayload {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  transaction_id: string;
  fraud_status?: string;
}

/** dok 08 §1.5 "Webhook: verifikasi tanda tangan" — formula resmi
    Midtrans: SHA512(order_id + status_code + gross_amount + server_key).
    `timingSafeEqual` (bukan `===`) — ini perbandingan kriptografis,
    sama alasan kenapa password hash di proyek ini juga tidak pernah
    dibandingkan pakai `===` (lihat lib/adminAuth.ts). Panjang string
    beda dianggap TIDAK cocok tanpa membocorkan itu lewat timing. */
export function verifyNotificationSignature(payload: MidtransNotificationPayload): boolean {
  const expected = createHash("sha512")
    .update(payload.order_id + payload.status_code + payload.gross_amount + serverKey())
    .digest("hex");

  const a = Buffer.from(expected, "utf-8");
  const b = Buffer.from(payload.signature_key ?? "", "utf-8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export type MidtransAction = "fulfill" | "pending_noop" | "reject" | "expire" | "refund" | "hold_review";

/** Fungsi murni — dites langsung tanpa jaringan di
    scripts/test-midtrans-integration.ts. Kombinasi status resmi
    Midtrans (https://docs.midtrans.com, transaction_status +
    fraud_status khusus kartu kredit). */
export function mapMidtransStatus(transactionStatus: string, fraudStatus?: string): MidtransAction {
  switch (transactionStatus) {
    case "capture":
      // Kartu kredit — "accept" baru benar-benar lunas, "challenge"
      // ditahan sistem anti-fraud Midtrans, wajib ditinjau manual
      // (staf, lewat tombol Setujui/Tolak yang tetap ada — Langkah 8),
      // BUKAN diotomasi jadi fulfilled begitu saja.
      return fraudStatus === "accept" ? "fulfill" : "hold_review";
    case "settlement":
      return "fulfill";
    case "pending":
      return "pending_noop";
    case "deny":
    case "cancel":
      return "reject";
    case "expire":
      return "expire";
    case "refund":
    case "partial_refund":
      return "refund";
    default:
      return "hold_review";
  }
}
