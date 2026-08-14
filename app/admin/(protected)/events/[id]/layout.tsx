import { notFound, redirect } from "next/navigation";
import { getSessionClientId } from "@/lib/adminAuth";
import { getRepo } from "@/lib/repo";

/**
 * Gerbang kepemilikan untuk SELURUH halaman satu event
 * (Ringkasan, Visual Builder, Bingkai, Publish).
 *
 * Ditaruh di layout, bukan diulang di tiap page.tsx — supaya menambah
 * halaman event baru nanti tidak bisa lupa memasang pemeriksaannya.
 * Halaman anak boleh langsung mengambil data tanpa cek ulang.
 */
export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const clientId = await getSessionClientId();
  if (!clientId) redirect("/admin/login");

  const repo = getRepo();
  const [event, client] = await Promise.all([repo.events.getById(id), repo.clients.getById(clientId)]);
  if (!event || !client) notFound();

  // 404, bukan 403 — jangan bocorkan bahwa event ini ada tapi milik
  // klien lain.
  if (!client.isStaff && event.clientId !== client.id) notFound();

  return <>{children}</>;
}
