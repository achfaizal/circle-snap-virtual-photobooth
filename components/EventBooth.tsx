"use client";

import { useEffect, useState } from "react";
import { getEvent, readUsed, type EventTheme } from "@/lib/event";
import { useSession, type Step } from "@/lib/store";
import StepFrame from "./StepFrame";
import StepResult from "./StepResult";
import StepShoot from "./StepShoot";
import StepVoice from "./StepVoice";
import WelcomeScreen from "./WelcomeScreen";

const LABEL: Record<string, string> = {
  bingkai: "Pilih bingkai",
  potret: "Sesi foto",
  suara: "Pesan suara",
  struk: "Selesai",
};

/** Variable CSS yang dipakai ulang oleh setiap util Tailwind di seluruh
    komponen langkah. Override di sini saja sudah cukup untuk mengubah
    tampilan keseluruhan sesi — tidak ada komponen lain yang perlu tahu
    soal tema. */
function themeVars(theme: EventTheme): React.CSSProperties {
  return {
    "--color-ink": theme.ink,
    "--color-film": theme.film,
    "--color-edge": theme.edge,
    "--color-smoke": theme.smoke,
    "--color-paper": theme.paper,
    "--color-flash": theme.flash,
    "--color-live": theme.live,
    "--color-brand-purple": theme.brandPurple,
    "--color-brand-gold": theme.brandGold,
    "--color-brand-gold-deep": theme.brandGoldDeep,
    ...(theme.fontDisplay ? { "--font-display": theme.fontDisplay } : {}),
  } as React.CSSProperties;
}

export default function EventBooth({ code }: { code: string }) {
  const { event, step, used, attach } = useSession();
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const ev = getEvent(code);
    if (ev) attach(ev, readUsed(ev.code));
  }, [code, attach]);

  if (!event) return null;

  const left = Math.max(0, event.quota - used);
  const order: Step[] = event.voiceNoteEnabled
    ? ["bingkai", "potret", "suara", "struk"]
    : ["bingkai", "potret", "struk"];
  const at = order.indexOf(step);
  const theme = event.theme;
  const decorDir = theme?.decorDir;

  const body = !entered ? (
    <WelcomeScreen event={event} onEnter={() => setEntered(true)} />
  ) : (
    <main className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-28 pt-6 sm:px-8 sm:pb-16 sm:pt-10">
      <header className="mb-6">
        {/* Sisa kuota sengaja tidak ditampilkan ke tamu — itu informasi
            per-event untuk panitia/admin (nanti bagian model langganan),
            bukan sesuatu yang perlu dipantau tamu selama sesi foto. */}
        <div className="min-w-0">
          <h1 className="truncate font-display text-xl leading-tight tracking-tight">
            {event.names}
          </h1>
          <p className="mt-1 truncate font-mono text-[11px] text-smoke">
            {event.date} · {event.venue}
          </p>
        </div>

        {/* Penanda langkah: bilah, bukan angka 01/02/03. Tamu perlu tahu
            "tinggal sedikit lagi", bukan nomor urut. */}
        <div className="mt-5 flex items-center gap-2">
          {order.map((s, i) => (
            <div key={s} className="flex flex-1 items-center gap-2">
              <div
                className={`h-[3px] flex-1 rounded-full transition-all duration-500 ${
                  i <= at ? "brand-gradient" : "bg-edge"
                }`}
              />
            </div>
          ))}
        </div>
        <p className="tracked mt-2.5 font-mono text-[10px] text-smoke">
          {LABEL[step]}
        </p>
      </header>

      {left === 0 && step !== "struk" ? (
        <section className="rounded-2xl p-8 text-center ring-1 ring-edge">
          <h2 className="font-display text-xl">Sesi foto belum bisa dibuka</h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-smoke">
            Paket untuk acara ini sudah terpakai semua. Hubungi panitia kalau
            butuh tambahan.
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

  return (
    <div className="relative min-h-dvh bg-ink" style={themeVars(theme)}>
      {decorDir && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          {/* Bunga sudut dipakai ulang dari aset bingkai — satu gambar,
              dipantulkan/diputar lewat CSS ke keempat sudut, jadi tema tetap
              terasa dari selamat datang sampai struk tanpa aset tambahan.
              Sudut atas cuma muncul di layar selamat datang — begitu masuk
              ke langkah sesi, judul & progress bar butuh ruang di pojok itu,
              jadi hanya sudut bawah yang dipertahankan. */}
          {!entered && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${decorDir}/decor-tl.png`}
                alt=""
                className="absolute left-0 top-0 w-28 opacity-80 sm:w-40"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${decorDir}/decor-tl.png`}
                alt=""
                className="absolute right-0 top-0 w-28 -scale-x-100 opacity-80 sm:w-40"
              />
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${decorDir}/decor-tl.png`}
            alt=""
            className="absolute bottom-0 left-0 w-24 -scale-y-100 opacity-70 sm:w-36"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${decorDir}/decor-tl.png`}
            alt=""
            className="absolute bottom-0 right-0 w-24 -scale-x-100 -scale-y-100 opacity-70 sm:w-36"
          />
        </div>
      )}
      {body}
    </div>
  );
}
