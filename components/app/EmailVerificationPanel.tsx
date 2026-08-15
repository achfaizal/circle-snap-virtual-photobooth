"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, ExternalLink } from "lucide-react";
import Spinner from "@/components/admin/Spinner";

/** Mode dev — TIDAK ADA SMTP. Tombol ini menerbitkan token baru lalu
    menampilkan link-nya LANGSUNG di layar (klik = verifikasi), pengganti
    "cek inbox email kamu" yang tidak mungkin terjadi sungguhan di sini. */
export default function EmailVerificationPanel() {
  const router = useRouter();
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLink = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/app/verify-email", { method: "POST" });
      const data = (await res.json().catch(() => null)) as { verifyUrl?: string; error?: string } | null;
      if (!res.ok || !data?.verifyUrl) {
        setError(data?.error ?? "Gagal membuat link verifikasi.");
        return;
      }
      setVerifyUrl(data.verifyUrl);
    } catch {
      setError("Tidak bisa menghubungi server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ background: "white", border: "1px solid #E4E4E7", borderRadius: 14, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Mail size={18} color="var(--a-clr-primary)" />
        <p style={{ fontSize: 14, fontWeight: 800, color: "#18181B" }}>Email belum diverifikasi</p>
      </div>
      <p style={{ fontSize: 12.5, color: "#71717A", marginBottom: 14 }}>
        Aplikasi ini belum punya pengiriman email sungguhan (mode dev) — klik tombol di bawah untuk membuat link
        verifikasi, lalu klik link itu langsung (di produksi, link ini akan dikirim ke emailmu).
      </p>

      {!verifyUrl ? (
        <button
          type="button"
          onClick={requestLink}
          disabled={busy}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 16px",
            borderRadius: 100,
            border: "none",
            background: "linear-gradient(135deg, var(--a-clr-brand-1), var(--a-clr-brand-2))",
            color: "white",
            fontWeight: 800,
            fontSize: 13,
            cursor: busy ? "not-allowed" : "pointer",
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy && <Spinner size={14} />}
          {busy ? "Membuat link…" : "Buat link verifikasi"}
        </button>
      ) : (
        <a
          href={verifyUrl}
          onClick={() => router.refresh()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 16px",
            borderRadius: 100,
            border: "1.5px solid var(--a-clr-primary)",
            color: "var(--a-clr-primary)",
            fontWeight: 800,
            fontSize: 13,
            textDecoration: "none",
          }}
        >
          <ExternalLink size={14} /> Verifikasi sekarang
        </a>
      )}

      {error && <p style={{ fontSize: 12, color: "#EF4444", marginTop: 10 }}>{error}</p>}
    </div>
  );
}
