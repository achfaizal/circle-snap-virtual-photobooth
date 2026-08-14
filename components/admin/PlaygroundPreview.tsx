"use client";

import { useEffect, useRef, useState } from "react";
import { EVENT_SAVED } from "@/lib/utils";

/**
 * Preview langsung playground di dalam bingkai ponsel virtual.
 *
 * BUKAN mockup — ini <iframe> ke rute publik `/e/{slug}` yang PERSIS
 * sama dengan yang dibuka tamu lewat QR code (prinsip P3, docs/blueprint/
 * 00-ikhtisar.md: "preview = kenyataan"). Ukuran iframe 390×844 (viewport
 * iPhone 12/13/14) memberi iframe konteks viewport sendiri sebesar itu,
 * jadi tata letak responsif halaman otomatis reflow ke bentuk mobile
 * tanpa perlu trik emulasi apa pun.
 *
 * Kamera & mikrofon TIDAK di-mock (beda dari rancangan penuh di
 * docs/blueprint/03-spesifikasi-admin.md yang mematikan kamera di mode
 * preview) — iframe ini playground sungguhan, jadi izin kamera akan
 * diminta kalau admin lanjut sampai ke langkah Foto. Cukup untuk
 * memeriksa Info/Tema/Sesi (semua terlihat dari layar Selamat Datang),
 * step-picker tanpa kamera nyata adalah peningkatan lanjutan.
 */
export default function PlaygroundPreview({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const src = `/e/${encodeURIComponent(slug)}`;

  const reload = () => setReloadToken((t) => t + 1);

  // Memuat ulang sendiri begitu ada editor yang berhasil menyimpan —
  // iframe menunjuk rute publik, ia tidak punya cara tahu data server
  // berubah. Lihat catatan EVENT_SAVED di lib/utils.ts.
  useEffect(() => {
    const onSaved = () => setReloadToken((t) => t + 1);
    window.addEventListener(EVENT_SAVED, onSaved);
    return () => window.removeEventListener(EVENT_SAVED, onSaved);
  }, []);

  const phone = (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2 text-xs font-medium text-[var(--a-clr-text-muted)]">
        <span>Pratinjau tamu (mobile)</span>
        <button
          onClick={reload}
          className="rounded-full px-2 py-0.5 ring-1 ring-[var(--a-clr-border)] transition hover:text-[var(--a-clr-primary)]"
        >
          Muat ulang
        </button>
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="rounded-full px-2 py-0.5 ring-1 ring-[var(--a-clr-border)] transition hover:text-[var(--a-clr-primary)]"
        >
          Tab baru ↗
        </a>
      </div>
      <div
        className="overflow-hidden rounded-[2.2rem] border-[8px] border-black bg-black shadow-2xl"
        style={{ width: 344, height: 720 }}
      >
        {/* `key` memaksa remount penuh setelah ada penyimpanan — iframe
            tidak tahu data server berubah, jadi harus dipaksa reload. */}
        <iframe
          ref={iframeRef}
          key={reloadToken}
          src={src}
          className="h-full w-full rounded-[1.6rem] bg-white"
          title="Pratinjau playground (mobile)"
        />
      </div>
    </div>
  );

  return (
    <>
      {/* Kolom tetap di layar lebar (docs/blueprint/03: "kiri form, kanan
          preview hidup"). */}
      <div className="hidden xl:block">{phone}</div>

      {/* Tombol mengambang di layar sempit — "preview jadi tombol
          mengambang 'Lihat Preview'" per spesifikasi yang sama. */}
      <div className="xl:hidden">
        <button onClick={() => setOpen(true)} className="admin-btn admin-btn-primary fixed bottom-5 right-5 z-30 shadow-2xl">
          Lihat Preview
        </button>
        {open && (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setOpen(false)}
          >
            <div onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-3">
              {phone}
              <button
                onClick={() => setOpen(false)}
                className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-[var(--a-clr-text-muted)] ring-1 ring-[var(--a-clr-border)] hover:text-[#0F172A]"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
