import { notFound } from "next/navigation";
import { getSessionClientId } from "@/lib/adminAuth";
import { getRepo } from "@/lib/repo";
import { listCategories } from "@/lib/db/queries/categories";
import CategoriesManager from "@/components/admin/t2/CategoriesManager";

/**
 * Kategori acara — Langkah 1 Tahap 2. Baca tabel `event_categories`
 * (Postgres) langsung, bukan lewat lib/repo (JSON) — halaman baru ini
 * berdampingan dengan wizard event lama, bukan menggantikannya.
 *
 * 404 (bukan 403) untuk non-staf, sama pola dengan /admin/staff/*.
 */
export default async function CategoriesPage() {
  const clientId = await getSessionClientId();
  if (!clientId) notFound();
  const me = await getRepo().clients.getById(clientId);
  if (!me?.isStaff) notFound();

  const categories = await listCategories();

  return (
    <div>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: "var(--a-clr-text)",
        }}
      >
        Kategori Acara
      </h1>
      <p style={{ fontSize: 14, color: "var(--a-clr-text-muted)", marginTop: 4, marginBottom: 24 }}>
        Dipakai template &amp; acara untuk saring tampilan. Kategori yang masih
        dipakai tidak bisa dihapus — arsipkan saja.
      </p>
      <CategoriesManager
        initial={categories.map((c) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          description: c.description,
          icon: c.icon,
          defaultGreeting: c.defaultGreeting,
          defaultBrandLabel: c.defaultBrandLabel,
          sortOrder: c.sortOrder,
          status: c.status,
        }))}
      />
    </div>
  );
}
