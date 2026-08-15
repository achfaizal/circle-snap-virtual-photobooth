import { redirect } from "next/navigation";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { getSessionAccount } from "@/lib/clientAuth";
import { getUserById } from "@/lib/db/queries/accounts";
import EmailVerificationPanel from "@/components/app/EmailVerificationPanel";

/**
 * Verifikasi email (koreksi 15 Agu 2026, gerbang publikasi poin 10,
 * dok 05 §5.5) — DI LUAR app/app/(protected)/* sengaja: halaman ini
 * juga jadi TUJUAN redirect dari /api/app/verify-email (GET, link yang
 * diklik), jadi tidak boleh terjebak logika "sudah harus pilih akun
 * dulu" — cukup sesi login biasa.
 */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getSessionAccount();
  if (!session) redirect("/app/login");

  const { status } = await searchParams;
  const user = await getUserById(session.userId);
  if (!user) redirect("/app/login");

  return (
    <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, background: "#F8FAFC" }}>
      <div style={{ maxWidth: 440, width: "100%" }}>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: "#18181B", marginBottom: 4 }}>Verifikasi Email</h1>
        <p style={{ fontSize: 13, color: "#71717A", marginBottom: 16 }}>{user.email}</p>

        {status === "success" && (
          <Banner icon={<CheckCircle2 size={16} color="#16A34A" />} bg="#F0FDF4" border="#BBF7D0" color="#166534">
            Email berhasil diverifikasi.
          </Banner>
        )}
        {status === "invalid" && (
          <Banner icon={<XCircle size={16} color="#EF4444" />} bg="#FEF2F2" border="#FECACA" color="#991B1B">
            Link verifikasi tidak valid — buat link baru di bawah.
          </Banner>
        )}
        {status === "expired" && (
          <Banner icon={<Clock size={16} color="#B45309" />} bg="#FEF3C7" border="#FDE68A" color="#92400E">
            Link verifikasi sudah kedaluwarsa (berlaku 24 jam) — buat link baru di bawah.
          </Banner>
        )}

        {user.emailVerifiedAt ? (
          <div style={{ background: "white", border: "1px solid #E4E4E7", borderRadius: 14, padding: 18, display: "flex", alignItems: "center", gap: 10 }}>
            <CheckCircle2 size={20} color="#16A34A" />
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: "#18181B" }}>Email sudah terverifikasi</p>
              <p style={{ fontSize: 12, color: "#71717A" }}>Gerbang publikasi poin 10 sudah lolos untuk akunmu.</p>
            </div>
          </div>
        ) : (
          <EmailVerificationPanel />
        )}
      </div>
    </div>
  );
}

function Banner({
  icon,
  bg,
  border,
  color,
  children,
}: {
  icon: React.ReactNode;
  bg: string;
  border: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, background: bg, border: `1px solid ${border}`, marginBottom: 12 }}>
      {icon}
      <span style={{ fontSize: 12.5, color, fontWeight: 600 }}>{children}</span>
    </div>
  );
}
