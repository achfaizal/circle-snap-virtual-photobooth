"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { canvasToBlob, compose, downloadBlob } from "@/lib/compositor";
import { bumpUsed, receiptNo, tokensFor } from "@/lib/event";
import { getFilter } from "@/lib/filters";
import { useSession } from "@/lib/store";
import { renderVoiceCard, videoExtension, videoSupported } from "@/lib/video";
import StripCanvas from "./StripCanvas";

const CONFETTI_COLORS = [
  "var(--color-brand-purple)",
  "var(--color-flash)",
  "var(--color-brand-gold)",
  "var(--color-paper)",
];

/** Tembakan konfeti sekali jalan saat struk muncul — bukan loop, supaya tidak
    mengalihkan perhatian dari tombol unduh setelah momennya lewat. */
function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        duration: 2 + Math.random() * 1,
        size: 5 + Math.random() * 5,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotate: Math.random() > 0.5,
      })),
    []
  );

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-20 h-0 overflow-visible">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.rotate ? p.size * 0.4 : p.size,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function StepResult() {
  const claimed = useRef(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  const {
    event,
    template,
    frames,
    filterId,
    mirror,
    voice,
    receipt,
    finish,
    newSession,
  } = useSession();

  /* Kuota dipotong tepat satu kali saat strip selesai, bukan per jepretan.
     Klien membeli strip — tamu yang mengulang foto tidak boleh menghabiskan
     paket lebih cepat. Ref penjaga mencegah React Strict Mode memotong dua kali. */
  useEffect(() => {
    if (!event || claimed.current || receipt) return;
    claimed.current = true;
    const next = bumpUsed(event.code);
    finish(receiptNo(event.code, next), next);
    setCelebrate(true);
  }, [event, receipt, finish]);

  if (!event || !template) return null;

  const render = () =>
    compose({
      template,
      frames,
      filterCss: getFilter(filterId).css,
      mirror,
      tokens: tokensFor(event),
      scale: 1,
    });

  const base = `${event.code.toLowerCase()}-${receipt ?? "strip"}`;

  const saveImage = async (type: "image/png" | "image/jpeg") => {
    setBusy(type);
    setNote(null);
    try {
      const blob = await canvasToBlob(await render(), type, 0.92);
      downloadBlob(blob, `${base}.${type === "image/png" ? "png" : "jpg"}`);
      setNote(`Tersimpan ${template.width}×${template.height} px.`);
    } catch {
      setNote("Ekspor gagal. Muat ulang halaman lalu coba lagi.");
    } finally {
      setBusy(null);
    }
  };

  const saveVideo = async () => {
    if (!voice) return;
    setBusy("video");
    setNote(null);
    setProgress(0);
    try {
      const blob = await renderVoiceCard({
        strip: await render(),
        audio: voice,
        names: event.names,
        date: event.date,
        hashtag: event.hashtag,
        onProgress: setProgress,
      });
      downloadBlob(blob, `${base}.${videoExtension(blob)}`);
      setNote("Video siap. Unggah ke Reels atau TikTok apa adanya.");
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Video gagal dibuat.");
    } finally {
      setBusy(null);
      setProgress(0);
    }
  };

  const share = async () => {
    setBusy("share");
    setNote(null);
    try {
      const blob = await canvasToBlob(await render(), "image/png");
      const file = new File([blob], `${base}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: event.names,
          text: `${event.names} · ${event.hashtag}`,
        });
      } else {
        setNote("Browser ini belum mendukung berbagi langsung. Unduh dulu, lalu unggah dari galeri.");
      }
    } catch {
      /* tamu membatalkan dialog — bukan error */
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="relative grid gap-8 lg:grid-cols-[0.55fr_0.45fr] lg:items-start">
      {celebrate && <Confetti />}

      <div className="developing overflow-hidden rounded-3xl shadow-[0_30px_80px_-24px_rgba(0,0,0,0.95)] ring-1 ring-edge">
        <StripCanvas scale={0.6} className="mx-auto max-w-[300px] lg:max-w-none" />
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="tracked mb-3 font-mono text-[10px] text-smoke">Bawa pulang</h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => saveImage("image/png")}
              disabled={busy !== null}
              className="rounded-full bg-paper py-3.5 text-[13px] font-medium text-ink transition disabled:opacity-40"
            >
              {busy === "image/png" ? "Menyusun…" : "Unduh PNG"}
            </button>
            <button
              onClick={() => saveImage("image/jpeg")}
              disabled={busy !== null}
              className="rounded-full py-3.5 text-[13px] text-smoke ring-1 ring-edge transition hover:text-paper disabled:opacity-40"
            >
              {busy === "image/jpeg" ? "Menyusun…" : "Unduh JPG"}
            </button>

            {voice && videoSupported() && (
              <button
                onClick={saveVideo}
                disabled={busy !== null}
                className="btn-primary col-span-2 rounded-full py-3.5 text-[13px] font-medium text-ink transition disabled:opacity-40"
              >
                {busy === "video"
                  ? `Menjahit video ${Math.round(progress * 100)}%`
                  : "Unduh video + pesan suara"}
              </button>
            )}

            <button
              onClick={share}
              disabled={busy !== null}
              className="col-span-2 rounded-full py-3.5 text-[13px] text-smoke ring-1 ring-edge transition hover:text-paper disabled:opacity-40"
            >
              {busy === "share" ? "Menyiapkan…" : "Bagikan ke aplikasi lain"}
            </button>
          </div>

          {note && <p className="mt-3 font-mono text-[11px] text-flash">{note}</p>}
        </div>

        <button
          onClick={newSession}
          className="w-full rounded-full py-3.5 text-[13px] text-smoke ring-1 ring-edge transition hover:text-live hover:ring-live"
        >
          Giliran tamu berikutnya
        </button>
      </div>
    </section>
  );
}
