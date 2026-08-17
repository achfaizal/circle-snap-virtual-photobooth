"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { canvasToBlob, compose, downloadBlob } from "@/lib/compositor";
import { bumpUsed, receiptNo, tokensFor } from "@/lib/event";
import { uploadMoment } from "@/lib/moments";
import { matchFilterPreset } from "@/lib/services/filters";
import { useSession } from "@/lib/store";
import { renderVoiceCard, videoExtension, videoSupported } from "@/lib/video";
import MomentsGallery from "./MomentsGallery";
import StripCanvas from "./StripCanvas";
import {
  Download,
  FileImage,
  ImageIcon,
  Images,
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
  const uploaded = useRef(false);
  // Kunci idempoten klaim kuota (dok 02 §3.5, Langkah 10 Tahap 3) —
  // dibuat SEKALI per pemasangan komponen (lazy init, bukan di dalam
  // effect) supaya kalau blok try/catch di bawah retry pemanggilan
  // fetch, sessionId-nya TETAP SAMA, bukan dianggap klaim baru oleh
  // server.
  const sessionIdRef = useRef<string>(typeof crypto !== "undefined" ? crypto.randomUUID() : String(Date.now()));
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [momentsOpen, setMomentsOpen] = useState(false);
  const [quotaExhausted, setQuotaExhausted] = useState(false);

  const {
    event,
    template,
    frames,
    mirror,
    voice,
    receipt,
    finish,
    guestName,
    filterCss,
  } = useSession();

  /* Tombol unduh & bagikan mana yang tampil — diatur klien lewat Visual
     Builder (session.share.*). Default SEMUA menyala supaya event lama
     yang datanya belum punya field ini tidak kehilangan tombol apa pun.
     `shareCount` dipakai untuk lebar kolom, supaya sisa tombol tetap rapi
     memenuhi baris walau salah satunya dimatikan. */
  const share = {
    downloadPng: event?.session?.share?.downloadPng ?? true,
    downloadJpg: event?.session?.share?.downloadJpg ?? true,
    downloadVideo: event?.session?.share?.downloadVideo ?? true,
    instagram: event?.session?.share?.instagram ?? true,
    whatsapp: event?.session?.share?.whatsapp ?? true,
    nativeShare: event?.session?.share?.nativeShare ?? true,
  };
  const shareCount = [share.instagram, share.whatsapp, share.nativeShare].filter(Boolean).length;
  // Sama seperti WelcomeScreen.tsx: "expired" (masa aktif 7 hari habis)
  // JUGA mengunci galeri, beda dari "ended" yang sengaja tetap membukanya.
  const momentsEnabled = (event?.session?.moments?.enabled ?? true) && event?.status !== "expired";

  /* Kuota dipotong tepat satu kali saat strip selesai, bukan per jepretan.
     Klien membeli strip — tamu yang mengulang foto tidak boleh menghabiskan
     paket lebih cepat. Ref penjaga mencegah React Strict Mode memotong dua kali.

     Diklaim ke server (POST /api/quota/claim), bukan localStorage lagi —
     lihat docs/blueprint/06-temuan-risiko.md temuan T1: localStorage
     tidak pernah benar-benar membatasi apa pun karena tiap HP tamu mulai
     dari 0 sendiri-sendiri. `event.id` cuma kosong untuk event lama yang
     belum lewat repository (lib/adapters/legacy.ts) — jaring pengaman
     lokal itu boleh dihapus begitu semua event sudah lewat repo. */
  useEffect(() => {
    if (!event || claimed.current || receipt) return;
    claimed.current = true;

    (async () => {
      if (!event.id) {
        const next = bumpUsed(event.code);
        finish(receiptNo(event.code, next), next);
        setCelebrate(true);
        return;
      }

      try {
        // Langkah 5 Tahap 4 — field tambahan supaya server bisa menulis
        // sessions/strips SETELAH klaim commit (fondasi D-28/D-16).
        // matchFilterPreset(null saat filterCss custom bukan preset
        // terdaftar) -> "none" sebagai jatuh balik, bukan error keras.
        const res = await fetch("/api/quota/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId: event.id,
            sessionId: sessionIdRef.current,
            frameId: template?.id,
            guestName: guestName || undefined,
            filterId: matchFilterPreset(filterCss)?.id ?? "none",
            variableSnapshot: tokensFor(event),
          }),
        });

        if (res.status === 409) {
          setQuotaExhausted(true);
          return;
        }
        if (!res.ok) throw new Error("Klaim kuota gagal.");

        // API baru (Langkah 9 Tahap 1) mengembalikan `remaining` (sisa
        // kuota SETELAH klaim ini), bukan `used` — dihitung balik di sini
        // supaya receiptNo() (nomor urut struk, murni kosmetik, BUKAN
        // penegak kuota) tidak perlu mengubah kontrak claimQuota.ts yang
        // sudah teruji K1.
        const data = (await res.json()) as { remaining: number; alreadyClaimed: boolean };
        const used = Math.max(0, event.quota - data.remaining);
        finish(receiptNo(event.code, used), used);
        setCelebrate(true);
      } catch {
        // Server tidak terjangkau (offline dsb.) — gagal pelan, jangan
        // kunci tamu di layar kosong. Nomor struk lokal tetap keluar;
        // konsekuensinya kuota bisa sedikit terlewati kalau ini sering
        // terjadi, tapi itu lebih murah daripada tamu kecewa di acara
        // orang (lihat docs/blueprint/04-arsitektur.md bagian 6).
        const next = bumpUsed(event.code);
        finish(receiptNo(event.code, next), next);
        setCelebrate(true);
      }
    })();
  }, [event, receipt, finish]);

  if (!event || !template) return null;

  if (quotaExhausted) {
    return (
      <section className="step-enter mx-auto max-w-md rounded-2xl p-8 text-center ring-1 ring-edge">
        <h2 className="font-display text-xl">Yah, kuota baru saja habis</h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-smoke">
          Paket foto untuk acara ini sudah terpakai semua tepat saat strip kamu
          selesai. Fotomu tetap ada di kamera — tangkap layar untuk menyimpannya,
          atau hubungi panitia kalau butuh bantuan.
        </p>
      </section>
    );
  }

  const render = () =>
    compose({
      template,
      frames,
      filterCss,
      mirror,
      tokens: tokensFor(event),
      scale: 1,
    });

  /* Otomatis tersimpan ke galeri "Momen" begitu struk keluar — tidak nunggu
     tamu klik unduh apa pun, supaya "semua yang sudah photobooth" beneran
     tercatat, bukan cuma yang sempat-sempatnya unduh manual. Gagal upload
     (mis. lagi offline) sengaja diam saja — tamu tetap dapat struk dan bisa
     unduh manual, jangan sampai fitur sampingan ini mengganggu alur utama. */
  useEffect(() => {
    if (!event || !template || !receipt || uploaded.current) return;
    uploaded.current = true;

    (async () => {
      try {
        const photoBlob = await canvasToBlob(await render(), "image/png");
        let videoBlob: Blob | null = null;
        if (voice && videoSupported()) {
          videoBlob = await renderVoiceCard({
            strip: await render(),
            audio: voice,
            names: event.names,
            date: event.date,
            hashtag: event.hashtag,
            decorUrl: event.theme?.decorUrl,
            guestName: guestName || undefined,
            brandLabel: event.brandLabel,
            bgVideo: event.theme?.videoBg,
            videoCard: event.theme?.videoCard,
          }).catch(() => null);
        }
        await uploadMoment({
          eventCode: event.code,
          // SAMA dengan sessionId yang sudah dikirim ke /api/quota/claim
          // (Langkah 5 Tahap 4, dok 03 §6.1) — bukan lagi id acak
          // terpisah. Dua tamu beda HP tetap tidak akan tabrakan (UUID
          // acak per sesi), dan sekarang server bisa mencocokkan
          // unggahan ini ke baris `strips` yang sudah dibuat saat klaim.
          momentId: sessionIdRef.current,
          photo: photoBlob,
          video: videoBlob,
          guestName: guestName || undefined,
        });
      } catch {
        // offline / Blob belum siap — bukan alasan mengganggu tamu.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt]);

  // receipt sudah punya prefix pendek turunan dari kode event (mis.
  // "ENG-0001") — tidak perlu ditempel lagi dengan slug kode event penuh,
  // itu yang bikin nama file jadi panjang ("engagement-salfaizal-...").
  const base = receipt ?? `${event.code.toLowerCase()}-strip`;

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
        decorUrl: event.theme?.decorUrl,
        guestName: guestName || undefined,
        brandLabel: event.brandLabel,
        bgVideo: event.theme?.videoBg,
        videoCard: event.theme?.videoCard,
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
      {celebrate && (event.theme?.effects?.confetti ?? true) && <Confetti />}

      {/* flex+justify-center (bukan block+mx-auto) supaya kotaknya menyusut
          mengikuti konten, bukan mengisi lebar penuh grid column. Canvas di
          dalam (mode `natural`) yang benar-benar menentukan ukuran lewat
          max-height/max-width bawaan — lihat catatan di StripCanvas.tsx. */}
      <div className="flex justify-center">
        <div className="developing relative inline-block overflow-hidden rounded-3xl shadow-[0_30px_80px_-24px_rgba(0,0,0,0.95)] ring-1 ring-edge">
          <StripCanvas
            scale={0.6}
            natural
            className="max-h-[36dvh] max-w-full lg:max-h-none lg:max-w-none"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="tracked mb-2.5 font-mono text-[10px] text-smoke">Download</h2>
          <div className="grid grid-cols-2 gap-2">
            {share.downloadPng && (
              <button
                onClick={() => saveImage("image/png")}
                disabled={busy !== null}
                className={`btn-shape flex items-center justify-center gap-2 rounded-full bg-paper py-3.5 text-[13px] font-medium text-ink transition active:scale-[0.98] disabled:opacity-40 ${
                  share.downloadJpg ? "" : "col-span-2"
                }`}
              >
                <ImageIcon className="h-4 w-4" />
                {busy === "image/png" ? "Menyusun…" : "Unduh PNG"}
              </button>
            )}
            {share.downloadJpg && (
              <button
                onClick={() => saveImage("image/jpeg")}
                disabled={busy !== null}
                className={`btn-shape flex items-center justify-center gap-2 rounded-full py-3.5 text-[13px] text-smoke ring-1 ring-edge transition hover:text-paper active:scale-[0.98] disabled:opacity-40 ${
                  share.downloadPng ? "" : "col-span-2"
                }`}
              >
                <FileImage className="h-4 w-4" />
                {busy === "image/jpeg" ? "Menyusun…" : "Unduh JPG"}
              </button>
            )}

            {voice && videoSupported() && share.downloadVideo && (
              <button
                onClick={saveVideo}
                disabled={busy !== null}
                className="btn-primary btn-shape col-span-2 flex items-center justify-center gap-2 rounded-full py-3.5 text-[13px] font-medium text-ink transition disabled:opacity-40"
              >
                <Video className="h-4 w-4" />
                {busy === "video"
                  ? `Menjahit video ${Math.round(progress * 100)}%`
                  : "Unduh Video"}
              </button>
            )}

            {shareCount > 0 && (
              <div
                className="col-span-2 grid gap-2"
                style={{ gridTemplateColumns: `repeat(${shareCount}, minmax(0, 1fr))` }}
              >
                {share.instagram && (
                  <button
                    onClick={() => shareToApp("instagram")}
                    disabled={busy !== null}
                    aria-label="Bagikan ke Instagram"
                    className="flex flex-col items-center gap-1 rounded-full py-3 text-smoke ring-1 ring-edge transition hover:text-paper hover:ring-flash active:scale-[0.98] disabled:opacity-40"
                  >
                    <InstagramIcon className="h-5 w-5" />
                    <span className="font-mono text-[9px]">Instagram</span>
                  </button>
                )}
                {share.whatsapp && (
                  <button
                    onClick={() => shareToApp("whatsapp")}
                    disabled={busy !== null}
                    aria-label="Bagikan ke WhatsApp"
                    className="flex flex-col items-center gap-1 rounded-full py-3 text-smoke ring-1 ring-edge transition hover:text-paper hover:ring-flash active:scale-[0.98] disabled:opacity-40"
                  >
                    <WhatsappIcon className="h-5 w-5" />
                    <span className="font-mono text-[9px]">WhatsApp</span>
                  </button>
                )}
                {share.nativeShare && (
                  <button
                    onClick={shareMore}
                    disabled={busy !== null}
                    aria-label="Bagikan ke aplikasi lain"
                    className="flex flex-col items-center gap-1 rounded-full py-3 text-smoke ring-1 ring-edge transition hover:text-paper hover:ring-flash active:scale-[0.98] disabled:opacity-40"
                  >
                    <Share2 className="h-5 w-5" />
                    <span className="font-mono text-[9px]">Lainnya</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {note && (
            <p className="mt-3 flex items-center gap-1.5 font-mono text-[11px] text-flash">
              <Download className="h-3 w-3 shrink-0" />
              {note}
            </p>
          )}
        </div>

        {momentsEnabled && (
          <button
            onClick={() => setMomentsOpen(true)}
            className="btn-shape flex w-full items-center justify-center gap-2 rounded-full py-3 text-[13px] text-smoke ring-1 ring-edge transition hover:text-paper"
          >
            <Images className="h-4 w-4" />
            Lihat Momen Lainnya
          </button>
        )}
      </div>

      {momentsOpen && momentsEnabled && (
        <MomentsGallery event={event} onClose={() => setMomentsOpen(false)} />
      )}
    </section>
  );
}
