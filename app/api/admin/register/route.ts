import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, createSessionToken, hashPassword } from "@/lib/adminAuth";
import { getRepo } from "@/lib/repo";
import type { Client } from "@/lib/models/client";

interface RegisterBody {
  name?: string;
  email?: string;
  password?: string;
  mode?: Client["type"];
  whatsapp?: string;
  businessName?: string;
}

/**
 * Normalisasi nomor WhatsApp ke bentuk 62xxxxxxxxxx.
 *
 * Orang Indonesia menulis nomornya bermacam-macam: "0812-3456-7890",
 * "+62 812 3456 7890", "(0812) 34567890". Kalau disimpan apa adanya,
 * staff harus menebak-nebak dan tombol "hubungi via WA" tidak bisa
 * dibangun di atasnya. Disimpan satu bentuk, ditampilkan bebas.
 */
function normalizeWhatsapp(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  let n = digits;
  if (n.startsWith("62")) n = n.slice(2);
  else if (n.startsWith("0")) n = n.slice(1);
  // Nomor seluler Indonesia: 9–13 digit setelah kode negara.
  if (n.length < 9 || n.length > 13) return null;
  if (!n.startsWith("8")) return null; // seluler selalu diawali 8
  return `62${n}`;
}

/** Pendaftaran klien BARU — sebelumnya halaman Daftar (app/admin/
    register/page.tsx) cuma menampilkan toast "belum tersedia", sekarang
    sungguhan membuat Client. `mode` ("personal"/"vendor") disimpan apa
    adanya sebagai Client.type — itu yang nanti dibaca AdminShell/
    AdminDashboard untuk menampilkan-atau-tidak panel "Event Aktif" dan
    membatasi jumlah event (penegakan SUNGGUHAN ada di
    app/api/admin/events/route.ts, bukan cuma disembunyikan di sini). */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as RegisterBody | null;
  if (!body) return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const mode = body.mode;
  const businessName = body.businessName?.trim() ?? "";

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Nama, email, dan password wajib diisi." }, { status: 400 });
  }
  if (mode !== "personal" && mode !== "vendor") {
    return NextResponse.json({ error: "Pilih dulu kamu daftar sebagai apa." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password minimal 8 karakter." }, { status: 400 });
  }

  // WhatsApp WAJIB untuk pendaftaran baru — tanpa nomor ini staff tidak
  // punya cara membalas klien yang mengirim bukti transfer.
  const whatsapp = normalizeWhatsapp(body.whatsapp ?? "");
  if (!whatsapp) {
    return NextResponse.json(
      { error: "Nomor WhatsApp tidak valid. Contoh: 0812-3456-7890." },
      { status: 400 }
    );
  }

  // Vendor menjual atas nama usaha; nama PIC saja tidak cukup untuk
  // tagihan maupun daftar klien di panel staff.
  if (mode === "vendor" && !businessName) {
    return NextResponse.json({ error: "Nama usaha/EO wajib diisi." }, { status: 400 });
  }
  // Validasi format email longgar (cuma "ada @ dan domain") — sengaja
  // tidak regex ketat, banyak email valid ditolak regex "lengkap".
  if (!email.includes("@") || !email.includes(".")) {
    return NextResponse.json({ error: "Format email tidak valid." }, { status: 400 });
  }

  const repo = getRepo();
  const existing = await repo.clients.getByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "Email ini sudah terdaftar. Coba masuk." }, { status: 409 });
  }

  const client = await repo.clients.create({
    name,
    email,
    type: mode,
    whatsapp,
    ...(mode === "vendor" ? { businessName } : {}),
    passwordHash: hashPassword(password),
    isStaff: false,
  });

  const res = NextResponse.json({ ok: true, client: { id: client.id, name: client.name, type: client.type } }, { status: 201 });
  // Langsung masuk (bukan minta login ulang) — sama seperti alur "daftar
  // lalu langsung ke dashboard" di kebanyakan produk nyata.
  res.cookies.set(ADMIN_COOKIE_NAME, createSessionToken(client.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
