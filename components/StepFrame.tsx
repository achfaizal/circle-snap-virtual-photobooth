"use client";

import { tokensFor } from "@/lib/event";
import { TEMPLATES } from "@/lib/templates";
import { useSession } from "@/lib/store";

export default function StepFrame() {
  const { event, chooseTemplate } = useSession();
  if (!event) return null;

  const allowed = TEMPLATES.filter((t) => event.allowedTemplates.includes(t.id));
  const tokens = tokensFor(event);

  return (
    <section>
      <p className="max-w-lg text-[15px] leading-relaxed text-smoke">
        {event.greeting}
      </p>

      <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-7">
        {allowed.map((t) => (
          <li key={t.id}>
            <button
              onClick={() => chooseTemplate(t)}
              className="group block w-full text-left focus-visible:outline-none"
            >
              <div
                className="relative overflow-hidden rounded-2xl ring-1 ring-edge transition group-hover:-translate-y-0.5 group-hover:ring-flash group-focus-visible:ring-flash"
                style={{ aspectRatio: `${t.width} / ${t.height}` }}
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
                  src={t.overlay}
                  alt=""
                  className="relative h-full w-full object-contain"
                />
              </div>

              <h3 className="mt-3.5 font-display text-base leading-tight tracking-tight">
                {t.name}
              </h3>
              <p className="mt-1 font-mono text-[10px] text-smoke">
                {t.slots.length} foto · {t.printSize}
              </p>
              <p className="mt-2 text-[13px] leading-snug text-smoke">{t.blurb}</p>
            </button>
          </li>
        ))}
      </ul>

      {allowed.some((t) => t.textLayers.length > 0) && (
        <p className="mt-10 max-w-lg rounded-2xl p-4 font-mono text-[11px] leading-relaxed text-smoke ring-1 ring-edge">
          Nama <span className="text-paper">{tokens.names}</span> dan tanggalnya
          dicetak otomatis di setiap bingkai. Tidak ada file terpisah per acara —
          satu bingkai melayani semua event.
        </p>
      )}
    </section>
  );
}
