"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  closeCamera,
  describe,
  hasMultipleCameras,
  openCamera,
  type CameraFailure,
  type Facing,
} from "@/lib/camera";
import { captureFrame } from "@/lib/compositor";
import { getFilter } from "@/lib/filters";
import { useSession } from "@/lib/store";
import StripCanvas from "./StripCanvas";
import { RetakeIcon, ContinueIcon, FlipIcon } from "./icons";

export default function StepShoot() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [facing, setFacing] = useState<Facing>("user");
  const [canFlip, setCanFlip] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Jeda antara "foto masuk" dan "tamu putuskan lanjut atau ulang". Selama
  // ini true, kamera hidup disembunyikan — tamu melihat hasil jepretan, bukan
  // dirinya sendiri lagi, supaya keputusannya didasari hasil yang sebenarnya.
  const [reviewing, setReviewing] = useState(false);
  const [shotIndex, setShotIndex] = useState<number | null>(null);

  const {
    event,
    template,
    frames,
    cursor,
    filterId,
    mirror,
    countdownFrom,
    shooting,
    pushFrame,
    retakeAt,
    canRetake,
    setShooting,
    goto,
  } = useSession();

  const filter = getFilter(filterId);
  const filled = frames.filter(Boolean).length;
  const complete = template ? filled === template.slots.length : false;
  // Slot yang akan diisi jepretan berikutnya — di sinilah video hidup
  // ditampilkan, langsung di dalam lubang bingkai, bukan di kotak terpisah.
  const activeSlot = template && !complete ? template.slots[cursor] : null;

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  useEffect(() => clearTimers, [clearTimers]);

  /* ------------------------------------------------------------ kamera */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setReady(false);
      setError(null);
      closeCamera(streamRef.current);

      try {
        const stream = await openCamera(facing);
        if (cancelled) return closeCamera(stream);

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);
        setCanFlip(await hasMultipleCameras());
      } catch (err) {
        if (cancelled) return;
        const f = err as CameraFailure;
        setError(f?.message ?? describe("unknown"));
      }
    })();

    return () => {
      cancelled = true;
      closeCamera(streamRef.current);
      streamRef.current = null;
    };
  }, [facing, attempt]);

  /* ------------------------------------------------------- ambil foto */
  const shoot = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      const idx = useSession.getState().cursor;
      const bmp = await captureFrame(video);
      setFlash(true);
      later(() => setFlash(false), 420);
      pushFrame(bmp);
      setShotIndex(idx);
      setReviewing(true);
    } catch {
      setError("Jepretan gagal diambil. Tekan tombol sekali lagi.");
    } finally {
      setShooting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pushFrame, setShooting]);

  const runCountdown = useCallback(() => {
    clearTimers();
    setShooting(true);

    let n = countdownFrom;
    setCount(n);
    const step = () => {
      n -= 1;
      if (n > 0) {
        setCount(n);
        later(step, 1000);
      } else {
        setCount(null);
        void shoot();
      }
    };
    later(step, 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdownFrom, shoot, setShooting, clearTimers]);

  if (!template || !event) return null;

  const handleContinue = () => {
    if (complete) {
      goto(event.voiceNoteEnabled ? "suara" : "struk");
      return;
    }
    setReviewing(false);
    setShotIndex(null);
  };

  const handleRetake = () => {
    if (shotIndex === null) return;
    retakeAt(shotIndex);
    setReviewing(false);
    setShotIndex(null);
  };

  // Kamera hidup disembunyikan selama tamu meninjau jepretan barusan — cursor
  // sudah diam-diam maju ke slot berikutnya di store, tapi secara visual
  // belum "pindah" sampai tamu menekan Lanjut.
  const showVideo = !reviewing && !!activeSlot && ready && !error;
  const showRetake = shotIndex !== null && canRetake(shotIndex);

  const slotRect = activeSlot
    ? {
        left: `${(activeSlot.x / template.width) * 100}%`,
        top: `${(activeSlot.y / template.height) * 100}%`,
        width: `${(activeSlot.w / template.width) * 100}%`,
        height: `${(activeSlot.h / template.height) * 100}%`,
      }
    : null;

  return (
    <section className="step-enter mx-auto max-w-md space-y-4">
      {/* Bingkai hidup: strip yang sudah terisi dan video kamera duduk di
          lubang yang sama, satu tampilan — bukan kamera lalu strip terpisah.
          Tamu langsung melihat pose masuk ke bingkai final. */}
      <div
        className="relative mx-auto max-h-[58dvh] w-auto max-w-full overflow-hidden rounded-2xl bg-black ring-1 ring-edge sm:max-h-[74dvh]"
        style={{ aspectRatio: `${template.width} / ${template.height}` }}
      >
        <StripCanvas
          key={filled}
          fill
          scale={0.6}
          className="developing absolute inset-0 h-full w-full"
        />

        {/* Satu elemen <video> yang sama sepanjang hidup komponen — hanya
            posisi dan visibilitasnya berubah mengikuti slot aktif. Kalau
            elemennya dilepas-pasang tiap kali slot berpindah, stream kamera
            ikut lepas dari elemen lama dan layar jadi hitam. */}
        <div
          className="absolute overflow-hidden transition-opacity duration-150"
          style={{
            ...(slotRect ?? { inset: 0 }),
            opacity: showVideo ? 1 : 0,
            pointerEvents: "none",
          }}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="h-full w-full object-cover object-center"
            style={{
              filter: filter.css,
              transform: mirror ? "scaleX(-1)" : undefined,
            }}
          />
        </div>


        {count !== null && slotRect && (
          <div className="absolute grid place-items-center bg-ink/40" style={slotRect}>
            <span
              key={count}
              className="tick font-display text-[18vw] leading-none text-paper sm:text-6xl"
            >
              {count}
            </span>
          </div>
        )}

        {flash && <div className="flashfire absolute inset-0 bg-paper" />}

        {error && (
          <div className="absolute inset-0 grid place-items-center bg-ink/90 p-8">
            <div className="max-w-sm text-center">
              <p className="font-display text-lg">Kamera belum bisa dibuka</p>
              <p className="mt-3 text-sm leading-relaxed text-smoke">{error}</p>
              <button
                onClick={() => setAttempt((a) => a + 1)}
                className="btn-primary mt-6 rounded-full px-5 py-2.5 text-sm font-medium text-ink"
              >
                Coba lagi
              </button>
            </div>
          </div>
        )}

        {!ready && !error && (
          <div className="absolute inset-0 grid place-items-center bg-ink/80">
            <span className="tracked font-mono text-[11px] text-smoke">
              menyalakan kamera
            </span>
          </div>
        )}
      </div>

      {reviewing ? (
        <div className="flex items-center justify-center gap-4">
          {showRetake && (
            <button
              onClick={handleRetake}
              className="flex flex-col items-center gap-1.5 rounded-full px-6 py-3 text-smoke ring-1 ring-edge transition hover:text-live hover:ring-live"
            >
              <RetakeIcon className="h-6 w-6" />
              <span className="font-mono text-[10px]">Ulang</span>
            </button>
          )}
          <button
            onClick={handleContinue}
            className={`btn-primary flex flex-col items-center gap-1.5 rounded-full py-3 text-ink ${
              showRetake ? "px-8" : "flex-1"
            }`}
          >
            <ContinueIcon className="h-6 w-6" />
            <span className="font-mono text-[10px] font-medium">
              {complete
                ? event.voiceNoteEnabled
                  ? "Lanjut ke pesan suara"
                  : "Lihat hasil"
                : "Lanjut"}
            </span>
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-6">
          <div className="w-14 shrink-0" />
          <button
            onClick={runCountdown}
            disabled={!ready || !!error || shooting}
            aria-label="Jepret foto"
            className="relative grid h-20 w-20 shrink-0 place-items-center rounded-full ring-4 ring-paper/25 transition active:scale-95 disabled:opacity-30"
          >
            <span className="btn-primary h-16 w-16 rounded-full" />
          </button>
          {canFlip ? (
            <button
              onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
              aria-label="Balik kamera"
              className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-smoke ring-1 ring-edge transition hover:text-paper"
            >
              <FlipIcon className="h-5 w-5" />
            </button>
          ) : (
            <div className="w-14 shrink-0" />
          )}
        </div>
      )}
    </section>
  );
}
