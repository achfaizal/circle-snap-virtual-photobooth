import { redirect } from "next/navigation";
import { getSessionClientId } from "@/lib/adminAuth";
import { getRepo } from "@/lib/repo";
import FrameLibrary from "@/components/admin/FrameLibrary";

export default async function FramesLibraryPage() {
  const clientId = await getSessionClientId();
  if (!clientId) redirect("/admin/login");

  const repo = getRepo();
  const client = await repo.clients.getById(clientId);
  if (!client) redirect("/admin/login");

  // Klien melihat pustaka BAWAAN (clientId null — aset Circle Snap yang
  // boleh dipakai semua orang) DITAMBAH bingkai miliknya sendiri.
  // Sebelumnya hanya yang bawaan, jadi bingkai hasil upload klien tidak
  // pernah muncul di halaman ini sama sekali.
  const [sharedFrames, ownFrames, sharedAssets, ownAssets] = await Promise.all([
    repo.frames.list(null),
    client.isStaff ? Promise.resolve([]) : repo.frames.list(client.id),
    repo.assets.list(null),
    client.isStaff ? Promise.resolve([]) : repo.assets.list(client.id),
  ]);

  const assetUrls: Record<string, string> = {};
  for (const a of [...sharedAssets, ...ownAssets]) assetUrls[a.id] = a.url;

  return (
    <FrameLibrary
      frames={[...sharedFrames, ...ownFrames]}
      assetUrls={assetUrls}
      ownedIds={ownFrames.map((f) => f.id)}
      canDeleteShared={Boolean(client.isStaff)}
    />
  );
}
