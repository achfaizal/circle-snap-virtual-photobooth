/**
 * Regresi permanen Langkah 2 (integrasi Midtrans) — dok 08 §1.5.
 * Bagian (a) memanggil sandbox Midtrans SUNGGUHAN pakai kredensial di
 * .env.local — butuh koneksi internet & kredensial valid untuk lulus.
 *
 * Jalan: npx tsx --env-file=.env.local scripts/test-midtrans-integration.ts
 */
import { createHash, randomUUID } from "node:crypto";
import {
  createSnapTransaction,
  verifyNotificationSignature,
  mapMidtransStatus,
  type MidtransNotificationPayload,
} from "../lib/services/midtrans";

let pass = 0;
let fail = 0;
function check(label: string, ok: boolean, detail?: string) {
  if (ok) {
    pass++;
    console.log(`  OK   ${label}`);
  } else {
    fail++;
    console.log(`  GAGAL ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function testCreateSnapTransaction() {
  console.log("\n=== (a) createSnapTransaction() ke sandbox SUNGGUHAN ===");
  try {
    const result = await createSnapTransaction({
      orderNumber: `CS-UJI-${randomUUID().slice(0, 8)}`,
      grossAmountIdr: 249000,
      expiresAt: new Date(Date.now() + 3600_000),
      customerName: "Uji Regresi",
      customerEmail: "uji@example.com",
    });
    check("dapat token dari Midtrans", typeof result.token === "string" && result.token.length > 10);
    check("dapat redirect_url dari Midtrans", result.redirectUrl.includes("midtrans.com"));
  } catch (err) {
    check("createSnapTransaction() sukses (cek kredensial/koneksi)", false, String(err));
  }
}

function makeSignedPayload(overrides: Partial<MidtransNotificationPayload> = {}): MidtransNotificationPayload {
  const base = {
    order_id: "CS-UJI-0001",
    status_code: "200",
    gross_amount: "249000.00",
    transaction_status: "settlement",
    transaction_id: randomUUID(),
    ...overrides,
  };
  const serverKey = process.env.MIDTRANS_SERVER_KEY ?? "";
  const signature_key = createHash("sha512")
    .update(base.order_id + base.status_code + base.gross_amount + serverKey)
    .digest("hex");
  return { ...base, signature_key };
}

function testSignature() {
  console.log("\n=== (b) verifyNotificationSignature() ===");
  const valid = makeSignedPayload();
  check("signature BENAR diterima", verifyNotificationSignature(valid));

  const tampered = { ...valid, gross_amount: "1.00" }; // nominal diubah TANPA menghitung ulang signature
  check("signature untuk payload yang DIUBAH (nominal dipalsukan) ditolak", !verifyNotificationSignature(tampered));

  const wrongSig = { ...valid, signature_key: "0".repeat(128) };
  check("signature acak/salah ditolak", !verifyNotificationSignature(wrongSig));

  const shortSig = { ...valid, signature_key: "abc" };
  check("signature terlalu pendek ditolak (bukan exception)", !verifyNotificationSignature(shortSig));
}

function testStatusMapping() {
  console.log("\n=== (c) mapMidtransStatus() ===");
  check("capture + accept → fulfill", mapMidtransStatus("capture", "accept") === "fulfill");
  check("capture + challenge → hold_review (BUKAN otomatis fulfill)", mapMidtransStatus("capture", "challenge") === "hold_review");
  check("settlement → fulfill", mapMidtransStatus("settlement") === "fulfill");
  check("pending → pending_noop", mapMidtransStatus("pending") === "pending_noop");
  check("deny → reject", mapMidtransStatus("deny") === "reject");
  check("cancel → reject", mapMidtransStatus("cancel") === "reject");
  check("expire → expire", mapMidtransStatus("expire") === "expire");
  check("refund → refund", mapMidtransStatus("refund") === "refund");
  check("partial_refund → refund", mapMidtransStatus("partial_refund") === "refund");
  check("status tak dikenal → hold_review (bukan diam-diam fulfill)", mapMidtransStatus("aneh-tidak-dikenal") === "hold_review");
}

async function main() {
  await testCreateSnapTransaction();
  testSignature();
  testStatusMapping();
  console.log(`\n${pass} lulus, ${fail} gagal.\n`);
  if (fail > 0) process.exit(1);
}
main();
