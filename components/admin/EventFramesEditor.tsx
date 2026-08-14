"use client";

import { useState } from "react";
import { ArrowUp, ArrowDown, Check } from "lucide-react";
import type { Event } from "@/lib/models/event";
import type { Frame } from "@/lib/models/frame";
import Spinner from "./Spinner";
import { notifyEventSaved } from "@/lib/utils";

/** Urutan array frameIds = urutan carousel yang dilihat tamu di StepFrame
    — makanya ada tombol naik/turun, bukan cuma centang. */
export default function EventFramesEditor({
  event,
  frames,
  assetUrls,
  frameTemplates,
  onSaved,
}: {
  event: Event;
  frames: Frame[];
  assetUrls: Record<string, string>;
  /** id bingkai -> nama template yang berpasangan dengannya (kalau ada).
      Cuma dikirim saat pustaka BELUM tersaring template, supaya klien
      tetap melihat bingkai mana yang sepasang meski tampil rata. */
  frameTemplates?: Record<string, string>;
  onSaved?: () => void;
}) {
  const [frameIds, setFrameIds] = useState<string[]>(event.frameIds);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const byId = new Map(frames.map((f) => [f.id, f]));
  const selected = frameIds.map((id) => byId.get(id)).filter((f): f is Frame => !!f);
  const available = frames.filter((f) => !frameIds.includes(f.id));

  const add = (id: string) => setFrameIds((ids) => [...ids, id]);
  const remove = (id: string) => setFrameIds((ids) => ids.filter((x) => x !== id));
  const move = (index: number, dir: -1 | 1) => {
    setFrameIds((ids) => {
      const next = [...ids];
      const target = index + dir;
      if (target < 0 || target >= next.length) return ids;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setNote(null);
    try {
      const res = await fetch(`/api/admin/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frameIds }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setNote(data?.error ?? "Gagal menyimpan.");
        return;
      }
      setNote("Tersimpan.");
      notifyEventSaved();
      onSaved?.();
    } catch {
      setNote("Tidak bisa menghubungi server.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--a-clr-text-muted)]">
          Dipakai di event ini ({selected.length})
        </p>
        {selected.length === 0 && (
          <p className="mt-2 text-sm text-[var(--a-clr-text-muted)]">
            Belum ada bingkai — tamu tidak akan bisa lanjut ke sesi foto sampai minimal satu
            bingkai ditambahkan.
          </p>
        )}
        <div className="mt-2 space-y-2">
          {selected.map((frame, i) => (
            <div key={frame.id} className="flex items-center gap-3 rounded-[var(--a-radius-md)] border border-[var(--a-clr-border)] p-2">
              <div className="flex h-14 w-11 shrink-0 items-center justify-center overflow-hidden rounded bg-[var(--a-clr-bg)]">
                {assetUrls[frame.overlayAssetId] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- pratinjau bingkai lokal
                  <img src={assetUrls[frame.overlayAssetId]} alt="" className="h-full w-full object-contain" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[#0F172A]">{frame.name}</p>
                <p className="text-xs text-[var(--a-clr-text-muted)]">
                  {frame.slots.length} slot
                  {frameTemplates?.[frame.id] && (
                    <span className="ml-1.5 rounded-full bg-[var(--a-clr-primary-light)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--a-clr-primary)]">
                      {frameTemplates[frame.id]}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="grid h-7 w-7 place-items-center rounded-md text-[var(--a-clr-text-muted)] transition hover:bg-[var(--a-clr-bg)] disabled:opacity-30"
                  title="Naikkan urutan"
                  aria-label={`Naikkan urutan ${frame.name}`}
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === selected.length - 1}
                  className="grid h-7 w-7 place-items-center rounded-md text-[var(--a-clr-text-muted)] transition hover:bg-[var(--a-clr-bg)] disabled:opacity-30"
                  title="Turunkan urutan"
                  aria-label={`Turunkan urutan ${frame.name}`}
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  onClick={() => remove(frame.id)}
                  className="admin-btn admin-btn-danger-ghost admin-btn-sm"
                >
                  Lepas
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {available.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--a-clr-text-muted)]">
            Pustaka bingkai lainnya
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {available.map((frame) => (
              <button
                key={frame.id}
                onClick={() => add(frame.id)}
                className="group relative overflow-hidden rounded-[var(--a-radius-md)] border border-[var(--a-clr-border)] p-2 text-left transition hover:border-[var(--a-clr-primary)]"
              >
                <div className="flex h-20 items-center justify-center overflow-hidden rounded bg-[var(--a-clr-bg)]">
                  {assetUrls[frame.overlayAssetId] ? (
                    // eslint-disable-next-line @next/next/no-img-element -- pratinjau bingkai lokal
                    <img src={assetUrls[frame.overlayAssetId]} alt="" className="h-full w-full object-contain" />
                  ) : null}
                </div>
                <p className="mt-1.5 truncate text-xs font-semibold text-[#0F172A]">{frame.name}</p>
                {frameTemplates?.[frame.id] && (
                  <span className="mt-0.5 inline-block rounded-full bg-[var(--a-clr-primary-light)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--a-clr-primary)]">
                    {frameTemplates[frame.id]}
                  </span>
                )}
                <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-white opacity-0 shadow transition group-hover:opacity-100">
                  <Check size={12} color="var(--a-clr-primary)" />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {frames.length === 0 && (
        <p className="mt-2 text-sm text-[var(--a-clr-text-muted)]">
          Pustaka bingkai masih kosong — buat bingkai dulu lewat halaman{" "}
          <span className="font-semibold">Pustaka Bingkai</span> di sidebar.
        </p>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button onClick={save} disabled={saving} className="admin-btn admin-btn-primary admin-btn-press">
          {saving && <Spinner size={14} />}
          {saving ? "Menyimpan…" : "Simpan"}
        </button>
        {note && <span className="text-sm font-medium text-[var(--a-clr-text-muted)]">{note}</span>}
      </div>
    </div>
  );
}
