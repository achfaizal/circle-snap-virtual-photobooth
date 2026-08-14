import { list } from "@vercel/blob";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

/**
 * Tidak ada database — daftar momen dibangun langsung dari nama file yang
 * tersimpan (prefix per event code), baik dari Vercel Blob (production)
 * maupun folder lokal (dev, lihat app/api/moments/config). Foto & video
 * satu momen yang sama berbagi nama dasar (momentId = nomor struk tamu,
 * sudah unik per event), jadi cukup dikelompokkan dari ekstensinya. Nama
 * tamu (kalau diisi) tersimpan sebagai sidecar `{momentId}.json` terpisah —
 * lihat lib/moments.ts uploadToBlob/uploadToLocal.
 */
interface Moment {
  id: string;
  photoUrl?: string;
  videoUrl?: string;
  uploadedAt: string;
  guestName?: string;
}

interface RawEntry {
  photoUrl?: string;
  videoUrl?: string;
  uploadedAt: string;
  guestName?: string;
  /** Nama file sidecar JSON, belum dibaca isinya — diselesaikan belakangan
      lewat finalizeMoments() supaya bisa dibaca paralel (Promise.all),
      bukan satu-satu berurutan. */
  jsonName?: string;
}

function groupByMomentId(
  names: string[],
  urlFor: (name: string) => string,
  uploadedAtFor: (name: string) => string
): Map<string, RawEntry> {
  const groups = new Map<string, RawEntry>();
  for (const name of names) {
    const dot = name.lastIndexOf(".");
    if (dot === -1) continue;
    const id = name.slice(0, dot);
    const ext = name.slice(dot + 1).toLowerCase();
    const uploadedAt = uploadedAtFor(name);

    const entry = groups.get(id) ?? { uploadedAt };
    if (ext === "png" || ext === "jpg" || ext === "jpeg") entry.photoUrl = urlFor(name);
    if (ext === "mp4" || ext === "webm") entry.videoUrl = urlFor(name);
    if (ext === "json") entry.jsonName = name;
    if (uploadedAt > entry.uploadedAt) entry.uploadedAt = uploadedAt;
    groups.set(id, entry);
  }
  return groups;
}

/** Membaca nama tamu dari tiap sidecar JSON secara paralel, lalu merangkai
    hasil akhirnya. Gagal baca satu file (rusak/hilang) tidak menjatuhkan
    seluruh daftar — momen itu tetap tampil, cuma tanpa nama. */
async function finalizeMoments(
  groups: Map<string, RawEntry>,
  readName: (jsonName: string) => Promise<string | undefined>
): Promise<Moment[]> {
  const entries = Array.from(groups.entries());
  await Promise.all(
    entries.map(async ([, entry]) => {
      if (!entry.jsonName) return;
      entry.guestName = await readName(entry.jsonName).catch(() => undefined);
    })
  );

  return entries
    .map(([id, v]) => ({
      id,
      photoUrl: v.photoUrl,
      videoUrl: v.videoUrl,
      uploadedAt: v.uploadedAt,
      guestName: v.guestName,
    }))
    .sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
}

function parseName(raw: string): string | undefined {
  const data = JSON.parse(raw) as { name?: string };
  return data.name || undefined;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventCode = searchParams.get("event")?.toUpperCase();
  if (!eventCode) {
    return NextResponse.json({ error: "Parameter event wajib diisi." }, { status: 400 });
  }

  if (process.env.VERCEL) {
    const prefix = `moments/${eventCode}/`;
    // list() Vercel Blob dibatasi 1000 per panggilan — event ramai (banyak
    // tamu, tiap momen 2-3 file) gampang lewat itu. Ambil semua halaman
    // lewat cursor, bukan cuma panggilan pertama, supaya momen lama tidak
    // "hilang" diam-diam dari galeri begitu jumlah file makin banyak.
    const blobs: Awaited<ReturnType<typeof list>>["blobs"] = [];
    let cursor: string | undefined;
    do {
      const page = await list({ prefix, limit: 1000, cursor });
      blobs.push(...page.blobs);
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    const groups = groupByMomentId(
      blobs.map((b) => b.pathname.slice(prefix.length)),
      (name) => blobs.find((b) => b.pathname === `${prefix}${name}`)!.url,
      (name) => {
        const uploadedAt = blobs.find((b) => b.pathname === `${prefix}${name}`)!.uploadedAt;
        return uploadedAt instanceof Date ? uploadedAt.toISOString() : String(uploadedAt);
      }
    );
    const moments = await finalizeMoments(groups, async (jsonName) => {
      const url = blobs.find((b) => b.pathname === `${prefix}${jsonName}`)!.url;
      const res = await fetch(url);
      if (!res.ok) return undefined;
      return parseName(await res.text());
    });
    return NextResponse.json({ moments });
  }

  // Mode local dev — baca langsung dari public/moments-local/{event}/.
  const dir = path.join(process.cwd(), "public", "moments-local", eventCode);
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return NextResponse.json({ moments: [] });
  }

  const stats = new Map<string, Date>();
  await Promise.all(
    files.map(async (f) => {
      const s = await stat(path.join(dir, f));
      stats.set(f, s.mtime);
    })
  );

  const groups = groupByMomentId(
    files,
    (name) => `/moments-local/${eventCode}/${name}`,
    (name) => (stats.get(name) ?? new Date(0)).toISOString()
  );
  const moments = await finalizeMoments(groups, async (jsonName) =>
    parseName(await readFile(path.join(dir, jsonName), "utf-8"))
  );
  return NextResponse.json({ moments });
}
