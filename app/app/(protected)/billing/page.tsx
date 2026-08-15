import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionAccount } from "@/lib/clientAuth";
import { getAccountById } from "@/lib/db/queries/accounts";
import { listEventsByAccountId } from "@/lib/db/queries/events";
import { listPackages } from "@/lib/db/queries/packages";
import { listOrdersByAccount } from "@/lib/db/queries/purchaseOrders";
import { getWalletBalance } from "@/lib/db/queries/allocation";
import { formatIdr } from "@/lib/services/addons";
import BillingWallet from "@/components/app/BillingWallet";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draf",
  awaiting_payment: "Menunggu pembayaran",
  paid: "Sedang diverifikasi",
  fulfilled: "Lunas",
  cancelled: "Dibatalkan",
  expired: "Kedaluwarsa",
  refunded: "Dikembalikan",
};

/**
 * `/app/billing` (Langkah 6 Tahap 3, dok 05 §6) — Owner/Manager saja
 * secara halaman (link disembunyikan dari nav Operator, lib/clientAuth
 * belum menyediakan gerbang HALAMAN generik seperti requireAccountRole
 * yang dipakai di API — dicek manual di sini, pola sama events/new).
 * Isi bercabang `accounts.type`: Vendor = dompet+alokasi+top-up,
 * Perorangan = riwayat pesanan (dok 01: operator "tidak boleh melihat
 * harga atau penagihan" — ditolak sebelum render apa pun).
 */
export default async function BillingPage() {
  const session = await getSessionAccount();
  if (!session) redirect("/app/login");
  if (session.role === "operator") redirect("/app");

  const account = await getAccountById(session.accountId);
  if (!account) redirect("/app/login");

  if (account.type === "vendor") {
    const [walletBalance, events, allPackages] = await Promise.all([
      getWalletBalance(account.id),
      listEventsByAccountId(account.id),
      listPackages(),
    ]);
    const topupPackages = allPackages
      .filter((p) => p.status === "published" && p.allocationMode === "flexible" && (p.audience === "vendor" || p.audience === "both"))
      .map((p) => ({ id: p.id, name: p.name, strips: p.strips, priceIdr: p.priceIdr }));

    return (
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: "#18181B", marginBottom: 20 }}>Billing</h1>
        <BillingWallet
          walletBalance={walletBalance}
          events={events.map((e) => ({ id: e.id, internalName: e.internalName, status: e.status, cachedQuota: e.cachedQuota, cachedConsumed: e.cachedConsumed }))}
          topupPackages={topupPackages}
        />
      </div>
    );
  }

  const orders = await listOrdersByAccount(account.id);
  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 900, color: "#18181B", marginBottom: 20 }}>Riwayat Pesanan</h1>
      {orders.length === 0 ? (
        <p style={{ fontSize: 13, color: "#71717A" }}>Belum ada pesanan.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/app/orders/${o.id}/payment`}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "white", border: "1px solid #E4E4E7", borderRadius: 12, padding: "14px 16px", textDecoration: "none" }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#18181B" }}>{o.number}</div>
                <div style={{ fontSize: 11.5, color: "#71717A" }}>{STATUS_LABEL[o.status] ?? o.status}</div>
              </div>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#18181B" }}>{formatIdr(o.totalIdr)}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
