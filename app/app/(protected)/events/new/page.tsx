import { redirect } from "next/navigation";
import { getSessionAccount } from "@/lib/clientAuth";
import { getAccountById } from "@/lib/db/queries/accounts";
import { listCategories } from "@/lib/db/queries/categories";
import { listPackages } from "@/lib/db/queries/packages";
import { getActiveDaysOptionsForAccount, getWalletBalance } from "@/lib/db/queries/allocation";
import CreateEventWizard from "@/components/app/CreateEventWizard";

/** dok 01 §3.2: Operator "tidak boleh mengubah pengaturan acara" — buat
    acara baru termasuk di dalamnya, jadi dialihkan sebelum melihat form
    yang tombolnya toh akan ditolak API (requireAccountRole di
    /api/app/events, pola sama app/admin/(protected)/page.tsx lama untuk
    staff yang tidak boleh punya acara). */
export default async function NewEventPage() {
  const session = await getSessionAccount();
  if (!session) redirect("/app/login");
  if (session.role === "operator") redirect("/app");

  const account = await getAccountById(session.accountId);
  if (!account) redirect("/app/login");

  const categories = await listCategories();
  const categoryOptions = categories
    .filter((c) => c.status === "active")
    .map((c) => ({ id: c.id, code: c.code, name: c.name, icon: c.icon }));

  if (account.type === "personal") {
    const allPackages = await listPackages();
    const packageOptions = allPackages
      .filter((p) => p.status === "published" && (p.audience === "personal" || p.audience === "both"))
      .map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        tagline: p.tagline,
        priceIdr: p.priceIdr,
        strips: p.strips,
        activeDays: p.activeDays,
      }));

    return (
      <CreateEventWizard
        categories={categoryOptions}
        accountType="personal"
        packages={packageOptions}
        walletBalance={0}
        activeDaysOptions={[]}
      />
    );
  }

  const [walletBalance, activeDaysOptions] = await Promise.all([
    getWalletBalance(account.id),
    getActiveDaysOptionsForAccount(account.id),
  ]);

  return (
    <CreateEventWizard
      categories={categoryOptions}
      accountType="vendor"
      packages={[]}
      walletBalance={walletBalance}
      activeDaysOptions={activeDaysOptions}
    />
  );
}
