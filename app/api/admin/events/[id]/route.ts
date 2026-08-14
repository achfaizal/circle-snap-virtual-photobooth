import { NextResponse } from "next/server";
import { getSessionClientId } from "@/lib/adminAuth";
import { getRepo } from "@/lib/repo";
import type { Event } from "@/lib/models/event";
import type { Client } from "@/lib/models/client";
import { canEditStartAt, computeExpiresAt } from "@/lib/services/eventLifecycle";

/** ⚠️ Route ini menjaga dirinya sendiri — layout admin cuma melindungi
    halaman, bukan route handler. Lihat catatan di lib/adminAuth.ts.

    Dipakai oleh GET/PATCH/DELETE — sebelumnya SEMUA cuma cek "sudah
    login?" tanpa cek KEPEMILIKAN sama sekali, jadi klien A bisa
    lihat/ubah/hapus event klien B asal tahu/tebak id-nya. Sekarang: 401
    kalau belum login, 404 (bukan 403 — tidak bocorin event itu ADA tapi
    milik orang lain) kalau event ada tapi bukan miliknya & bukan staff. */
async function requireEventOwner(
  id: string
): Promise<{ event: Event; client: Client } | NextResponse> {
  const clientId = await getSessionClientId();
  if (!clientId) {
    return NextResponse.json({ error: "Belum masuk." }, { status: 401 });
  }

  const repo = getRepo();
  const [event, client] = await Promise.all([repo.events.getById(id), repo.clients.getById(clientId)]);
  if (!event || !client) {
    return NextResponse.json({ error: "Event tidak ditemukan." }, { status: 404 });
  }
  if (!client.isStaff && event.clientId !== client.id) {
    return NextResponse.json({ error: "Event tidak ditemukan." }, { status: 404 });
  }
  return { event, client };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireEventOwner(id);
  if (guard instanceof NextResponse) return guard;

  const repo = getRepo();
  const subscription = await repo.subscriptions.getByEventId(id);
  return NextResponse.json({ event: guard.event, subscription });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireEventOwner(id);
  if (guard instanceof NextResponse) return guard;

  const patch = (await request.json().catch(() => null)) as Partial<Event> | null;
  if (!patch) return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });

  // id/clientId/createdAt tidak boleh berubah lewat PATCH — kalau
  // dikirim ikut, diabaikan diam-diam daripada ditolak (klien lama yang
  // mengirim field ini apa adanya tidak perlu tahu detail ini).
  const { id: _ignoredId, clientId: _ignoredClientId, createdAt: _ignoredCreatedAt, ...safePatch } =
    patch;
  void _ignoredId;
  void _ignoredClientId;
  void _ignoredCreatedAt;

  const repo = getRepo();
  // Slug diketik ulang klien — cek bentrok sebelum menyimpan, bukan
  // sesudah (P4: gagal jelas, bukan menimpa event lain diam-diam).
  if (safePatch.slug && (await repo.events.slugTaken(safePatch.slug, id))) {
    return NextResponse.json({ error: "Slug ini sudah dipakai event lain." }, { status: 409 });
  }

  // BRD §8 poin 11: startAt tidak boleh diubah lagi setelah masa aktif
  // sungguhan berjalan (live DAN sudah lewat waktu mulainya) — tanpa ini
  // klien tinggal memundurkan tanggal terus-menerus dan paketnya tidak
  // pernah habis. Dicek terhadap event LAMA (guard.event), bukan hasil
  // patch — supaya tidak bisa dilewati dengan mengirim status & startAt
  // sekaligus dalam satu request.
  if ("startAt" in safePatch && !canEditStartAt(guard.event)) {
    return NextResponse.json(
      { error: "Jadwal mulai tidak bisa diubah lagi — acara sudah berjalan." },
      { status: 400 }
    );
  }

  // BRD §5.3: "klien wajib mengisi tanggal DAN jam mulai" — masa aktif 7
  // hari dihitung dari situ, bukan dari tanggal publish. Menolak di sini
  // (bukan cuma menandai checklist di UI) supaya aturan komersialnya
  // benar-benar tegak, sesuai request pengguna: klien tidak bisa
  // memanggil API ini langsung untuk melewati checklist.
  const nextStartAt = typeof safePatch.startAt === "string" ? safePatch.startAt : guard.event.startAt;
  if (safePatch.status === "live" && !nextStartAt) {
    return NextResponse.json(
      { error: "Isi jadwal mulai (tanggal & jam) di Detail Acara dulu sebelum publikasi." },
      { status: 400 }
    );
  }

  const updated = await repo.events.update(id, safePatch);

  // Sinkronkan masa aktif Subscription setiap kali startAt berubah —
  // expiresAt HARUS mengikuti startAt, bukan kapan Subscription-nya dulu
  // dibuat (docs/blueprint/09 §5.3).
  if (updated && typeof safePatch.startAt === "string" && safePatch.startAt) {
    const subscription = await repo.subscriptions.getByEventId(id);
    if (subscription) {
      await repo.subscriptions.update(subscription.id, {
        startsAt: safePatch.startAt,
        expiresAt: computeExpiresAt(safePatch.startAt),
      });
    }
  }

  return NextResponse.json({ event: updated });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireEventOwner(id);
  if (guard instanceof NextResponse) return guard;

  const repo = getRepo();
  await repo.events.remove(id);
  // Langganannya ikut dihapus. Dulu sengaja ditinggal ("data yatim yang
  // aman"), tapi ternyata menumpuk cepat: sekali pengecekan menemukan 11
  // dari 12 baris langganan sudah tidak punya event — cukup untuk membuat
  // hitungan kuota di panel staff meleset.
  await repo.subscriptions.removeByEventId(id);
  return NextResponse.json({ ok: true });
}
