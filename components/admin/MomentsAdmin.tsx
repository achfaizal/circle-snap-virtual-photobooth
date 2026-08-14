"use client";

import { useEffect, useMemo, useState } from "react";
import JSZip from "jszip";
import { Download, ImageOff, Images, Play, Search, Video, X } from "lucide-react";
import type { Event } from "@/lib/models/event";
import { fetchMoments, type Moment } from "@/lib/moments";
import { downloadBlob } from "@/lib/compositor";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import Spinner from "./Spinner";

/** Nama file di dalam zip — dari nama tamu kalau ada (lebih ramah dibuka
    ulang klien), jatuh balik ke id momen (nomor struk) kalau tidak. Watak
    aneh dibuang supaya tidak merusak struktur zip di sistem file manapun. */
function safeName(m: Moment): string {
  const raw = (m.guestName || m.id).trim();
  const cleaned = raw.replace(/[\\/:*?"<>|]+/g, "-").slice(0, 60);
  return cleaned || m.id;
}

function extOf(url: string): string {
  const q = url.split("?")[0];
  const dot = q.lastIndexOf(".");
  return dot === -1 ? "" : q.slice(dot);
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function MomentCard({ moment, onOpen }: { moment: Moment; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="group relative block w-full overflow-hidden text-left"
      style={{ borderRadius: 16, border: "1px solid var(--a-clr-border)", background: "white" }}
    >
      <div className="relative aspect-square overflow-hidden bg-[var(--a-clr-bg)]">
        {moment.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- momen dari Blob/lokal, bukan aset build
          <img
            src={moment.photoUrl}
            alt=""
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center text-[var(--a-clr-text-muted)]">
            <ImageOff size={22} />
          </div>
        )}
        {moment.videoUrl && (
          <span
            className="absolute bottom-2 right-2 grid place-items-center rounded-full"
            style={{ width: 26, height: 26, background: "rgba(15,23,42,0.75)" }}
          >
            <Play size={12} color="white" />
          </span>
        )}
      </div>
      <div style={{ padding: "8px 10px" }}>
        <p className="truncate" style={{ fontSize: 12.5, fontWeight: 700, color: "#0F172A" }}>
          {moment.guestName || "Tanpa nama"}
        </p>
        <p style={{ fontSize: 10.5, color: "var(--a-clr-text-muted)" }}>{formatWhen(moment.uploadedAt)}</p>
      </div>
    </button>
  );
}

export default function MomentsAdmin({ event }: { event: Event }) {
  const [moments, setMoments] = useState<Moment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Moment | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    let dead = false;
    fetchMoments(event.slug)
      .then((m) => !dead && setMoments(m))
      .catch(() => !dead && setError("Momen belum bisa dimuat. Coba lagi sebentar."));
    return () => {
      dead = true;
    };
  }, [event.slug]);

  const filtered = useMemo(() => {
    if (!moments) return null;
    const q = query.trim().toLowerCase();
    if (!q) return moments;
    return moments.filter((m) => (m.guestName ?? "").toLowerCase().includes(q));
  }, [moments, query]);

  const withPhotoOrVideo = filtered?.filter((m) => m.photoUrl || m.videoUrl) ?? [];

  const downloadAll = async () => {
    if (!moments || moments.length === 0 || bulkProgress) return;
    const files = moments.flatMap((m) => {
      const out: { url: string; name: string }[] = [];
      if (m.photoUrl) out.push({ url: m.photoUrl, name: `${safeName(m)}${extOf(m.photoUrl)}` });
      if (m.videoUrl) out.push({ url: m.videoUrl, name: `${safeName(m)}-video${extOf(m.videoUrl)}` });
      return out;
    });
    if (files.length === 0) {
      showErrorToast("Tidak ada foto/video untuk diunduh.");
      return;
    }

    setBulkProgress({ done: 0, total: files.length });
    try {
      const zip = new JSZip();
      // Nama sama bisa muncul dua kali (dua tamu isi nama yang sama) —
      // beri sufiks angka supaya tidak saling menimpa di dalam zip.
      const usedNames = new Map<string, number>();
      let done = 0;
      for (const f of files) {
        const res = await fetch(f.url);
        if (!res.ok) {
          done += 1;
          setBulkProgress({ done, total: files.length });
          continue;
        }
        const blob = await res.blob();
        let name = f.name;
        const count = usedNames.get(name) ?? 0;
        if (count > 0) {
          const dot = name.lastIndexOf(".");
          name = dot === -1 ? `${name} (${count})` : `${name.slice(0, dot)} (${count})${name.slice(dot)}`;
        }
        usedNames.set(f.name, count + 1);
        zip.file(name, blob);
        done += 1;
        setBulkProgress({ done, total: files.length });
      }
      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, `momen-${event.slug}-${new Date().toISOString().slice(0, 10)}.zip`);
      showSuccessToast(`${files.length} berkas berhasil diunduh dalam satu zip.`);
    } catch {
      showErrorToast("Gagal menyusun zip. Coba lagi — kalau berulang, unduh satu-satu dari galeri.");
    } finally {
      setBulkProgress(null);
    }
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "#0F172A" }}>Momen</h1>
          <p style={{ fontSize: 13, color: "var(--a-clr-text-muted)", fontWeight: 500 }}>
            {moments === null ? "Memuat…" : `${moments.length} momen tersimpan dari tamu.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div style={{ position: "relative" }}>
            <Search
              size={15}
              color="var(--a-clr-text-muted)"
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama tamu…"
              className="admin-input"
              style={{ margin: 0, padding: "9px 12px 9px 34px", width: 220 }}
            />
          </div>
          <button
            onClick={downloadAll}
            disabled={!moments || moments.length === 0 || Boolean(bulkProgress)}
            className="admin-btn admin-btn-primary admin-btn-sm disabled:opacity-50"
          >
            {bulkProgress ? (
              <>
                <Spinner size={13} />
                Menyusun zip… {bulkProgress.done}/{bulkProgress.total}
              </>
            ) : (
              <>
                <Download size={14} />
                Unduh Semua
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{ borderRadius: 12, border: "1px solid #FEE2E2", background: "#FEF2F2", padding: 16, color: "var(--a-clr-danger)", fontSize: 13, fontWeight: 600 }}
        >
          {error}
        </div>
      )}

      {!error && moments === null && (
        <div className="flex items-center justify-center" style={{ minHeight: 300 }}>
          <Spinner size={22} />
        </div>
      )}

      {!error && moments && moments.length === 0 && (
        <div
          className="flex flex-col items-center justify-center text-center"
          style={{ minHeight: 320, gap: 12, borderRadius: 24, border: "1px dashed var(--a-clr-border)", padding: 40 }}
        >
          <span
            className="grid place-items-center rounded-full"
            style={{ width: 64, height: 64, background: "var(--a-clr-primary-light)" }}
          >
            <Images size={28} color="var(--a-clr-primary)" />
          </span>
          <p style={{ fontSize: 16, fontWeight: 800, color: "#0F172A" }}>Belum ada momen</p>
          <p style={{ fontSize: 13, color: "var(--a-clr-text-muted)", maxWidth: 360 }}>
            Begitu tamu selesai sesi foto, hasilnya otomatis muncul di sini — tidak perlu diunggah manual.
          </p>
        </div>
      )}

      {!error && moments && moments.length > 0 && filtered && filtered.length === 0 && (
        <p style={{ textAlign: "center", padding: 40, color: "var(--a-clr-text-muted)", fontSize: 13 }}>
          Tidak ada momen dari tamu bernama "{query}".
        </p>
      )}

      {filtered && filtered.length > 0 && (
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
          {filtered.map((m) => (
            <MomentCard key={m.id} moment={m} onOpen={() => setActive(m)} />
          ))}
        </div>
      )}

      {withPhotoOrVideo.length < (filtered?.length ?? 0) && (
        <p style={{ fontSize: 11, color: "var(--a-clr-text-muted)", marginTop: 12 }}>
          {(filtered?.length ?? 0) - withPhotoOrVideo.length} momen tanpa berkas media (baru sebagian terunggah).
        </p>
      )}

      {active && (
        <div
          className="fixed inset-0 z-[120] grid place-items-center p-6"
          style={{ background: "rgba(15,23,42,0.75)", backdropFilter: "blur(4px)" }}
          onClick={() => setActive(null)}
        >
          <div className="relative max-w-lg" onClick={(e) => e.stopPropagation()}>
            {active.videoUrl ? (
              <video src={active.videoUrl} controls autoPlay playsInline className="max-h-[80vh] w-full rounded-2xl" />
            ) : active.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={active.photoUrl} alt="" className="max-h-[80vh] w-full rounded-2xl object-contain" />
            ) : (
              <div className="grid h-64 w-64 place-items-center rounded-2xl bg-white">
                <Video size={28} color="var(--a-clr-text-muted)" />
              </div>
            )}
            <button
              onClick={() => setActive(null)}
              aria-label="Tutup"
              className="absolute grid place-items-center rounded-full bg-white"
              style={{ top: -12, right: -12, width: 32, height: 32, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}
            >
              <X size={16} color="#0F172A" />
            </button>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-white px-4 py-3">
              <div>
                <p style={{ fontSize: 13, fontWeight: 800, color: "#0F172A" }}>
                  {active.guestName || "Tanpa nama"}
                </p>
                <p style={{ fontSize: 11, color: "var(--a-clr-text-muted)" }}>{formatWhen(active.uploadedAt)}</p>
              </div>
              <div className="flex gap-2">
                {active.photoUrl && (
                  <a href={active.photoUrl} download className="admin-btn admin-btn-outline admin-btn-sm">
                    <Download size={12} /> Foto
                  </a>
                )}
                {active.videoUrl && (
                  <a href={active.videoUrl} download className="admin-btn admin-btn-outline admin-btn-sm">
                    <Download size={12} /> Video
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
