import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireAccountRole } from "@/lib/clientAuth";
import { getAccountById } from "@/lib/db/queries/accounts";
import { getCategory } from "@/lib/db/queries/categories";
import { getPackageById } from "@/lib/db/queries/packages";
import { createOrder } from "@/lib/db/queries/purchaseOrders";
import { allocateWalletToEvent, getActiveDaysOptionsForAccount, getWalletBalance } from "@/lib/db/queries/allocation";
import { defaultSessionConfig } from "@/lib/services/defaultSessionConfig";
import { slugify } from "@/lib/slug";
import { db } from "@/lib/db/client";
import { events } from "@/lib/db/schema/events";

interface CreateEventBody {
  categoryId?: string;
  internalName?: string;
  startsAt?: string;
  timezone?: string;
  venue?: string;
  // Perorangan
  packageId?: string;
  // Vendor
  allocateStrips?: number;
  activeDays?: number;
}

/**
 * Buat acara BARU (Tahap 3, dok 05 §4 wizard langkah 1-3). Manager ke
 * atas boleh (dok 01 §3.2: "Manager boleh buat & ubah acara"; Operator
 * tidak). D-01 TERCABUT di sini secara harfiah — TIDAK ADA pengecekan
 * "akun personal sudah punya acara" sama sekali, beda dari
 * app/api/admin/events/route.ts (JSON) lama.
 *
 * Cabang dok 05 §4 langkah 3:
 * - Perorangan: pilih paket → event `draft` + Order `awaiting_payment`
 *   (belum lunas TIDAK memblokir menyiapkan acara, cuma memblokir
 *   publikasi — gerbang 11 poin, Langkah 9).
 * - Vendor: alokasi langsung dari saldo dompet (jurnal `allocation`,
 *   tanpa Order) + pilih masa aktif dari daftar paket yang PERNAH
 *   dibeli & lunas akun ini (keputusan pemilik produk — dompet bisa
 *   campuran strip dari beberapa pembelian beda masa aktif, tidak
 *   ditebak dari yang terakhir).
 */
export async function POST(request: Request) {
  const guard = await requireAccountRole("manager");
  if (guard instanceof NextResponse) return guard;

  const body = (await request.json().catch(() => null)) as CreateEventBody | null;
  if (!body) return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });

  const internalName = body.internalName?.trim() ?? "";
  const timezone = body.timezone?.trim() || "Asia/Jakarta";
  const venue = body.venue?.trim() || null;

  if (!body.categoryId) {
    return NextResponse.json({ error: "Pilih kategori acara." }, { status: 400 });
  }
  if (!internalName) {
    return NextResponse.json({ error: "Nama internal acara wajib diisi." }, { status: 400 });
  }
  if (!body.startsAt) {
    return NextResponse.json({ error: "Jadwal mulai wajib diisi." }, { status: 400 });
  }
  const startsAt = new Date(body.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: "Jadwal mulai tidak valid." }, { status: 400 });
  }

  const category = await getCategory(body.categoryId);
  if (!category || category.status !== "active") {
    return NextResponse.json({ error: "Kategori acara tidak ditemukan atau sudah diarsipkan." }, { status: 400 });
  }

  const account = await getAccountById(guard.accountId);
  if (!account) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });

  const slug = await uniqueEventSlug(internalName);

  if (account.type === "personal") {
    if (!body.packageId) {
      return NextResponse.json({ error: "Pilih paket dulu." }, { status: 400 });
    }
    const pkg = await getPackageById(body.packageId);
    if (!pkg || pkg.status !== "published") {
      return NextResponse.json({ error: "Paket tidak ditemukan atau belum diterbitkan." }, { status: 400 });
    }
    if (pkg.audience !== "personal" && pkg.audience !== "both") {
      return NextResponse.json({ error: "Paket ini bukan untuk akun perorangan." }, { status: 400 });
    }
    if (pkg.allocationMode !== "single_event") {
      // P-04 seharusnya sudah menjamin ini di level paket — dicek lagi
      // di sini supaya pesannya jelas kalau suatu saat ada data lama
      // yang lolos dari CHECK (mis. migrasi), bukan cuma percaya CHECK DB.
      return NextResponse.json({ error: "Paket perorangan wajib bertipe single_event (P-04)." }, { status: 400 });
    }

    const [event] = await db
      .insert(events)
      .values({
        accountId: account.id,
        createdByUserId: guard.userId,
        categoryId: category.id,
        internalName,
        slug,
        venue,
        startsAt,
        timezone,
        activeDays: pkg.activeDays,
        sessionConfig: defaultSessionConfig(),
      })
      .returning();

    const order = await createOrder({
      accountId: account.id,
      createdByUserId: guard.userId,
      packageId: pkg.id,
      targetEventId: event.id,
      paymentMethod: "manual_transfer",
    });

    return NextResponse.json({ ok: true, event, order }, { status: 201 });
  }

  // Vendor
  const allocateStrips = body.allocateStrips;
  if (!allocateStrips || !Number.isInteger(allocateStrips) || allocateStrips <= 0) {
    return NextResponse.json({ error: "Jumlah strip yang dialokasikan harus bilangan bulat positif." }, { status: 400 });
  }
  const walletBalance = await getWalletBalance(account.id);
  if (walletBalance < allocateStrips) {
    return NextResponse.json(
      { error: `Saldo dompet tidak cukup (sisa ${walletBalance} strip). Isi ulang dulu di Billing.` },
      { status: 400 }
    );
  }

  const activeDaysOptions = await getActiveDaysOptionsForAccount(account.id);
  const chosenActiveDays = activeDaysOptions.find((o) => o.activeDays === body.activeDays);
  if (!chosenActiveDays) {
    return NextResponse.json(
      { error: "Masa aktif tidak valid — pilih salah satu dari paket yang pernah kamu beli." },
      { status: 400 }
    );
  }

  const [event] = await db
    .insert(events)
    .values({
      accountId: account.id,
      createdByUserId: guard.userId,
      categoryId: category.id,
      internalName,
      slug,
      venue,
      startsAt,
      timezone,
      activeDays: chosenActiveDays.activeDays,
      sessionConfig: defaultSessionConfig(),
    })
    .returning();

  const allocation = await allocateWalletToEvent(account.id, event.id, allocateStrips, guard.userId);
  if (!allocation.ok) {
    // Race jarang (saldo berubah antara cek di atas dan transaksi ini,
    // mis. alokasi lain jalan bersamaan) — event yang SUDAH dibuat
    // dibiarkan (draft, boleh dihapus/diedit klien), bukan digagalkan
    // total, supaya isian wizard tidak hilang percuma.
    return NextResponse.json(
      { error: "Saldo dompet berubah saat diproses — acara tersimpan sebagai draft, coba alokasikan lagi dari halaman acara.", event },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true, event, wallet: allocation }, { status: 201 });
}

async function uniqueEventSlug(input: string): Promise<string> {
  const base = slugify(input) || "acara";
  let candidate = base;
  for (let i = 0; i < 5; i++) {
    const [row] = await db.select({ id: events.id }).from(events).where(eq(events.slug, candidate)).limit(1);
    if (!row) return candidate;
    candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${base}-${Date.now()}`;
}
