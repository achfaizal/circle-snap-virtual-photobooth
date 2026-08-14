"use client";

import { Check, Lock } from "lucide-react";
import { BUILDER_STEPS, PHASE_LABEL, type BuilderPhase } from "@/lib/services/builderSteps";

/**
 * Rel langkah di sisi panel — menunjukkan POSISI, bukan cuma daftar menu.
 *
 * Langkah yang belum dilewati sengaja tidak bisa diklik: builder ini
 * memandu berurutan (Lanjut/Kembali), dan melompat ke "Hasil & Bagikan"
 * sebelum paletnya diputuskan cuma memindahkan kebingungan. Langkah yang
 * SUDAH dilewati tetap bisa diklik — meninjau ulang keputusan sendiri itu
 * wajar, dan memaksa klien menekan Kembali enam kali cuma menyebalkan.
 */
export default function StepRail({
  current,
  furthest,
  onJump,
}: {
  current: number;
  /** Langkah terjauh yang pernah dicapai — batas boleh-lompat. */
  furthest: number;
  onJump: (index: number) => void;
}) {
  let lastPhase: BuilderPhase | null = null;

  return (
    <div className="flex flex-col" style={{ gap: 2 }}>
      {BUILDER_STEPS.map((s, i) => {
        const active = i === current;
        const done = i < furthest;
        const locked = i > furthest;
        const showPhase = s.phase !== lastPhase;
        lastPhase = s.phase;

        return (
          <div key={s.id}>
            {showPhase && (
              <p
                className="uppercase"
                style={{
                  fontSize: 9.5,
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  color: "#94A3B8",
                  margin: i === 0 ? "0 0 6px" : "12px 0 6px",
                }}
              >
                {PHASE_LABEL[s.phase]}
              </p>
            )}
            <button
              type="button"
              disabled={locked}
              onClick={() => !locked && onJump(i)}
              title={locked ? "Selesaikan langkah sebelumnya dulu" : s.hint}
              className="flex w-full items-center text-left transition"
              style={{
                gap: 9,
                padding: active ? "8px 10px" : "6px 10px",
                borderRadius: 10,
                border: `1.5px solid ${active ? "var(--a-clr-primary)" : "transparent"}`,
                background: active ? "var(--a-clr-primary-light)" : "transparent",
                cursor: locked ? "not-allowed" : "pointer",
                opacity: locked ? 0.45 : 1,
              }}
            >
              <span
                className="grid shrink-0 place-items-center rounded-full"
                style={{
                  width: 22,
                  height: 22,
                  fontSize: 10.5,
                  fontWeight: 800,
                  background: active
                    ? "var(--a-clr-primary)"
                    : done
                      ? "var(--a-clr-success)"
                      : "var(--a-clr-bg)",
                  color: active || done ? "white" : "var(--a-clr-text-muted)",
                }}
              >
                {done ? <Check size={11} /> : locked ? <Lock size={9} /> : s.step}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className="block truncate"
                  style={{
                    fontSize: 12.5,
                    fontWeight: active ? 800 : 600,
                    color: active ? "var(--a-clr-primary)" : "#0F172A",
                  }}
                >
                  {s.emoji} {s.label}
                </span>
                {active && (
                  <span
                    className="block"
                    style={{ fontSize: 10.5, lineHeight: 1.4, color: "var(--a-clr-text-muted)", marginTop: 1 }}
                  >
                    {s.hint}
                  </span>
                )}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
