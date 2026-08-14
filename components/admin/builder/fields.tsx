"use client";

import { useState } from "react";
import { Info, Lock } from "lucide-react";

/**
 * Kontrol dasar yang dipakai bersama ketiga sub-tab Visual Builder.
 * Semua mengikuti §5.2 & §15 UI-UX-DESIGN-SYSTEM.md — label kecil
 * uppercase di atas field, input radius 12 padding 12×16, toggle 44×24.
 */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="uppercase"
      style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#94A3B8", marginBottom: 8 }}
    >
      {children}
    </p>
  );
}

/** Pemisah antar-kelompok kontrol di dalam satu tab. */
export function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <SectionLabel>{label}</SectionLabel>
      <div className="flex flex-col" style={{ gap: 8 }}>
        {children}
      </div>
    </div>
  );
}

export function Toggle({
  label,
  hint,
  checked,
  onChange,
  locked,
  lockedReason,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  /** Fitur berbayar yang belum termasuk paket klien — tetap TAMPIL
      (§4.1 dokumen 10: klien tidak bisa menginginkan yang tidak ia
      ketahui ada), tapi mati dan diberi lencana. */
  locked?: boolean;
  lockedReason?: string;
}) {
  return (
    <div
      className="flex items-center justify-between gap-3"
      style={{
        borderRadius: 12,
        border: "1px solid var(--a-clr-border)",
        padding: "10px 12px",
        opacity: locked ? 0.6 : 1,
      }}
    >
      <div className="min-w-0">
        <p className="flex items-center gap-1.5" style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>
          {label}
          {locked && (
            <span
              className="inline-flex items-center gap-1"
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: "var(--a-clr-primary)",
                background: "var(--a-clr-primary-light)",
                borderRadius: 100,
                padding: "2px 7px",
              }}
            >
              <Lock size={9} aria-hidden />
              PRO
            </span>
          )}
        </p>
        {(locked ? lockedReason : hint) && (
          <p style={{ fontSize: 11, color: "var(--a-clr-text-muted)", marginTop: 2 }}>
            {locked ? lockedReason : hint}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={locked}
        onClick={() => onChange(!checked)}
        className="relative shrink-0"
        style={{
          width: 44,
          height: 24,
          borderRadius: 9999,
          background: checked ? "var(--a-clr-primary)" : "var(--a-clr-border)",
          transition: "background 0.2s",
          cursor: locked ? "not-allowed" : "pointer",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: checked ? 22 : 2,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "white",
            boxShadow: "0 1px 3px rgba(0,0,0,.2)",
            transition: "left 0.2s",
          }}
        />
      </button>
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  multiline,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  multiline?: boolean;
  mono?: boolean;
}) {
  return (
    <label className="block">
      <span
        className="uppercase"
        style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "#64748B", display: "block", marginBottom: 4 }}
      >
        {label}
      </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="admin-input"
          style={{ margin: 0, resize: "vertical", lineHeight: 1.5 }}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="admin-input"
          style={{ margin: 0, fontFamily: mono ? "var(--font-space-mono), monospace" : undefined, fontSize: mono ? 12 : undefined }}
        />
      )}
      {hint && (
        <span style={{ fontSize: 11, color: "var(--a-clr-text-muted)", marginTop: 4, display: "block" }}>{hint}</span>
      )}
    </label>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  suffix,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span
        className="uppercase"
        style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "#64748B", display: "block", marginBottom: 4 }}
      >
        {label}
      </span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.valueAsNumber || 0)}
          className="admin-input"
          style={{ margin: 0, width: 96 }}
        />
        {suffix && <span style={{ fontSize: 12, color: "var(--a-clr-text-muted)" }}>{suffix}</span>}
      </div>
      {hint && (
        <span style={{ fontSize: 11, color: "var(--a-clr-text-muted)", marginTop: 4, display: "block" }}>{hint}</span>
      )}
    </label>
  );
}

/** Pilihan beberapa opsi berdampingan (mis. hitung mundur 0/3/5/10). */
export function ChoiceRow<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <span
        className="uppercase"
        style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "#64748B", display: "block", marginBottom: 6 }}
      >
        {label}
      </span>
      <div className="flex flex-wrap" style={{ gap: 6 }}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={String(o.value)}
              type="button"
              onClick={() => onChange(o.value)}
              style={{
                padding: "7px 14px",
                borderRadius: 10,
                fontSize: 12.5,
                fontWeight: active ? 700 : 500,
                border: `1px solid ${active ? "var(--a-clr-primary)" : "var(--a-clr-border)"}`,
                background: active ? "var(--a-clr-primary-light)" : "white",
                color: active ? "var(--a-clr-primary)" : "var(--a-clr-text-muted)",
                cursor: "pointer",
                transition: "all .15s",
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ColorField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <div
      className="flex items-center gap-3"
      style={{ borderRadius: 12, border: "1px solid var(--a-clr-border)", padding: "8px 10px" }}
    >
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="shrink-0 cursor-pointer rounded border border-[var(--a-clr-border)] bg-transparent p-0"
        style={{ width: 30, height: 30 }}
      />
      <div className="min-w-0 flex-1">
        <p style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{label}</p>
        {hint && <p style={{ fontSize: 11, color: "var(--a-clr-text-muted)" }}>{hint}</p>}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={7}
        aria-label={`${label} (hex)`}
        className="w-[74px] shrink-0 rounded-md border border-[var(--a-clr-border)] bg-white px-2 py-1 text-right font-mono text-xs uppercase text-[#0F172A] outline-none focus:border-[var(--a-clr-primary)]"
      />
    </div>
  );
}

/** Kotak keterangan biru — §11.8 poin 4 "Info box elemen terkunci". */
export function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-start gap-2"
      style={{
        borderRadius: 12,
        border: "1px solid rgba(59,130,246,0.25)",
        background: "rgba(59,130,246,0.07)",
        padding: "10px 12px",
      }}
    >
      <Info size={15} className="mt-px shrink-0" color="#3B82F6" aria-hidden />
      <p style={{ fontSize: 12, lineHeight: 1.5, color: "#334155" }}>{children}</p>
    </div>
  );
}
