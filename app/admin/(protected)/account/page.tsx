import { redirect } from "next/navigation";
import { getSessionClientId } from "@/lib/adminAuth";
import { getRepo } from "@/lib/repo";
import AccountEditor from "@/components/admin/AccountEditor";

export default async function AccountPage() {
  const clientId = await getSessionClientId();
  if (!clientId) redirect("/admin/login");

  const client = await getRepo().clients.getById(clientId);
  if (!client) redirect("/admin/login");

  // passwordHash tidak pernah dikirim ke client component — sama seperti
  // GET /api/admin/account, dibuang di sini juga (server component ini
  // TETAP mengirim datanya lewat serialisasi React ke browser).
  const { passwordHash: _hash, ...safeClient } = client;
  void _hash;

  return (
    <div style={{ padding: "32px 32px 60px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, color: "#0F172A", marginBottom: 4 }}>Akun</h1>
      <p style={{ fontSize: 14, color: "var(--a-clr-text-muted)", marginBottom: 24 }}>
        Profil dan keamanan akunmu.
      </p>
      <AccountEditor client={safeClient} />
    </div>
  );
}
