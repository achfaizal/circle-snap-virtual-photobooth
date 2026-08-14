"use client";

import { useEffect, useState } from "react";
import type { EventConfig } from "@/lib/event";
import { themeVars } from "@/lib/event";
import { resolveCopy } from "@/lib/copy";
import { useSession } from "@/lib/store";
import type { Template } from "@/lib/templates";
import { PREVIEW_MESSAGE, PREVIEW_READY_MESSAGE, type PreviewDraftMessage } from "@/lib/services/livePreview";
import StepFrame from "./StepFrame";
import StepResult from "./StepResult";
import StepShoot from "./StepShoot";
import StepVoice from "./StepVoice";
import WelcomeScreen from "./WelcomeScreen";

// Label sesi yang tampil di bawah nama acara — cukup teks kecil, bukan
// bilah progress, supaya tamu tetap tahu sedang di langkah mana tanpa
// header jadi ramai lagi. Sejak ada CopyOverrides, keempatnya diambil
// dari resolveCopy() (klien bisa mengubah lewat Visual Builder → Teks),
// bukan konstanta modul seperti dulu.

/**
 * Menerima event & sisa kuota SUDAH TERSELESAIKAN dari pemanggil (route
 * server component, lihat app/e/[slug]/page.tsx), bukan menyelesaikannya
 * sendiri lewat getEvent()/localStorage. Dua alasan:
 *
 *  1. Sumber data sekarang repository (lib/repo/), bukan array hardcoded
 *     — resolve-nya wajar dilakukan di server component yang sudah async,
 *     bukan di sini yang harus tetap "use client".
 *  2. `used` yang benar sekarang datang dari Subscription.stripUsed
 *     (server-authoritative), bukan localStorage tamu — localStorage
 *     TIDAK PERNAH benar-benar membatasi apa pun karena tiap perangkat
 *     punya hitungannya sendiri (docs/blueprint/06-temuan-risiko.md T1).
 *     `used` di sini cuma snapshot awal untuk gerbang "kuota habis" di
 *     bawah; penegakan sesungguhnya terjadi di POST /api/quota/claim saat
 *     struk keluar (lihat StepResult.tsx).
 */
export default function EventBooth({
  event: eventConfig,
  used: initialUsed,
  templates,
  previewStep,
}: {
  event: EventConfig;
  used: number;
  templates: Template[];
  /** Diisi HANYA oleh pratinjau admin (?preview=…) — memaksa playground
      langsung menampilkan satu layar tertentu supaya Visual Builder bisa
      mengedit layar itu sambil melihatnya. Tamu sungguhan tidak pernah
      mengirim parameter ini; alurnya tetap dari layar awal. */
  previewStep?: "bingkai" | "potret" | "suara" | "struk";
}) {
  const { event, step, used, attach } = useSession();
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    attach(eventConfig, initialUsed, templates);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventConfig.id ?? eventConfig.code, attach]);

  // Pratinjau langsung Visual Builder: menerima draft tema/sesi/teks lewat
  // postMessage dari jendela induk (admin) dan menerapkannya TANPA reload
  // — itulah yang membuat perubahan warna/font/toggle langsung terlihat
  // sebelum tombol Simpan ditekan. Lihat lib/services/livePreview.ts.
  //
  // Sengaja HANYA aktif kalau halaman ini benar-benar berada di dalam
  // iframe (window.self !== window.top). Tamu sungguhan TIDAK PERNAH
  // membuka playground lewat iframe, jadi listener ini nol pengaruh dan
  // nol biaya untuk mereka — bukan fitur yang "kebetulan aman", tapi
  // sengaja tidak pernah menyala di luar admin.
  useEffect(() => {
    if (typeof window === "undefined" || window.self === window.top) return;

    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === PREVIEW_MESSAGE) {
        useSession.getState().applyPreviewOverride((e.data as PreviewDraftMessage).payload);
      }
    }
    window.addEventListener("message", onMessage);

    // postMessage tidak antre: kalau induk mengirim draft SEBELUM listener
    // di atas terpasang (mis. iframe baru saja pindah layar), pesan itu
    // hilang begitu saja. Kabar "siap" ini memberi induk sinyal pasti
    // kapan harus mengirim ulang draft terakhirnya.
    window.parent.postMessage({ type: PREVIEW_READY_MESSAGE }, window.location.origin);

    return () => window.removeEventListener("message", onMessage);
  }, []);

  // 🐛 Perbaikan bug nyata (ditemukan 2026-08-12, bukan cuma dugaan): font
  // hasil UNDUHAN foto selalu memakai default global (Jakarta/Space Mono
  // dari app/layout.tsx), TIDAK PERNAH ikut font yang dipilih klien di
  // Visual Builder — walau LAYARNYA sudah benar menampilkan font event.
  //
  // Sebabnya: `themeVars(theme)` menaruh `--canvas-display` sebagai style
  // inline di <div> pembungkus di bawah (lihat `return` paling akhir
  // fungsi ini), TAPI lib/compositor.ts (`familyFor()`) dan lib/video.ts
  // membacanya lewat `getComputedStyle(document.documentElement)` — yaitu
  // elemen <html>, BUKAN <div> ini. CSS custom property tidak menjalar ke
  // ATAS; elemen leluhur tidak pernah melihat nilai yang diset di
  // keturunannya. Hasilnya <html> selalu memakai nilai bawaan yang disetel
  // app/layout.tsx, apa pun tema eventnya.
  //
  // Perbaikannya BUKAN membongkar compositor (menaruh parameter root di
  // 8+ titik pemanggilan compose()/renderVoiceCard() berisiko tinggi untuk
  // manfaat yang sama) — cukup naikkan nilainya ke <html> langsung di sini,
  // satu titik, setiap kali tema event berubah. `--canvas-font-<id>` yang
  // dirujuk `canvasFontDisplay` sudah pasti ada di <html> (didaftarkan
  // app/layout.tsx untuk semua 12 font di katalog), jadi override ini
  // aman diresolusi.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const value = event?.theme?.canvasFontDisplay;
    if (value) root.style.setProperty("--canvas-display", value);
    else root.style.removeProperty("--canvas-display");
    return () => {
      root.style.removeProperty("--canvas-display");
    };
  }, [event?.theme?.canvasFontDisplay]);

  // Melompat ke layar yang sedang diedit admin. Layar setelah "bingkai"
  // butuh state yang biasanya lahir dari sesi nyata (bingkai terpilih,
  // foto terambil), jadi di sini diisi seadanya: bingkai pertama +
  // gambar abu-abu sebagai pengganti foto. Tanpa itu StepShoot/StepResult
  // dirender tanpa data dan tampil kosong — pratinjau yang menyesatkan
  // lebih buruk daripada tidak ada.
  useEffect(() => {
    if (!previewStep) return;
    let cancelled = false;

    (async () => {
      setEntered(true);
      const store = useSession.getState();
      const first = templates[0];

      if (previewStep === "bingkai" || !first) {
        store.goto("bingkai");
        return;
      }

      store.chooseTemplate(first); // ini juga memindahkan step ke "potret"

      if (previewStep === "potret") return;

      if (previewStep === "struk") {
        // Placeholder foto: kotak abu-abu seukuran tiap slot bingkai.
        const shots = await Promise.all(
          first.slots.map(async (s) => {
            const c = document.createElement("canvas");
            c.width = Math.max(1, Math.round(s.w));
            c.height = Math.max(1, Math.round(s.h));
            const ctx = c.getContext("2d");
            if (ctx) {
              ctx.fillStyle = "#cbd5e1";
              ctx.fillRect(0, 0, c.width, c.height);
              ctx.fillStyle = "#64748b";
              ctx.font = `${Math.round(c.width / 10)}px sans-serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText("Contoh foto", c.width / 2, c.height / 2);
            }
            return createImageBitmap(c);
          })
        );
        if (cancelled) return;
        shots.forEach((bmp) => useSession.getState().pushFrame(bmp));
      }

      if (!cancelled) useSession.getState().goto(previewStep);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewStep, templates]);

  if (!event) return null;

  const left = Math.max(0, event.quota - used);
  const ended = event.status === "ended";
  // Ditemukan saat membangun tab Publish admin (docs/blueprint/05 Fase 4):
  // status "draft" sebelumnya SAMA SEKALI tidak diperiksa di sini — event
  // yang belum "dipublikasikan" tetap bisa langsung dipakai tamu asal
  // tahu URL-nya. Sekarang digerbang persis seperti "ended"/kuota habis,
  // supaya tombol "Publikasikan (jadi Live)" di admin benar-benar berarti
  // sesuatu, bukan formalitas kosong.
  const draft = event.status === "draft";
  // Masa aktif (7 hari sejak Event.startAt, lib/services/eventLifecycle.ts)
  // sudah habis. BEDA dari "ended": "ended" itu keputusan sadar panitia
  // (galeri Momen tetap dibuka), "expired" itu batas komersial (galeri
  // JUGA terkunci — lihat gerbang momentsEnabled di WelcomeScreen/
  // StepResult). Dihitung server-side di toEventConfig(), bukan status
  // Event sungguhan — panitia tidak perlu melakukan apa pun.
  const expired = event.status === "expired";
  const theme = event.theme;
  const decorUrl = theme?.decorUrl;

  const copy = resolveCopy(
    { names: event.names, date: event.date, venue: event.venue, hashtag: event.hashtag },
    event.copy
  );
  const stepLabel: Record<string, string> = {
    bingkai: copy.stepFrame,
    potret: copy.stepShoot,
    suara: copy.stepVoice,
    struk: copy.stepResult,
  };

  const body = !entered ? (
    <WelcomeScreen event={event} onEnter={() => setEntered(true)} />
  ) : (
    <main className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-10 pt-5 sm:px-8 sm:pb-16 sm:pt-10">
      {/* Sisa kuota sengaja tidak ditampilkan ke tamu — itu informasi
          per-event untuk panitia/admin (nanti bagian model langganan),
          bukan sesuatu yang perlu dipantau tamu selama sesi foto.
          Header: sapaan besar (event.brandLabel, default "Happy Wedding"
          — event non-wedding mis. lamaran isi sendiri) jadi sapaan utama,
          nama acara di bawahnya, lalu label sesi kecil — semuanya center,
          dipakai sama di keempat langkah (bingkai/potret/suara/struk). */}
      <header className="mb-6 text-center">
        <p className="text-brand-gradient font-display text-2xl font-semibold leading-tight tracking-tight sm:text-4xl">
          {event.brandLabel ?? "Happy Wedding"}
        </p>
        <h1 className="mt-1.5 truncate font-display text-lg leading-tight tracking-tight text-smoke sm:text-xl">
          {event.names}
        </h1>
        <span className="tracked mt-3 inline-block rounded-full px-3 py-1 font-mono text-[10px] text-smoke ring-1 ring-edge">
          {stepLabel[step]}
        </span>
      </header>

      {/* previewStep hanya terisi kalau server sudah memastikan pemanggilnya
          pemilik event yang login (app/e/[slug]/page.tsx) — jadi aman dipakai
          melewati gerbang. Tanpa ini Visual Builder menampilkan "Acara ini
          belum dipublikasikan" di kelima layar, dan klien tidak pernah bisa
          menata acaranya sebelum publish. */}
      {(left === 0 || ended || draft || expired) && step !== "struk" && !previewStep ? (
        <section className="rounded-2xl p-8 text-center ring-1 ring-edge">
          <h2 className="font-display text-xl">
            {draft
              ? "Acara ini belum dipublikasikan"
              : expired
                ? "Masa aktif acara ini sudah habis"
                : ended
                  ? "Acara ini sudah selesai"
                  : copy.quotaExhaustedTitle}
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-smoke">
            {draft
              ? "Panitia masih menyiapkan acara ini. Coba pindai ulang QR kalau sudah waktunya acara dimulai."
              : expired
                ? "Paket 7 hari untuk acara ini sudah lewat masanya. Foto & video yang sudah ada masih tersimpan — hubungi panitia untuk membuka aksesnya kembali."
                : ended
                  ? "Sesi foto baru untuk acara ini sudah ditutup. Momen yang sudah ada masih bisa dilihat lewat tombol \"Lihat Momen\" di layar awal."
                  : copy.quotaExhaustedBody}
          </p>
        </section>
      ) : (
        <>
          {step === "bingkai" && <StepFrame />}
          {step === "potret" && <StepShoot />}
          {step === "suara" && <StepVoice />}
          {step === "struk" && <StepResult />}
        </>
      )}
    </main>
  );

  if (!theme) return body;

  // Bentuk tombol dipilih klien di Visual Builder dan berlaku untuk SEMUA
  // layar sekaligus — dikirim sebagai satu CSS var supaya tiap tombol lebar
  // (kelas .btn-shape) ikut tanpa harus dioper prop berlapis. Tombol bundar
  // seperti shutter kamera sengaja TIDAK memakai kelas itu: mengotakkan
  // shutter bukan pilihan gaya, itu kerusakan.
  const btnRadius =
    theme.elements?.buttonShape === "square"
      ? "8px"
      : theme.elements?.buttonShape === "rounded"
        ? "18px"
        : "9999px";

  return (
    <div
      className="relative min-h-dvh bg-ink"
      style={{ ...themeVars(theme), "--booth-btn-radius": btnRadius } as React.CSSProperties}
    >
      {decorUrl && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          {/* Bunga sudut dipakai ulang dari aset bingkai — satu gambar,
              dipantulkan/diputar lewat CSS ke keempat sudut, jadi tema
              terasa konsisten dari selamat datang sampai struk. Sekarang
              tetap tampil di keempat sisi sepanjang sesi (bukan cuma sudut
              bawah setelah masuk) — header sudah cukup ringkas untuk
              berbagi ruang dengan sudut atas. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={decorUrl}
            alt=""
            className="absolute left-0 top-0 w-24 opacity-80 sm:w-36"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={decorUrl}
            alt=""
            className="absolute right-0 top-0 w-24 -scale-x-100 opacity-80 sm:w-36"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={decorUrl}
            alt=""
            className="absolute bottom-0 left-0 w-24 -scale-y-100 opacity-70 sm:w-36"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={decorUrl}
            alt=""
            className="absolute bottom-0 right-0 w-24 -scale-x-100 -scale-y-100 opacity-70 sm:w-36"
          />
        </div>
      )}
      {body}
    </div>
  );
}
