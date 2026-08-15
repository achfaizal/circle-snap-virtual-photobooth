import { redirect } from "next/navigation";
import { getSessionAccount } from "@/lib/clientAuth";
import { getAccountById, getUserById } from "@/lib/db/queries/accounts";
import AppShell from "@/components/app/AppShell";

/**
 * Penjaga halaman untuk seluruh /app/* KECUALI /app/login & /app/register
 * (di luar route group ini) — pola sama app/admin/(protected)/layout.tsx.
 * Hanya melindungi HALAMAN; route /api/app/* menjaga dirinya sendiri
 * lewat requireAccountRole() (lib/clientAuth.ts).
 */
export default async function ProtectedAppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionAccount();
  if (!session) redirect("/app/login");

  const [user, account] = await Promise.all([
    getUserById(session.userId),
    getAccountById(session.accountId),
  ]);
  // Kedua baris ini SEHARUSNYA selalu ada kalau sesi valid (FK ke
  // keduanya) — kalau ternyata hilang (dihapus manual dari DB di
  // belakang sesi yang masih aktif), lebih aman suruh login ulang
  // daripada merender halaman dengan data kosong.
  if (!user || !account) redirect("/app/login");

  return (
    <AppShell
      fullName={user.fullName}
      accountDisplayName={account.displayName}
      accountType={account.type}
      role={session.role}
    >
      {children}
    </AppShell>
  );
}
