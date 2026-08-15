import { NextResponse } from "next/server";
import { requireAccountRole } from "@/lib/clientAuth";
import { getEventForAccount, updateEvent, type EventPatch } from "@/lib/db/queries/events";
import { getCategory } from "@/lib/db/queries/categories";
import { canEditStartsAt } from "@/lib/services/eventEditGuard";
import type { SessionConfig } from "@/lib/services/defaultSessionConfig";

interface DetailsPatchBody {
  internalName?: string;
  categoryId?: string;
  venue?: string | null;
  timezone?: string;
  startsAt?: string;
  // Visual Builder (Langkah 7) — field identitas TETAP (bukan
  // template_variables, lihat dok 03 §5.1: kolom nyata di `events`).
  displayNames?: string;
  dateDisplay?: string;
  hashtag?: string;
  greeting?: string;
  guestNameRequired?: boolean;
  sessionConfig?: SessionConfig;
}

/** Detail Acara (Langkah 6) + Visual Builder "Selamat Datang"/Sesi/Bagikan
    (Langkah 7 Tahap 3) — satu route PATCH generik untuk field TETAP di
    `events` (dok 06 §3: sapaan/tanggal tampil/sambutan/session_config
    memang kolom acara sungguhan, beda dari template_variables yang
    diladeni /api/app/events/[id]/variables). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAccountRole("manager");
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const event = await getEventForAccount(id, guard.accountId);
  if (!event) return NextResponse.json({ error: "Acara tidak ditemukan." }, { status: 404 });

  const body = (await request.json().catch(() => null)) as DetailsPatchBody | null;
  if (!body) return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });

  const patch: EventPatch = {};

  if (body.internalName !== undefined) {
    const trimmed = body.internalName.trim();
    if (!trimmed) return NextResponse.json({ error: "Nama internal tidak boleh kosong." }, { status: 400 });
    patch.internalName = trimmed;
  }
  if (body.categoryId !== undefined) {
    const category = await getCategory(body.categoryId);
    if (!category || category.status !== "active") {
      return NextResponse.json({ error: "Kategori tidak ditemukan atau sudah diarsipkan." }, { status: 400 });
    }
    patch.categoryId = body.categoryId;
  }
  if (body.venue !== undefined) {
    patch.venue = body.venue?.trim() || null;
  }
  if (body.timezone !== undefined) {
    patch.timezone = body.timezone;
  }
  if (body.startsAt !== undefined) {
    if (!canEditStartsAt(event)) {
      return NextResponse.json(
        { error: "Jadwal mulai terkunci — acara sudah berjalan (live dan sudah lewat jadwal mulai)." },
        { status: 400 }
      );
    }
    const startsAt = new Date(body.startsAt);
    if (Number.isNaN(startsAt.getTime())) {
      return NextResponse.json({ error: "Jadwal mulai tidak valid." }, { status: 400 });
    }
    patch.startsAt = startsAt;
  }
  if (body.displayNames !== undefined) patch.displayNames = body.displayNames.trim() || null;
  if (body.dateDisplay !== undefined) patch.dateDisplay = body.dateDisplay.trim() || null;
  if (body.hashtag !== undefined) patch.hashtag = body.hashtag.trim() || null;
  if (body.greeting !== undefined) patch.greeting = body.greeting.trim() || null;
  if (body.guestNameRequired !== undefined) patch.guestNameRequired = body.guestNameRequired;
  if (body.sessionConfig !== undefined) {
    // K11/dok 05 §5.5 poin 11 — minimal satu tombol unduh menyala,
    // ditegakkan SERVER-SIDE (bukan cuma disabled di UI) supaya tidak
    // ada jalan pintas lewat panggilan API langsung.
    const share = body.sessionConfig.share;
    if (!share?.downloadPng && !share?.downloadJpg && !share?.downloadVideo) {
      return NextResponse.json(
        { error: "Minimal satu tombol unduh (PNG/JPG/Video) harus menyala." },
        { status: 400 }
      );
    }
    patch.sessionConfig = body.sessionConfig;
  }

  const updated = await updateEvent(id, patch);
  return NextResponse.json({ ok: true, event: updated });
}
