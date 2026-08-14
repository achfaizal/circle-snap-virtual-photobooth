"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Frame, ArrowLeft } from "lucide-react";

/**
 * Halaman 404 tunggal untuk seluruh app (§11.7 UI-UX-DESIGN-SYSTEM.md) —
 * sebelumnya tidak ada sama sekali, jatuh ke halaman bawaan Next.js yang
 * polos. Satu pola dipakai untuk 404 di sisi tamu maupun admin (link
 * "kembali" pintar: ke /admin kalau URL yang salah diawali /admin,
 * kalau tidak ke beranda tamu) — sesuai anjuran dokumen "bisa dipakai
 * ulang untuk error boundary/maintenance page" juga nantinya.
 *
 * CTA SENGAJA radius 12 (bukan pill 100) — dokumen menegaskan ini beda
 * kesan dari CTA marketing: "lebih utility", bukan ajakan promosi. */
export default function NotFound() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#F4F8FF",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        <div
          className="mx-auto grid place-items-center"
          style={{ width: 88, height: 88, borderRadius: "50%", background: "#DCEBFF", marginBottom: 16 }}
        >
          <Frame size={40} color="#1976F3" aria-hidden />
        </div>
        <p style={{ fontSize: 48, fontWeight: 900, letterSpacing: "-0.03em", color: "#1976F3", marginBottom: 4 }}>
          404
        </p>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0A1F44" }}>Halaman tidak ditemukan</h1>
        <p style={{ fontSize: 14, color: "#71717A", lineHeight: 1.6, marginTop: 8, marginBottom: 28 }}>
          Halaman yang kamu cari sudah dipindah, dihapus, atau alamatnya salah ketik.
        </p>
        <Link
          href={isAdmin ? "/admin" : "/"}
          className="inline-flex items-center text-white"
          style={{
            gap: 8,
            padding: "14px 28px",
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 14,
            background: "linear-gradient(135deg, #1976F3, #2F80FF)",
            boxShadow: "0 4px 15px rgba(25, 118, 243, 0.3)",
          }}
        >
          <ArrowLeft size={16} />
          {isAdmin ? "Kembali ke Dashboard" : "Kembali ke Beranda"}
        </Link>
      </div>
    </div>
  );
}
