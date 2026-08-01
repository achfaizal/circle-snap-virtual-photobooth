"use client";

import { useEffect, useState } from "react";
import { getEvent, readUsed, type EventTheme } from "@/lib/event";
import { useSession } from "@/lib/store";
import StepFrame from "./StepFrame";
import StepResult from "./StepResult";
import StepShoot from "./StepShoot";
import StepVoice from "./StepVoice";
import WelcomeScreen from "./WelcomeScreen";

/** Label sesi yang tampil di bawah nama acara — cukup teks kecil, bukan
    bilah progress, supaya tamu tetap tahu sedang di langkah mana tanpa
    header jadi ramai lagi. */
const STEP_LABEL: Record<string, string> = {
  bingkai: "Pilih Bingkai",
  potret: "Sesi Foto",
  suara: "Pesan Suara",
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
  const theme = event.theme;
  const decorDir = theme?.decorDir;

  const body = !entered ? (
    <WelcomeScreen event={event} onEnter={() => setEntered(true)} />
  ) : (
    <main className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-10 pt-5 sm:px-8 sm:pb-16 sm:pt-10">
      {/* Sisa kuota sengaja tidak ditampilkan ke tamu — itu informasi
          per-event untuk panitia/admin (nanti bagian model langganan),
          bukan sesuatu yang perlu dipantau tamu selama sesi foto.
          Header: "Happy Wedding" jadi sapaan utama, nama acara di
          bawahnya, lalu label sesi kecil — semuanya center, dipakai sama
          di keempat langkah (bingkai/potret/suara/struk). */}
      <header className="mb-6 text-center">
        <p className="text-brand-gradient font-display text-2xl font-semibold leading-tight tracking-tight sm:text-4xl">
          Happy Wedding
        </p>
        <h1 className="mt-1.5 truncate font-display text-lg leading-tight tracking-tight text-smoke sm:text-xl">
          {event.names}
        </h1>
        <span className="tracked mt-3 inline-block rounded-full px-3 py-1 font-mono text-[10px] text-smoke ring-1 ring-edge">
          {STEP_LABEL[step]}
        </span>
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
              dipantulkan/diputar lewat CSS ke keempat sudut, jadi tema
              terasa konsisten dari selamat datang sampai struk. Sekarang
              tetap tampil di keempat sisi sepanjang sesi (bukan cuma sudut
              bawah setelah masuk) — header sudah cukup ringkas untuk
              berbagi ruang dengan sudut atas. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${decorDir}/decor-tl.png`}
            alt=""
            className="absolute left-0 top-0 w-24 opacity-80 sm:w-36"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${decorDir}/decor-tl.png`}
            alt=""
            className="absolute right-0 top-0 w-24 -scale-x-100 opacity-80 sm:w-36"
          />
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
