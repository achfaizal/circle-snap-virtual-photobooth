"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { EventConfig } from "@/lib/event";
import { themeVars } from "@/lib/event";
import { fetchMoments, type Moment } from "@/lib/moments";
import { resolveCopy } from "@/lib/copy";
import { Play, Video, X } from "./icons";

/** Satu kartu momen — kalau ada video, VIDEO itu yang tampil sebagai
    thumbnail (bukan foto), karena itu yang sebenarnya jadi hasil akhir
    tamu itu (foto dijahit + suaranya). Foto polos cuma dipakai kalau
    memang tidak ada rekaman suara. Tidak ada crop paksa ke rasio tertentu
    — bingkainya harus kelihatan utuh, biar kartu jadi lebih tinggi/pendek
    tergantung bentuk aslinya. */
function MomentCard({ moment, onOpen }: { moment: Moment; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="group block w-full text-left">
      <div className="relative overflow-hidden rounded-xl">
        {moment.videoUrl ? (
          <video
            src={moment.videoUrl}
            muted
            playsInline
            preload="metadata"
            className="block h-auto w-full transition group-hover:scale-105"
          />
        ) : moment.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={moment.photoUrl}
            alt=""
            className="block h-auto w-full transition group-hover:scale-105"
          />
        ) : (
          <div className="grid aspect-[3/4] w-full place-items-center bg-film text-smoke">
            <Video className="h-6 w-6" />
          </div>
        )}
        {moment.videoUrl && (
          <span className="pointer-events-none absolute bottom-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-ink/80 text-paper">
            <Play className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      {/* Nama tamu (kalau diisi) — supaya pengantin tahu momen ini dari
          siapa waktu menelusuri galeri, bukan cuma tumpukan foto anonim. */}
      {moment.guestName && (
        <p className="tracked mt-1.5 truncate px-0.5 font-mono text-[9px] text-smoke">
          dari {moment.guestName}
        </p>
      )}
    </button>
  );
}

/** Galeri semua momen tamu di event ini — foto & video digabung jadi satu
    feed, urut terbaru dulu. Ditampilkan sebagai overlay penuh layar dari
    StepResult, bukan step tersendiri, supaya tamu tetap gampang balik ke
    struk/unduhan mereka sendiri. */
export default function MomentsGallery({
  event,
  onClose,
}: {
  event: EventConfig;
  onClose: () => void;
}) {
  const [moments, setMoments] = useState<Moment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<Moment | null>(null);
  const [mounted, setMounted] = useState(false);
  const copy = resolveCopy(
    { names: event.names, date: event.date, venue: event.venue, hashtag: event.hashtag },
    event.copy
  );

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let dead = false;
    fetchMoments(event.code)
      .then((m) => !dead && setMoments(m))
      .catch(() => !dead && setError("Momen belum bisa dimuat. Coba lagi sebentar."));
    return () => {
      dead = true;
    };
  }, [event.code]);

  // Elemen langkah (StepResult dkk.) punya animasi masuk (step-enter) yang
  // meninggalkan `transform` terpasang permanen (fill-mode both) — itu
  // diam-diam membuat "containing block" baru untuk descendant
  // position:fixed, jadi overlay ini jadi terjebak di dalam kotak section
  // alih-alih menutupi seluruh layar. Portal ke document.body melewati
  // masalah itu sepenuhnya, sekalian praktik standar untuk modal.
  //
  // Konsekuensinya: portal keluar dari wrapper tema EventBooth juga, jadi
  // CSS variable warna tema (--color-ink dkk, di-set inline lewat style di
  // wrapper itu) TIDAK ikut terbawa — bukan relasi ancestor-descendant DOM
  // lagi. Root di sini harus menerapkan themeVars sendiri supaya warnanya
  // tetap sesuai tema acara, bukan jatuh ke warna default global.
  if (!mounted) return null;

  const decorUrl = event.theme?.decorUrl;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col bg-ink"
      style={event.theme ? themeVars(event.theme) : undefined}
    >
      {/* Bunga sudut yang sama dengan sesi lain — supaya galeri ini terasa
          jadi bagian dari acara yang sama, bukan halaman generik terpisah.
          z-0 + header/konten di-z-10 supaya dekorasi (position:absolute,
          jadi ikut naik ke lapisan "positioned" terlepas dari urutan DOM)
          tidak malah menutupi isi galeri. */}
      {decorUrl && (
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={decorUrl}
            alt=""
            className="absolute left-0 top-0 w-24 opacity-80 sm:w-36"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={decorUrl}
            alt=""
            className="absolute right-0 top-0 w-24 -scale-x-100 opacity-80 sm:w-36"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={decorUrl}
            alt=""
            className="absolute bottom-0 left-0 w-24 -scale-y-100 opacity-70 sm:w-36"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={decorUrl}
            alt=""
            className="absolute bottom-0 right-0 w-24 -scale-x-100 -scale-y-100 opacity-70 sm:w-36"
          />
        </div>
      )}

      <header className="relative z-10 flex shrink-0 items-start gap-3 border-b border-edge bg-ink/80 px-4 py-4 backdrop-blur-sm">
        <div className="w-9 shrink-0" />
        <div className="flex-1 text-center">
          <p className="text-brand-gradient font-display text-lg font-semibold leading-tight tracking-tight sm:text-xl">
            {event.brandLabel ?? "Happy Wedding"}
          </p>
          <h2 className="mt-1 truncate font-display text-base leading-tight tracking-tight text-smoke">
            {event.names}
          </h2>
          <p className="tracked mt-1.5 font-mono text-[10px] text-smoke">{copy.momentsTitle}</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Tutup"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-paper ring-1 ring-edge transition hover:text-flash"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="relative z-10 flex-1 overflow-y-auto p-4">
        {error && <p className="mt-10 text-center text-sm text-live">{error}</p>}

        {!error && moments === null && (
          <p className="mt-10 text-center font-mono text-[11px] text-smoke">
            memuat momen…
          </p>
        )}

        {moments && moments.length === 0 && (
          <p className="mx-auto mt-10 max-w-xs text-center text-sm leading-relaxed text-smoke">
            {copy.momentsEmpty}
          </p>
        )}

        {moments && moments.length > 0 && (
          // columns (bukan grid) supaya tinggi kartu tidak dipaksa sama rata
          // per baris — bingkai potret panjang beda-beda tinggi, jadi biarkan
          // menyusun sendiri jadi tampilan zigzag, bukan grid rapi berjajar.
          <div className="columns-2 gap-3 sm:columns-3">
            {moments.map((m) => (
              <div key={m.id} className="mb-3 break-inside-avoid">
                <MomentCard moment={m} onOpen={() => setActive(m)} />
              </div>
            ))}
          </div>
        )}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-ink/95 p-6"
          onClick={() => setActive(null)}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            {active.videoUrl ? (
              <video
                src={active.videoUrl}
                controls
                autoPlay
                playsInline
                className="max-h-[85dvh] max-w-full rounded-2xl"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={active.photoUrl}
                alt=""
                className="max-h-[85dvh] max-w-full rounded-2xl"
              />
            )}
            <button
              onClick={() => setActive(null)}
              aria-label="Tutup"
              className="absolute -right-3 -top-3 grid h-9 w-9 place-items-center rounded-full bg-ink text-paper ring-1 ring-edge transition hover:text-flash"
            >
              <X className="h-4 w-4" />
            </button>
            {active.guestName && (
              <p className="tracked mt-3 text-center font-mono text-[10px] text-smoke">
                dari {active.guestName}
              </p>
            )}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
