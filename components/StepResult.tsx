"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { canvasToBlob, compose, downloadBlob } from "@/lib/compositor";
import { bumpUsed, receiptNo, tokensFor } from "@/lib/event";
import { getFilter } from "@/lib/filters";
import { useSession } from "@/lib/store";
import { renderVoiceCard, videoExtension, videoSupported } from "@/lib/video";
import StripCanvas from "./StripCanvas";
import {
  Download,
  FileImage,
  ImageIcon,
  Video,
  Share2,
  InstagramIcon,
  WhatsappIcon,
} from "./icons";

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

  /* IG dan WhatsApp tidak punya API web untuk menerima file terlampir
     langsung dari browser — itu batasan platform (iOS & Android), bukan
     lubang implementasi. Jalan yang benar-benar bekerja: simpan gambar ke
     galeri tamu dulu, baru buka aplikasinya supaya tamu tinggal lampirkan
     dari galeri. "Lainnya" tetap lewat share-sheet asli OS. */
  const shareToApp = async (app: "instagram" | "whatsapp") => {
    setBusy(app);
    setNote(null);
    try {
      const blob = await canvasToBlob(await render(), "image/png");
      downloadBlob(blob, `${base}.png`);
      setNote(
        app === "instagram"
          ? "Tersimpan ke galeri. Membuka Instagram — lampirkan dari galeri ke Story/DM."
          : "Tersimpan ke galeri. Membuka WhatsApp — lampirkan dari galeri ke chat."
      );
      setTimeout(() => {
        if (app === "instagram") {
          window.location.href = "instagram://camera";
        } else {
          const text = encodeURIComponent(`${event.names} · ${event.hashtag}`);
          window.open(`https://wa.me/?text=${text}`, "_blank");
        }
      }, 500);
    } catch {
      setNote("Gagal menyiapkan gambar.");
    } finally {
      setBusy(null);
    }
  };

  const shareMore = async () => {
    setBusy("more");
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
    <section className="step-enter relative grid gap-5 lg:grid-cols-[0.55fr_0.45fr] lg:items-start">
      {celebrate && <Confetti />}

      <div
        className="developing mx-auto max-h-[36dvh] w-auto max-w-full overflow-hidden rounded-3xl shadow-[0_30px_80px_-24px_rgba(0,0,0,0.95)] ring-1 ring-edge lg:max-h-none lg:max-w-none"
        style={{ aspectRatio: `${template.width} / ${template.height}` }}
      >
        <StripCanvas scale={0.6} fitHeight className="h-full w-full" />
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="tracked mb-2.5 font-mono text-[10px] text-smoke">Bawa pulang</h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => saveImage("image/png")}
              disabled={busy !== null}
              className="flex items-center justify-center gap-2 rounded-full bg-paper py-3.5 text-[13px] font-medium text-ink transition active:scale-[0.98] disabled:opacity-40"
            >
              <ImageIcon className="h-4 w-4" />
              {busy === "image/png" ? "Menyusun…" : "Unduh PNG"}
            </button>
            <button
              onClick={() => saveImage("image/jpeg")}
              disabled={busy !== null}
              className="flex items-center justify-center gap-2 rounded-full py-3.5 text-[13px] text-smoke ring-1 ring-edge transition hover:text-paper active:scale-[0.98] disabled:opacity-40"
            >
              <FileImage className="h-4 w-4" />
              {busy === "image/jpeg" ? "Menyusun…" : "Unduh JPG"}
            </button>

            {voice && videoSupported() && (
              <button
                onClick={saveVideo}
                disabled={busy !== null}
                className="btn-primary col-span-2 flex items-center justify-center gap-2 rounded-full py-3.5 text-[13px] font-medium text-ink transition disabled:opacity-40"
              >
                <Video className="h-4 w-4" />
                {busy === "video"
                  ? `Menjahit video ${Math.round(progress * 100)}%`
                  : "Unduh Video"}
              </button>
            )}

            <div className="col-span-2 grid grid-cols-3 gap-2">
              <button
                onClick={() => shareToApp("instagram")}
                disabled={busy !== null}
                aria-label="Bagikan ke Instagram"
                className="flex flex-col items-center gap-1 rounded-full py-3 text-smoke ring-1 ring-edge transition hover:text-paper hover:ring-flash active:scale-[0.98] disabled:opacity-40"
              >
                <InstagramIcon className="h-5 w-5" />
                <span className="font-mono text-[9px]">Instagram</span>
              </button>
              <button
                onClick={() => shareToApp("whatsapp")}
                disabled={busy !== null}
                aria-label="Bagikan ke WhatsApp"
                className="flex flex-col items-center gap-1 rounded-full py-3 text-smoke ring-1 ring-edge transition hover:text-paper hover:ring-flash active:scale-[0.98] disabled:opacity-40"
              >
                <WhatsappIcon className="h-5 w-5" />
                <span className="font-mono text-[9px]">WhatsApp</span>
              </button>
              <button
                onClick={shareMore}
                disabled={busy !== null}
                aria-label="Bagikan ke aplikasi lain"
                className="flex flex-col items-center gap-1 rounded-full py-3 text-smoke ring-1 ring-edge transition hover:text-paper hover:ring-flash active:scale-[0.98] disabled:opacity-40"
              >
                <Share2 className="h-5 w-5" />
                <span className="font-mono text-[9px]">Lainnya</span>
              </button>
            </div>
          </div>

          {note && (
            <p className="mt-3 flex items-center gap-1.5 font-mono text-[11px] text-flash">
              <Download className="h-3 w-3 shrink-0" />
              {note}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
