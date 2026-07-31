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

export default function WelcomeScreen({
  event,
  onEnter,
}: {
  event: EventConfig;
  onEnter: () => void;
}) {
  return (
    <div className="relative flex min-h-[calc(100dvh-3rem)] flex-col items-center justify-center px-6 py-16 text-center">
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
          <br />
          {event.venue}
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
