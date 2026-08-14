import { notFound, redirect } from "next/navigation";
import { getSessionClientId } from "@/lib/adminAuth";
import { getRepo } from "@/lib/repo";
import TextLayerEditor from "@/components/admin/frame-editor/TextLayerEditor";

/**
 * Gerbang kepemilikan sama seperti app/api/admin/frames/[id]/route.ts:
 * staff boleh semua, klien hanya bingkai miliknya sendiri. Bingkai bawaan
 * (clientId: null) SENGAJA tidak bisa dibuka klien biasa lewat rute ini —
 * itu aset bersama, mengizinkan satu klien mengatur teksnya berarti
 * mengubah tampilan bingkai untuk semua klien lain juga.
 */
export default async function FrameTextEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clientId = await getSessionClientId();
  if (!clientId) redirect("/admin/login");

  const repo = getRepo();
  const [frame, client] = await Promise.all([repo.frames.getById(id), repo.clients.getById(clientId)]);
  if (!frame || !client) notFound();

  const canEdit = client.isStaff || frame.clientId === client.id;
  if (!canEdit) notFound();

  const asset = await repo.assets.getById(frame.overlayAssetId);
  if (!asset) notFound();

  return <TextLayerEditor frame={frame} assetUrl={asset.url} />;
}
