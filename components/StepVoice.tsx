"use client";

import { useEffect, useRef, useState } from "react";
import { audioSupported, startRecording, type Recorder } from "@/lib/voice";
import { resolveCopy } from "@/lib/copy";
import { useSession } from "@/lib/store";
import { Mic, Square, RotateCcw, ArrowRight } from "./icons";

export default function StepVoice() {
  const rec = useRef<Recorder | null>(null);
  const raf = useRef(0);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  const [state, setState] = useState<"diam" | "merekam" | "selesai">("diam");
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  const { event, voice, setVoice, goto } = useSession();
  const max = event?.maxVoiceSeconds ?? 15;

  const cleanup = () => {
    cancelAnimationFrame(raf.current);
    if (tick.current) clearInterval(tick.current);
    tick.current = null;
  };

  useEffect(() => cleanup, []);
  useEffect(() => {
    if (!voice) return setUrl(null);
    const u = URL.createObjectURL(voice);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [voice]);

  const stop = async () => {
    cleanup();
    const r = rec.current;
    rec.current = null;
    if (!r) return;
    const blob = await r.stop();
    setVoice(blob);
    setState("selesai");
  };

  const begin = async () => {
    setError(null);
    try {
      const r = await startRecording();
      rec.current = r;
      setState("merekam");
      setSeconds(0);

      const meter = () => {
        setLevel(r.level());
        raf.current = requestAnimationFrame(meter);
      };
      meter();

      tick.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= max) void stop();
          return s + 1;
        });
      }, 1000);
    } catch {
      setError(
        "Mikrofon tidak bisa dibuka. Izinkan akses lewat ikon gembok di address bar, atau lewati langkah ini."
      );
    }
  };

  if (!event) return null;

  const copy = resolveCopy(
    { names: event.names, date: event.date, venue: event.venue, hashtag: event.hashtag },
    event.copy
  );

  return (
    <section className="step-enter mx-auto max-w-xl text-center">
      <h2 className="font-display text-2xl leading-tight tracking-tight">{copy.voiceTitle}</h2>
      <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-smoke">{copy.voiceIntro}</p>

      <div className="mt-8 overflow-hidden rounded-2xl p-5 ring-1 ring-edge sm:p-6">
        {/* Meteran level: tanpa ini tamu tidak tahu mikrofonnya menangkap
            suara sampai rekaman selesai dan terlambat diperbaiki. Lebar bar
            mengecil di layar sempit supaya 28 batang tidak meluber ke luar
            kartu — ini yang paling sering dites di HP, bukan desktop. */}
        <div className="flex h-24 items-center justify-center gap-1 sm:gap-1.5">
          {Array.from({ length: 28 }).map((_, i) => {
            const active = state === "merekam" && level * 28 > i;
            const h = 8 + (active ? Math.sin((i / 28) * Math.PI) * level * 62 : 0);
            return (
              <span
                key={i}
                className="w-1 rounded-full transition-all duration-75 sm:w-1.5"
                style={{
                  height: `${h}px`,
                  background: active ? "var(--color-flash)" : "var(--color-edge)",
                }}
              />
            );
          })}
        </div>

        <p className="mt-2 text-center font-mono text-[11px] text-smoke">
          {state === "merekam"
            ? `${String(seconds).padStart(2, "0")} / ${max} detik`
            : state === "selesai"
              ? "rekaman tersimpan"
              : "belum merekam"}
        </p>

        {url && state === "selesai" && (
          <audio src={url} controls className="mt-4 w-full" />
        )}

        {error && <p className="mt-4 text-[13px] leading-relaxed text-live">{error}</p>}

        <div className="mt-6 grid grid-cols-2 gap-2">
          {state === "merekam" ? (
            <button
              onClick={stop}
              className="btn-shape col-span-2 flex items-center justify-center gap-2 rounded-full bg-live py-3.5 font-display text-base text-paper transition active:scale-[0.98]"
            >
              <Square className="h-4 w-4" />
              Berhenti merekam
            </button>
          ) : (
            <button
              onClick={begin}
              disabled={!audioSupported()}
              className="btn-shape col-span-2 flex items-center justify-center gap-2 rounded-full bg-paper py-3.5 font-display text-base text-ink transition active:scale-[0.98] disabled:opacity-40"
            >
              {state === "selesai" ? (
                <RotateCcw className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
              {state === "selesai" ? "Rekam ulang" : "Mulai merekam"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-5">
        <button
          onClick={() => goto("struk")}
          className="btn-primary btn-shape flex w-full items-center justify-center gap-2 rounded-full py-3 font-display text-base tracking-tight text-ink"
        >
          {voice ? "Lanjut ke hasil" : "Lewati, langsung ke hasil"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
