import { NextResponse } from "next/server";
import { getSessionClientId } from "@/lib/adminAuth";
import { getRepo } from "@/lib/repo";
import { DEFAULT_PRESET_ID, presetById, THEME_PRESETS } from "@/lib/services/theme";
import { planById, plansFor } from "@/lib/services/planCatalog";
import { subscriptionFromPlan } from "@/lib/models/plan";
import type { EventKind, NewEvent, SessionConfig } from "@/lib/models/event";

/** Perilaku sesi bawaan untuk event baru — sama seperti DEFAULT_SESSION
    di lib/store.ts (dipakai kalau event.session kosong sama sekali),
    ditulis eksplisit di sini supaya event baru langsung punya nilai
    tersimpan, bukan bergantung ke fallback klien. */
const DEFAULT_SESSION: SessionConfig = {
  countdownSeconds: 3,
  autoContinue: true,
  mirror: true,
  maxRetakes: 3,
  revealMs: 15000,
  filterCss: "brightness(1.08) contrast(1.04) saturate(1.12)",
  cameraAspect: "1:1",
  guestNameRequired: true,
  voice: { enabled: true, maxSeconds: 15 },
  moments: { enabled: true, showGuestName: true },
  share: {
    instagram: true,
    whatsapp: true,
    nativeShare: true,
    downloadPng: true,
    downloadJpg: true,
    downloadVideo: true,
  },
};

interface CreateEventBody {
  identity: {
    internalName: string;
    kind?: EventKind;
    brandLabel: string;
    names: string;
    date: string;
    dateDisplay: string;
    venue: string;
    hashtag: string;
    greeting: string;
  };
  slug: string;
  /** Opsional: wizard "Buat Event" TIDAK lagi menanyakan tema — itu
      urusan Visual Builder setelah event jadi. Event baru mulai dari
      preset pertama, klien mengubahnya belakangan dengan pratinjau
      hidup, bukan menebak dari kotak kecil di wizard. */
  themePreset?: string;
  /** WAJIB diisi kalau klien belum pernah punya paket (Client.planId
      kosong) — lihat CreateEventWizard.tsx langkah "Pilih Paket".
      Diabaikan (bukan divalidasi ulang) kalau klien SUDAH punya paket —
      event ke-2 dst. Vendor/EO otomatis memakai paket yang sama, tidak
      ditanya lagi tiap kali bikin event baru. */
  planId?: string;
}

export async function POST(request: Request) {
  const clientId = await getSessionClientId();
  if (!clientId) {
    return NextResponse.json({ error: "Belum masuk." }, { status: 401 });
  }

  const repo = getRepo();
  const client = await repo.clients.getById(clientId);
  if (!client) {
    return NextResponse.json({ error: "Belum masuk." }, { status: 401 });
  }

  /**
   * Staff TIDAK punya acara sendiri — perannya mengelola acara milik
   * klien, bukan menyelenggarakan acara.
   *
   * Sebelumnya kebalikannya: keempat penjaga di bawah semuanya
   * di-bypass `!client.isStaff`, sehingga akun staff justru yang paling
   * bebas membuat event tanpa paket dan tanpa batas. Ditolak di sini,
   * di API — bukan sekadar menyembunyikan tombolnya, karena siapa pun
   * bisa memanggil endpoint ini langsung.
   */
  if (client.isStaff) {
    return NextResponse.json(
      {
        error:
          "Akun staff tidak membuat acara. Acara dibuat dari akun klien; staff mengelolanya lewat menu Klien & Acara.",
      },
      { status: 403 }
    );
  }

  // Penegakan SUNGGUHAN jatah "Acara Sendiri" (1 event seumur akun) —
  // AdminDashboard.tsx cuma menyembunyikan tombolnya, tapi itu bisa
  // dilewati siapa pun yang panggil API ini langsung.
  const existingEvents = await repo.events.list(client.id);
  if (client.type === "personal" && existingEvents.length > 0) {
    return NextResponse.json(
      { error: "Akun Acara Sendiri cuma bisa punya 1 event. Hapus event yang ada dulu kalau mau ganti." },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => null)) as CreateEventBody | null;
  if (!body) return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });

  const { identity, slug, themePreset } = body;
  if (!identity?.internalName?.trim() || !identity?.names?.trim() || !slug?.trim()) {
    return NextResponse.json(
      { error: "Nama internal, nama tampil, dan kode acara wajib diisi." },
      { status: 400 }
    );
  }

  if (await repo.events.slugTaken(slug)) {
    return NextResponse.json({ error: "Kode acara ini sudah dipakai event lain." }, { status: 409 });
  }

  // --- Paket: staff dibebaskan, klien sungguhan WAJIB punya satu ---------
  //
  // `needsPlan` bukan "event pertama klien ini" — itu "klien ini BELUM
  // PERNAH memilih paket". Bedanya penting untuk akun lama (dibuat
  // sebelum fitur ini ada) yang sudah punya beberapa event tanpa paket
  // sama sekali: mereka DIMINTA memilih paket saat bikin event
  // BERIKUTNYA, bukan dipaksa mundur mengubah event yang sudah ada.
  const needsPlan = !client.planId;
  let planForThisEvent = client.planId ? planById(client.planId) : undefined;

  if (needsPlan) {
    if (!body.planId) {
      return NextResponse.json(
        { error: "Pilih paket dulu — ini event pertamamu, paket menentukan kuota & masa aktifnya." },
        { status: 400 }
      );
    }
    const chosen = planById(body.planId);
    const audience = client.type === "personal" ? "personal" : "vendor";
    if (!chosen || chosen.audience !== audience) {
      return NextResponse.json(
        {
          error: `Paket tidak dikenali. Pilih salah satu dari: ${plansFor(audience)
            .map((p) => p.name)
            .join(", ")}.`,
        },
        { status: 400 }
      );
    }
    planForThisEvent = chosen;
  }

  // Jatah event Vendor/EO — HANYA diperiksa untuk klien yang sudah punya
  // eventSlotsTotal (dari paket yang dipilih atau add-on "Tambah Jatah
  // Event", lihat lib/services/orderEffects.ts). Belum ada angka =
  // belum pernah dibatasi, dibiarkan lolos (jaring pengaman, bukan jalur
  // normal — begitu `needsPlan` di atas, eventSlotsTotal SELALU terisi).
  if (client.type !== "personal" && client.eventSlotsTotal !== undefined) {
    if (existingEvents.length >= client.eventSlotsTotal) {
      return NextResponse.json(
        {
          error: `Jatah event sudah habis (${existingEvents.length}/${client.eventSlotsTotal}). Beli "Tambah Jatah Event" di halaman Paket & Billing dulu.`,
        },
        { status: 403 }
      );
    }
  }

  // Event baru mulai dari palet POLOS (putih, tanpa animasi) — bukan
  // maroon gelap seperti dulu. Alasannya bukan selera: Visual Builder
  // sekarang memandu klien MENATA dari nol langkah demi langkah, dan
  // memulai dari tema orang lain membuat langkah pertama terasa seperti
  // "menghapus punya orang", bukan mendesain sendiri.
  const preset = (themePreset ? presetById(themePreset) : undefined) ?? presetById(DEFAULT_PRESET_ID) ?? THEME_PRESETS[0];

  const input: NewEvent = {
    clientId: client.id,
    slug: slug.trim(),
    // Sengaja "draft", bukan langsung "live" — event baru belum punya
    // bingkai (frameIds kosong, tab Bingkai belum dibangun), jadi belum
    // siap dibagikan ke tamu sungguhan. Admin naikkan ke "live" sendiri
    // dari tab Publish setelah bingkai siap.
    status: "draft",
    identity: {
      internalName: identity.internalName.trim(),
      kind: identity.kind,
      brandLabel: identity.brandLabel.trim() || "Selamat Datang",
      names: identity.names.trim(),
      date: identity.date || "",
      dateDisplay: identity.dateDisplay.trim() || identity.date || "",
      venue: identity.venue.trim(),
      hashtag: identity.hashtag.trim(),
      greeting: identity.greeting.trim(),
    },
    frameIds: [],
    theme: {
      preset: preset.id,
      colors: preset.colors,
      fontDisplayId: "playfair",
      fontMonoId: "space-mono",
      effects: preset.effects,
      videoCard: preset.videoCard,
    },
    session: DEFAULT_SESSION,
    copy: {},
  };

  const event = await repo.events.create(input);

  const now = new Date();
  // Cabang "staff-internal" dihapus bersama penolakan staff di atas —
  // staff tidak pernah sampai ke titik ini lagi.
  const subscription = await repo.subscriptions.create(
    subscriptionFromPlan(planForThisEvent!, client.id, event.id, now.toISOString())
  );

  // Simpan pilihan paket + jatah event HANYA saat pertama kali dipilih.
  // `Math.max(...)` menggratiskan event lama milik akun migrasi: kalau
  // klien sudah punya 3 event dari sebelum fitur ini ada lalu memilih
  // paket 3-slot untuk event ke-4, jatahnya dinaikkan ke 4 — bukan
  // dikunci di 3 (yang berarti event yang SEDANG dibuat ini sendiri
  // ditolak, kontradiktif: memilih paket sungguhan jadi lebih buruk
  // daripada tidak pilih apa-apa).
  if (needsPlan && planForThisEvent) {
    await repo.clients.update(client.id, {
      planId: planForThisEvent.id,
      eventSlotsTotal:
        client.type === "personal"
          ? undefined
          : Math.max(planForThisEvent.eventSlots, existingEvents.length + 1),
    });

    // Jejak pembayaran paket awal — TIDAK memblokir pemakaian event
    // (kuota di atas sudah aktif), murni supaya staff tahu ada tagihan
    // yang belum dikonfirmasi. Lihat lib/services/orderEffects.ts.
    await repo.orders.create({
      clientId: client.id,
      eventId: event.id,
      kind: "new_plan",
      amount: planForThisEvent.eventSlots,
      priceIdr: planForThisEvent.priceIdr,
      method: "manual_transfer",
    });
  }

  return NextResponse.json({ event, subscription }, { status: 201 });
}
