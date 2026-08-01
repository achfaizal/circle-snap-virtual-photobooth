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
import { captureFrame, coverRect } from "@/lib/compositor";
import { getFilter } from "@/lib/filters";
import { useSession } from "@/lib/store";
import type { Slot, Template } from "@/lib/templates";
import FrameAssembly from "./FrameAssembly";
import { RetakeIcon, ContinueIcon, FlipIcon, X } from "./icons";

/** Foto yang baru dijepret, ditampilkan apa adanya (bukan di-crop ke bentuk
    slot) — tamu menilai hasil jepretan sesungguhnya, bukan potongan kecilnya. */
function CapturedShot({
  bitmap,
  mirror,
  filterCss,
  className,
}: {
  bitmap: ImageBitmap;
  mirror: boolean;
  filterCss: string;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (filterCss !== "none" && "filter" in ctx) ctx.filter = filterCss;
    if (mirror) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(bitmap, 0, 0);
  }, [bitmap, mirror, filterCss]);

  return <canvas ref={ref} className={className} />;
}

/** Satu foto di dalam bingkai sungguhan selama layar review — dipotong pas
    ke bentuk slot tujuannya (sama seperti FrameAssembly), supaya tamu
    langsung lihat gambaran hasil akhirnya, bukan foto polos lepas dari
    bingkai. Muncul langsung tanpa animasi — efek "print" pelan-pelan
    disimpan untuk momen "Print Virtual Booth" di akhir sesi saja. */
function ReviewSlotPhoto({
  frame,
  slot,
  template,
  mirror,
  filterCss,
}: {
  frame: ImageBitmap;
  slot: Slot;
  template: Template;
  mirror: boolean;
  filterCss: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.width = slot.w;
    canvas.height = slot.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { sx, sy, sw, sh } = coverRect(frame.width, frame.height, slot);
    if (filterCss !== "none" && "filter" in ctx) ctx.filter = filterCss;
    if (mirror) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(frame, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  }, [frame, slot, mirror, filterCss]);

  return (
    <canvas
      ref={ref}
      className="absolute h-full w-full"
      style={{
        left: `${(slot.x / template.width) * 100}%`,
        top: `${(slot.y / template.height) * 100}%`,
        width: `${(slot.w / template.width) * 100}%`,
        height: `${(slot.h / template.height) * 100}%`,
      }}
    />
  );
}

/** Satu kotak di strip progress bawah kamera — kotak kosong bergaris putus
    untuk slot yang belum dijepret, thumbnail persegi (di-crop rata tengah)
    untuk yang sudah. Tamu tahu "tinggal berapa lagi" tanpa bingkai sungguhan
    perlu terlihat selama sesi berlangsung. Thumbnail yang sudah terisi bisa
    ditekan untuk melihat hasil jepretannya lebih besar. */
function SlotThumb({
  frame,
  active,
  onClick,
}: {
  frame: ImageBitmap | null;
  active: boolean;
  onClick?: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !frame) return;
    const size = 96;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { sx, sy, sw, sh } = coverRect(frame.width, frame.height, { x: 0, y: 0, w: 1, h: 1 });
    ctx.drawImage(frame, sx, sy, sw, sh, 0, 0, size, size);
  }, [frame]);

  if (!frame) {
    return (
      <div
        className={`h-11 w-11 shrink-0 rounded-lg border-2 border-dashed transition-colors ${
          active ? "border-flash" : "border-edge"
        }`}
      />
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Lihat foto ini lebih besar"
      className="shrink-0 transition active:scale-95"
    >
      <canvas
        ref={ref}
        className="developing h-11 w-11 rounded-lg object-cover ring-1 ring-edge"
      />
    </button>
  );
}

/** Popup preview saat thumbnail ditekan — foto tampil utuh (bukan potongan
    persegi thumbnail-nya) supaya tamu benar-benar bisa menilai hasilnya. */
function ShotPreview({
  bitmap,
  mirror,
  filterCss,
  onClose,
}: {
  bitmap: ImageBitmap;
  mirror: boolean;
  filterCss: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/90 p-6"
      onClick={onClose}
    >
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <CapturedShot
          bitmap={bitmap}
          mirror={mirror}
          filterCss={filterCss}
          className="block max-h-[70dvh] max-w-full h-auto w-auto rounded-2xl ring-1 ring-edge"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="absolute -right-3 -top-3 grid h-9 w-9 place-items-center rounded-full bg-ink text-paper ring-1 ring-edge transition hover:text-flash"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

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
  // Reveal singkat "foto masuk ke bingkai" setelah jepretan terakhir
  // dikonfirmasi — bingkai sengaja tidak terlihat sepanjang sesi jepret
  // supaya tamu dapat area kamera sebesar mungkin, bukan dipotong ke bentuk
  // slot yang kadang kecil.
  const [assembling, setAssembling] = useState(false);
  // Foto mana yang lagi dibuka besar lewat popup preview (dari thumbnail).
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

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

  if (assembling) {
    return (
      <FrameAssembly
        template={template}
        onDone={() => goto(event.voiceNoteEnabled ? "suara" : "struk")}
      />
    );
  }

  const handleContinue = () => {
    if (complete) {
      setAssembling(true);
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

  const showVideo = !reviewing && ready && !error;
  const showRetake = shotIndex !== null && canRetake(shotIndex);

  return (
    <section className="step-enter mx-auto mt-4 max-w-md space-y-4 sm:mt-8">
      {/* Kotak kamera dipaksa rasio 1:1 (bukan mengikuti rasio asli kamera
          yang beda-beda tiap device), lewat lebar definit (w-[80%]) +
          aspect-ratio — arah ini (lebar pasti, tinggi menyesuaikan) aman di
          semua browser termasuk Safari/WebKit, beda dengan arah sebaliknya
          (tinggi dibatasi, lebar auto) yang bermasalah di WebKit (lihat
          catatan di StripCanvas.tsx).

          Kotak ini TETAP DI-RENDER (cuma disembunyikan lewat `hidden`) saat
          reviewing, bukan dilepas dari DOM — <video> di dalamnya harus
          tetap hidup sepanjang komponen ini ada, kalau dilepas-pasang
          stream kamera ikut lepas dan layar jadi hitam saat kembali ke
          sesi live. */}
      <div
        className={`relative mx-auto w-[80%] max-w-xs overflow-hidden rounded-2xl bg-black ring-1 ring-edge sm:max-w-sm ${
          reviewing ? "hidden" : ""
        }`}
        style={{ aspectRatio: "1 / 1" }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            filter: filter.css,
            transform: mirror ? "scaleX(-1)" : undefined,
            opacity: showVideo ? 1 : 0,
            transition: "opacity 150ms",
          }}
        />

        {count !== null && (
          <div className="absolute inset-0 grid place-items-center bg-ink/40">
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

      {/* Layar review: bingkai sungguhan tampil kecil di tengah, dengan
          foto yang baru dijepret "muncul" ke slotnya seperti struk keluar
          dari printer. Ini satu-satunya momen bingkai terlihat sebelum sesi
          jepret selesai — sengaja kecil supaya tetap terasa sebagai
          pratinjau, bukan menggantikan momen reveal penuh di "Menyusun
          bingkai" nanti. */}
      {reviewing && (
        <div className="flex justify-center">
          <div className="relative inline-block overflow-hidden rounded-2xl ring-1 ring-edge">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, #2E2658 0 6px, #1E1B4B 6px 12px)",
              }}
            />
            {template.slots.map(
              (slot, i) =>
                frames[i] && (
                  <ReviewSlotPhoto
                    key={i}
                    frame={frames[i]!}
                    slot={slot}
                    template={template}
                    mirror={mirror}
                    filterCss={filter.css}
                  />
                )
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={template.overlay}
              alt=""
              className="relative block max-h-[42dvh] max-w-[200px] h-auto w-auto sm:max-h-[52dvh]"
            />
          </div>
        </div>
      )}

      {/* Progress: satu kotak per foto yang dibutuhkan bingkai ini. */}
      <div className="flex items-center justify-center gap-2">
        {template.slots.map((_, i) => (
          <SlotThumb
            key={i}
            frame={frames[i]}
            active={i === cursor}
            onClick={() => setPreviewIndex(i)}
          />
        ))}
      </div>

      {/* Tiga posisi tetap sepanjang sesi — balik-kamera selalu di kiri,
          Ulang selalu di kanan (cuma disable kalau belum ada yang bisa
          diulang). Cuma tombol tengah yang berganti fungsi (jepret ↔
          lanjut), supaya baris kontrol tidak terasa "loncat" antar dua
          tata letak berbeda tiap kali status reviewing berubah. */}
      <div className="flex items-center justify-center gap-6">
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

        {reviewing ? (
          <button
            onClick={handleContinue}
            aria-label={
              complete
                ? event.voiceNoteEnabled
                  ? "Lanjut ke pesan suara"
                  : "Lihat hasil"
                : "Lanjut"
            }
            className="relative grid h-20 w-20 shrink-0 place-items-center rounded-full ring-4 ring-paper/25 transition active:scale-95"
          >
            <span className="btn-primary grid h-16 w-16 place-items-center rounded-full text-ink">
              <ContinueIcon className="h-6 w-6" />
            </span>
          </button>
        ) : (
          <button
            onClick={runCountdown}
            disabled={!ready || !!error || shooting}
            aria-label="Jepret foto"
            className="relative grid h-20 w-20 shrink-0 place-items-center rounded-full ring-4 ring-paper/25 transition active:scale-95 disabled:opacity-30"
          >
            <span className="btn-primary h-16 w-16 rounded-full" />
          </button>
        )}

        <button
          onClick={handleRetake}
          disabled={!showRetake}
          aria-label="Ulang"
          className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-smoke ring-1 ring-edge transition hover:text-live hover:ring-live disabled:pointer-events-none disabled:opacity-30 disabled:hover:text-smoke disabled:hover:ring-edge"
        >
          <RetakeIcon className="h-5 w-5" />
        </button>
      </div>

      {previewIndex !== null && frames[previewIndex] && (
        <ShotPreview
          bitmap={frames[previewIndex]!}
          mirror={mirror}
          filterCss={filter.css}
          onClose={() => setPreviewIndex(null)}
        />
      )}
    </section>
  );
}
