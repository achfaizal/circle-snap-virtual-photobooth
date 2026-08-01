"use client";

import type { EventConfig } from "@/lib/event";

/** Inisial dari "Salma & Faizal" -> "S · F". Dipakai di monogram. */
function initials(names: string): string {
  return names
    .split("&")
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .join(" · ");
}

/** Kelopak bunga yang jatuh mengambang — posisi, ukuran, warna, dan waktu
    sengaja dibuat beda-beda per kelopak supaya gerakannya terasa organik,
    bukan berbaris rapi. */
const PETALS = [
  { left: "6%", size: 12, color: "var(--color-flash)", duration: "9s", delay: "0s" },
  { left: "18%", size: 9, color: "var(--color-brand-gold)", duration: "12s", delay: "2.5s" },
  { left: "34%", size: 15, color: "var(--color-flash)", duration: "8.5s", delay: "5s" },
  { left: "52%", size: 10, color: "var(--color-brand-purple)", duration: "11s", delay: "1s" },
  { left: "68%", size: 13, color: "var(--color-brand-gold)", duration: "10s", delay: "3.5s" },
  { left: "82%", size: 9, color: "var(--color-flash)", duration: "13s", delay: "6s" },
  { left: "92%", size: 12, color: "var(--color-brand-purple)", duration: "9.5s", delay: "4s" },
];

export default function WelcomeScreen({
  event,
  onEnter,
}: {
  event: EventConfig;
  onEnter: () => void;
}) {
  return (
    <div className="relative flex min-h-[calc(100dvh-3rem)] flex-col items-center justify-center overflow-hidden px-6 py-16 text-center">
      {/* Cahaya ambien yang mengambang pelan — cuma di layar selamat datang,
          supaya kesan pertama terasa hidup sebelum tamu masuk ke sesi
          fungsional. Warnanya ikut tema event lewat CSS variable yang
          sama dipakai brand-gradient, jadi otomatis menyesuaikan tiap
          acara tanpa kode tambahan. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <div className="blob floating -left-16 -top-16 h-64 w-64 bg-brand-purple" />
        <div className="blob floating-slow -right-14 top-1/3 h-56 w-56 bg-flash" />
        <div className="blob floating bottom-[-4rem] left-1/4 h-52 w-52 bg-brand-gold" />
        {PETALS.map((p, i) => (
          <span
            key={i}
            className="petal"
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
              background: p.color,
              animationDuration: p.duration,
              animationDelay: p.delay,
            }}
          />
        ))}
      </div>

      <div className="step-enter relative z-10 flex flex-col items-center">
        <div className="grid h-16 w-16 place-items-center rounded-full ring-1 ring-edge">
          <span className="font-display text-lg tracking-wide text-flash">
            {initials(event.names)}
          </span>
        </div>

        <p className="tracked mt-7 font-mono text-[11px] text-smoke">
          Virtual Photobooth
        </p>
        <h1 className="mt-3 max-w-xs font-display text-4xl leading-tight tracking-tight text-paper">
          {event.names}
        </h1>
        <p className="mt-4 font-mono text-[12px] leading-relaxed text-smoke">
          {event.date}
        </p>

        <p className="mt-8 max-w-xs text-[14px] leading-relaxed text-smoke">
          {event.greeting}
        </p>

        <button
          onClick={onEnter}
          className="btn-primary mt-10 rounded-full px-10 py-4 font-display text-base tracking-tight text-ink"
        >
          Mulai sesi foto
        </button>
      </div>
    </div>
  );
}
