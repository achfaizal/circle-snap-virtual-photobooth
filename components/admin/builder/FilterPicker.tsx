"use client";

import { Check } from "lucide-react";
import { FILTER_PRESETS, matchFilterPreset } from "@/lib/services/filters";

/**
 * Pemilih filter kamera — tiap chip memakai filternya sendiri pada sebuah
 * petak contoh, jadi klien melihat efeknya sebelum memilih.
 *
 * Petaknya bukan foto orang melainkan gradasi warna kulit + langit; itu
 * cukup untuk membedakan hangat/dingin/mono tanpa harus mengunggah foto
 * contoh dan tanpa menyalakan kamera admin.
 */
const SWATCH =
  "linear-gradient(135deg, #F5D0B0 0%, #E8A87C 35%, #7EA8C4 70%, #2F4858 100%)";

export default function FilterPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (css: string) => void;
}) {
  const active = matchFilterPreset(value);

  return (
    <div>
      <div className="grid grid-cols-4" style={{ gap: 8 }}>
        {FILTER_PRESETS.map((p) => {
          const on = active?.id === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(p.css)}
              title={p.hint}
              className="relative"
              style={{
                padding: 4,
                borderRadius: 12,
                border: `1.5px solid ${on ? "var(--a-clr-primary)" : "var(--a-clr-border)"}`,
                background: on ? "var(--a-clr-primary-light)" : "white",
                cursor: "pointer",
              }}
            >
              {on && (
                <span
                  className="absolute grid place-items-center rounded-full"
                  style={{ top: -7, right: -7, width: 18, height: 18, background: "var(--a-clr-primary)" }}
                >
                  <Check size={11} color="white" />
                </span>
              )}
              <span
                aria-hidden
                className="block"
                style={{
                  height: 34,
                  borderRadius: 8,
                  background: SWATCH,
                  filter: p.css === "none" ? undefined : p.css,
                }}
              />
              <span
                className="block truncate"
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  marginTop: 4,
                  color: on ? "var(--a-clr-primary)" : "var(--a-clr-text-muted)",
                }}
              >
                {p.label}
              </span>
            </button>
          );
        })}
      </div>
      {!active && (
        <p style={{ fontSize: 11, color: "var(--a-clr-text-muted)", marginTop: 8 }}>
          Filter khusus sedang dipakai — atur nilainya di kolom CSS di bawah.
        </p>
      )}
    </div>
  );
}
