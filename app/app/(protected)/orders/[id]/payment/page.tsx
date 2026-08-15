import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getSessionAccount } from "@/lib/clientAuth";
import { getOrder } from "@/lib/db/queries/purchaseOrders";
import { db } from "@/lib/db/client";
import { assets } from "@/lib/db/schema";
import { formatIdr, MANUAL_TRANSFER_INSTRUCTIONS } from "@/lib/services/addons";
import PaymentProofForm from "@/components/app/PaymentProofForm";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draf",
  awaiting_payment: "Menunggu pembayaran",
  paid: "Sedang diverifikasi",
  fulfilled: "Lunas — kuota sudah masuk",
  cancelled: "Dibatalkan",
  expired: "Kedaluwarsa",
  refunded: "Dikembalikan",
};

/**
 * Halaman pembayaran klien (Langkah 5 Tahap 3) — HANYA mengunggah bukti
 * transfer. Verifikasi (setujui/tolak) tetap di /admin/orders
 * (Tahap 2, staf-saja, tidak diubah) — dok 02 §4, dok 04 §7 (D-26).
 */
export default async function OrderPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionAccount();
  if (!session) redirect("/app/login");

  const { id } = await params;
  const order = await getOrder(id);
  // K5 — kepemilikan objek, bukan cuma "sesi valid".
  if (!order || order.accountId !== session.accountId) redirect("/app");

  const proof = order.proofAssetId
    ? (await db.select().from(assets).where(eq(assets.id, order.proofAssetId)))[0]
    : null;

  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      <h1 style={{ fontSize: 20, fontWeight: 900, color: "#18181B", marginBottom: 4 }}>Pembayaran</h1>
      <p style={{ fontSize: 13, color: "#71717A", marginBottom: 20 }}>
        Pesanan {order.number} · {STATUS_LABEL[order.status] ?? order.status}
      </p>

      <div style={{ background: "white", border: "1px solid #E4E4E7", borderRadius: 14, padding: 18, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: "#71717A" }}>Total transfer</span>
          <span style={{ fontSize: 18, fontWeight: 900, color: "#18181B" }}>{formatIdr(order.totalIdr)}</span>
        </div>
        <p style={{ fontSize: 11.5, color: "#94A3B8", marginBottom: 12 }}>
          Nominal sengaja dibuat unik (3 digit terakhir) — jangan dibulatkan, supaya staf bisa mencocokkan mutasi
          bank dengan pesananmu.
        </p>
        <div style={{ fontSize: 13, color: "#3F3F46", lineHeight: 1.8 }}>
          <div>
            Bank: <strong>{MANUAL_TRANSFER_INSTRUCTIONS.bank}</strong>
          </div>
          <div>
            No. rekening: <strong>{MANUAL_TRANSFER_INSTRUCTIONS.accountNumber}</strong>
          </div>
          <div>
            Atas nama: <strong>{MANUAL_TRANSFER_INSTRUCTIONS.accountName}</strong>
          </div>
        </div>
      </div>

      {order.status === "awaiting_payment" && (
        <>
          {proof && (
            <div style={{ marginBottom: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- pratinjau bukti unggahan sendiri, bukan aset dioptimalkan */}
              <img src={proof.storageKey} alt="Bukti transfer" style={{ maxWidth: "100%", borderRadius: 12, border: "1px solid #E4E4E7" }} />
            </div>
          )}
          <PaymentProofForm orderId={order.id} alreadyUploaded={!!proof} />
        </>
      )}

      {order.status === "paid" && (
        <div style={{ padding: 16, borderRadius: 12, background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
          <p style={{ fontSize: 13, color: "#1E40AF", fontWeight: 700 }}>
            Bukti transfer sudah diterima — staf sedang memverifikasi.
          </p>
        </div>
      )}

      {order.status === "fulfilled" && (
        <div style={{ padding: 16, borderRadius: 12, background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
          <p style={{ fontSize: 13, color: "#166534", fontWeight: 700 }}>Pembayaran lunas — kuota sudah masuk ke acaramu.</p>
        </div>
      )}
    </div>
  );
}
