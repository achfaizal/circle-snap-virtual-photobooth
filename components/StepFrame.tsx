"use client";

import { useState } from "react";
import { tokensFor } from "@/lib/event";
import { TEMPLATES } from "@/lib/templates";
import { useSession } from "@/lib/store";
import { ChevronLeft, ChevronRight } from "./icons";

export default function StepFrame() {
  const { event, chooseTemplate } = useSession();
  const [index, setIndex] = useState(0);

  if (!event) return null;

  const allowed = TEMPLATES.filter((t) => event.allowedTemplates.includes(t.id));
  const tokens = tokensFor(event);
  const active = allowed[index];

  // Muter melingkar — cuma ada 2-3 pilihan per event, jadi "next" dari yang
  // terakhir wajar balik ke yang pertama, bukan tombol mati.
  const prev = () => setIndex((i) => (i - 1 + allowed.length) % allowed.length);
  const next = () => setIndex((i) => (i + 1) % allowed.length);

  if (!active) return null;

  return (
    <section className="step-enter mx-auto max-w-md">
      <p className="max-w-lg text-[15px] leading-relaxed text-smoke">
        {event.greeting}
      </p>

      <div className="mt-4 flex items-center gap-3">
        {allowed.length > 1 && (
          <button
            onClick={prev}
            aria-label="Bingkai sebelumnya"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-smoke ring-1 ring-edge transition hover:text-paper hover:ring-flash"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        <div className="min-w-0 flex-1">
          <button
            key={active.id}
            onClick={() => chooseTemplate(active)}
            className="frame-slide-in group block w-full text-left focus-visible:outline-none"
          >
            <div
              className="relative mx-auto max-h-[30dvh] w-auto max-w-[260px] overflow-hidden rounded-2xl ring-1 ring-edge transition group-hover:ring-flash group-focus-visible:ring-flash"
              style={{ aspectRatio: `${active.width} / ${active.height}` }}
            >
              {/* Arsir menandai lubang tempat foto akan jatuh. */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(45deg, #2E2658 0 6px, #1E1B4B 6px 12px)",
                }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={active.overlay}
                alt=""
                className="relative h-full w-full object-contain"
              />
            </div>
          </button>
        </div>

        {allowed.length > 1 && (
          <button
            onClick={next}
            aria-label="Bingkai berikutnya"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-smoke ring-1 ring-edge transition hover:text-paper hover:ring-flash"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>

      <div key={`${active.id}-info`} className="frame-slide-in mt-3 text-center">
        <h3 className="font-display text-base leading-tight tracking-tight">{active.name}</h3>
        <p className="mt-1 font-mono text-[10px] text-smoke">
          {active.slots.length} foto · {active.printSize}
        </p>
        <p className="mx-auto mt-1.5 max-w-xs text-[13px] leading-snug text-smoke">
          {active.blurb}
        </p>
      </div>

      {allowed.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2">
          {allowed.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setIndex(i)}
              aria-label={`Lihat bingkai ${t.name}`}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-6 brand-gradient" : "w-1.5 bg-edge"
              }`}
            />
          ))}
        </div>
      )}

      <button
        onClick={() => chooseTemplate(active)}
        className="btn-primary mt-4 w-full rounded-full py-3.5 font-display text-base tracking-tight text-ink"
      >
        Pilih bingkai ini
      </button>

      {allowed.some((t) => t.textLayers.length > 0) && (
        <p className="mt-4 rounded-2xl p-3 font-mono text-[11px] leading-relaxed text-smoke ring-1 ring-edge">
          Nama <span className="text-paper">{tokens.names}</span> dan tanggalnya
          dicetak otomatis di setiap bingkai. Tidak ada file terpisah per acara —
          satu bingkai melayani semua event.
        </p>
      )}
    </section>
  );
}
