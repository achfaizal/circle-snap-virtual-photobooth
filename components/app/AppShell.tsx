"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import type { AccountRole, AccountType } from "@/lib/db/queries/accounts";
import NotificationBell from "./NotificationBell";

/**
 * Bingkai halaman /app/* (Tahap 3) — TERPISAH dari components/admin/
 * AdminShell.tsx (nav staf, dijaga ADMIN-DESIGN-BRIEF.md yang memang
 * hanya berlaku untuk /admin/*, dok 05 tidak menyebut aturan visual
 * setara untuk /app). Top-bar sederhana (bukan sidebar+drawer AdminShell)
 * — cukup untuk skeleton Langkah 2; menu bertambah seiring halaman baru
 * (Billing Langkah 6, dst.) supaya tidak ada tautan mati di masa transisi.
 */
export default function AppShell({
  children,
  fullName,
  accountDisplayName,
  accountType,
  role,
}: {
  children: React.ReactNode;
  fullName: string;
  accountDisplayName: string;
  accountType: AccountType;
  role: AccountRole;
}) {
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/app/logout", { method: "POST" });
    router.replace("/app/login");
    router.refresh();
  };

  const roleLabel: Record<AccountRole, string> = { owner: "Pemilik", manager: "Manajer", operator: "Operator" };
  const typeLabel: Record<AccountType, string> = { personal: "Acara Sendiri", vendor: "Vendor / EO" };

  return (
    <div style={{ minHeight: "100dvh", background: "#F8FAFC" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          background: "white",
          borderBottom: "1px solid #E4E4E7",
        }}
      >
        <Link href="/app" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ikon
              statis kecil, tidak butuh optimisasi next/image */}
          <img src="/logo/1.png" alt="Circle Snap" style={{ width: 28, height: 28 }} />
          <span style={{ fontWeight: 900, fontSize: 16, letterSpacing: "-0.02em", color: "#18181B" }}>
            Circle Snap
          </span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* dok 01 §3.2: Operator "tidak boleh melihat harga atau
              penagihan" — tautan disembunyikan, bukan cuma diblokir di
              backend (BillingPage juga redirect operator sendiri). */}
          {role !== "operator" && (
            <Link
              href="/app/billing"
              style={{ fontSize: 13, fontWeight: 700, color: "#3F3F46", textDecoration: "none" }}
            >
              Billing
            </Link>
          )}
          <NotificationBell />
          <div style={{ textAlign: "right", lineHeight: 1.3 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#18181B" }}>{accountDisplayName}</div>
            <div style={{ fontSize: 11.5, color: "#71717A", fontWeight: 600 }}>
              {fullName} · {roleLabel[role]} · {typeLabel[accountType]}
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            aria-label="Keluar"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 12px",
              borderRadius: 100,
              border: "1px solid #E4E4E7",
              background: "white",
              color: "#71717A",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            <LogOut size={14} /> Keluar
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "24px 20px 48px" }}>{children}</main>
    </div>
  );
}
