"use client";

import { useState } from "react";
import type { EventConfig } from "@/lib/event";
import { STANDARD_TOKEN_KEYS } from "@/lib/event";
import { resolveCopy } from "@/lib/copy";
import { useSession } from "@/lib/store";
import { Images } from "./icons";
import MomentsGallery from "./MomentsGallery";

/** Inisial dari "Salma & Faizal" -> "S · F". Dipakai di monogram. */
function initials(names: string): string {
  return names
    .split("&")
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .join(" · ");
}

/** Kelopak bunga yang jatuh mengambang — posisi, ukuran, warna, dan waktu
    sengaja dibuat beda-beda per kelopak supaya gerakannya terasa organik,
    bukan berbaris rapi. */
const PETALS = [
  { left: "6%", size: 12, color: "var(--color-flash)", duration: "9s", delay: "0s" },
  { left: "18%", size: 9, color: "var(--color-brand-gold)", duration: "12s", delay: "2.5s" },
  { left: "34%", size: 15, color: "var(--color-flash)", duration: "8.5s", delay: "5s" },
  { left: "52%", size: 10, color: "var(--color-brand-purple)", duration: "11s", delay: "1s" },
  { left: "68%", size: 13, color: "var(--color-brand-gold)", duration: "10s", delay: "3.5s" },
  { left: "82%", size: 9, color: "var(--color-flash)", duration: "13s", delay: "6s" },
  { left: "92%", size: 12, color: "var(--color-brand-purple)", duration: "9.5s", delay: "4s" },
];

/** Bokeh — bulatan cahaya naik pelan (lihat .bokeh di globals.css).
    Ukuran/posisi/tempo sengaja tidak seragam supaya tidak terlihat
    seperti barisan gelembung yang dihasilkan mesin. */
const BOKEH = [
  { left: "8%", size: 90, color: "var(--color-flash)", duration: "17s", delay: "0s", opacity: 0.35 },
  { left: "26%", size: 54, color: "var(--color-brand-gold)", duration: "22s", delay: "5s", opacity: 0.3 },
  { left: "44%", size: 120, color: "var(--color-brand-purple)", duration: "19s", delay: "9s", opacity: 0.25 },
  { left: "63%", size: 68, color: "var(--color-flash)", duration: "25s", delay: "2.5s", opacity: 0.32 },
  { left: "80%", size: 100, color: "var(--color-brand-gold)", duration: "20s", delay: "12s", opacity: 0.28 },
  { left: "92%", size: 46, color: "var(--color-brand-purple)", duration: "16s", delay: "7s", opacity: 0.3 },
];

/** Kilau — bintik berdenyut (lihat .sparkle di globals.css). */
const SPARKLES = [
  { left: "12%", top: "18%", size: 5, duration: "3.2s", delay: "0s" },
  { left: "28%", top: "62%", size: 3, duration: "4.1s", delay: "1.2s" },
  { left: "41%", top: "12%", size: 4, duration: "3.6s", delay: "2.4s" },
  { left: "58%", top: "78%", size: 5, duration: "4.6s", delay: "0.6s" },
  { left: "71%", top: "28%", size: 3, duration: "3.9s", delay: "3s" },
  { left: "86%", top: "58%", size: 4, duration: "4.3s", delay: "1.8s" },
  { left: "19%", top: "86%", size: 3, duration: "3.4s", delay: "2.8s" },
  { left: "94%", top: "14%", size: 4, duration: "4.8s", delay: "0.9s" },
];

export default function WelcomeScreen({
  event,
  onEnter,
}: {
  event: EventConfig;
  onEnter: () => void;
}) {
  const [momentsOpen, setMomentsOpen] = useState(false);
  const { guestName, setGuestName, guestNameRequired } = useSession();
  const canEnter = !guestNameRequired || guestName.trim().length > 0;
  const copy = resolveCopy({ names: event.names, date: event.date, venue: event.venue, hashtag: event.hashtag }, event.copy);
  // Galeri momen bisa dimatikan klien (session.moments.enabled) — default
  // menyala supaya event lama tanpa field ini tidak berubah perilakunya.
  // JUGA terkunci kalau masa aktif 7 hari sudah habis (status "expired",
  // lib/services/eventLifecycle.ts) — beda dari "ended" (diakhiri panitia)
  // yang sengaja TETAP membuka momen.
  const momentsEnabled = (event.session?.moments?.enabled ?? true) && event.status !== "expired";

  const el = event.theme?.elements;
  const mono = {
    mode: el?.monogram?.mode ?? "initials",
    url: el?.monogram?.url,
    size: el?.monogram?.size ?? 64,
    ring: el?.monogram?.ring ?? true,
  };
  // Foto besar layar sambutan (peran foto pasangan di undangan digital).
  // Default "hidden" — playground sebelum fitur ini tidak punya slot foto
  // sama sekali, event lama tidak boleh tiba-tiba menampilkan kotak kosong.
  // Mode apa pun diabaikan kalau fotonya belum diunggah (url kosong).
  const hero = {
    mode: el?.heroPhoto?.url ? (el.heroPhoto.mode ?? "hidden") : "hidden",
    url: el?.heroPhoto?.url,
    size: el?.heroPhoto?.size ?? 160,
    overlay: Math.max(0, Math.min(90, el?.heroPhoto?.overlay ?? 45)),
  };

  // Bentuk tombol: "pill" = rounded-full (perilaku lama).
  const btnRadius =
    el?.buttonShape === "square" ? 8 : el?.buttonShape === "rounded" ? 18 : 9999;

  // Undefined = perilaku lama (semua nyala) — event yang belum pernah
  // menyimpan `theme.effects` (termasuk EVENTS hardcode di lib/event.ts)
  // tidak boleh berubah tampilannya sama sekali. Lihat docs/blueprint/
  // 05-peta-jalan.md Fase 2 "toggle efek".
  const effects = event.theme?.effects;
  const showBlobs = effects?.blobs ?? true;
  const showPetals = effects?.petals.enabled ?? true;
  const petalCount = Math.max(0, Math.min(effects?.petals.count ?? PETALS.length, PETALS.length));
  const visiblePetals = PETALS.slice(0, petalCount);
  // Efek BARU (2026-08-12) default MATI, bukan menyala seperti dua di
  // atas — event yang sudah berjalan tidak boleh tiba-tiba dapat animasi
  // yang tidak pernah dipilih panitianya.
  const showBokeh = effects?.bokeh ?? false;
  const showSparkle = effects?.sparkle ?? false;

  return (
    <div className="relative flex min-h-[calc(100dvh-3rem)] flex-col items-center justify-center overflow-hidden px-6 py-16 text-center">
      {/* Foto latar penuh (mode "cover") — digambar PALING BAWAH, sebelum
          efek ambien, supaya kelopak/bokeh tetap melayang DI ATAS foto.
          Lapisan gelap di atasnya wajib: tanpa itu teks putih di atas foto
          terang jadi tidak terbaca sama sekali. */}
      {hero.mode === "cover" && hero.url && (
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element -- foto unggahan klien, bukan aset build */}
          <img src={hero.url} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-ink" style={{ opacity: hero.overlay / 100 }} />
        </div>
      )}

      {/* Cahaya ambien yang mengambang pelan — cuma di layar selamat datang,
          supaya kesan pertama terasa hidup sebelum tamu masuk ke sesi
          fungsional. Warnanya ikut tema event lewat CSS variable yang
          sama dipakai brand-gradient, jadi otomatis menyesuaikan tiap
          acara tanpa kode tambahan. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        {showBlobs && (
          <>
            <div className="blob floating -left-16 -top-16 h-64 w-64 bg-brand-purple" />
            <div className="blob floating-slow -right-14 top-1/3 h-56 w-56 bg-flash" />
            <div className="blob floating bottom-[-4rem] left-1/4 h-52 w-52 bg-brand-gold" />
          </>
        )}
        {showPetals &&
          visiblePetals.map((p, i) => (
            <span
              key={i}
              className="petal"
              style={{
                left: p.left,
                width: p.size,
                height: p.size,
                background: p.color,
                animationDuration: p.duration,
                animationDelay: p.delay,
              }}
            />
          ))}
        {showBokeh &&
          BOKEH.map((b, i) => (
            <span
              key={`bokeh-${i}`}
              className="bokeh"
              style={{
                left: b.left,
                width: b.size,
                height: b.size,
                background: b.color,
                opacity: b.opacity,
                animationDuration: b.duration,
                animationDelay: b.delay,
              }}
            />
          ))}
        {showSparkle &&
          SPARKLES.map((s, i) => (
            <span
              key={`sparkle-${i}`}
              className="sparkle"
              style={{
                left: s.left,
                top: s.top,
                width: s.size,
                height: s.size,
                background: "var(--color-flash)",
                boxShadow: "0 0 6px var(--color-flash)",
                animationDuration: s.duration,
                animationDelay: s.delay,
              }}
            />
          ))}
      </div>

      <div className="step-enter relative z-10 flex flex-col items-center">
        {/* Foto bulat (mode "circle") — menggantikan posisi monogram
            sebagai elemen utama. Monogram di bawah sengaja TIDAK ikut
            disembunyikan otomatis: klien boleh memakai keduanya (foto
            besar + inisial kecil) kalau memang mau, itu keputusan
            tampilan, bukan aturan sistem. */}
        {hero.mode === "circle" && hero.url && (
          <div
            className="mb-6 overflow-hidden rounded-full ring-1 ring-edge"
            style={{ width: hero.size, height: hero.size }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- foto unggahan klien */}
            <img src={hero.url} alt="" className="h-full w-full object-cover" />
          </div>
        )}

        {/* Monogram — bisa diatur klien lewat Visual Builder (sesi
            Selamat Datang): inisial otomatis, logo unggahan sendiri, atau
            disembunyikan. Default `initials` + ring + 64px = persis
            perilaku lama, jadi event yang datanya belum punya
            theme.elements tidak berubah sedikit pun. */}
        {mono.mode !== "hidden" && (
          <div
            className={`grid place-items-center overflow-hidden rounded-full ${mono.ring ? "ring-1 ring-edge" : ""}`}
            style={{ width: mono.size, height: mono.size }}
          >
            {mono.mode === "image" && mono.url ? (
              // eslint-disable-next-line @next/next/no-img-element -- aset klien, ukuran kecil
              <img src={mono.url} alt="" className="h-full w-full object-contain" />
            ) : (
              <span className="font-display text-lg tracking-wide text-flash">
                {initials(event.names)}
              </span>
            )}
          </div>
        )}

        <p className="tracked mt-7 font-mono text-[11px] text-smoke">
          {copy.welcomeKicker}
        </p>
        <h1 className="mt-3 max-w-xs font-display text-4xl leading-tight tracking-tight text-paper">
          {event.names}
        </h1>
        <p className="mt-4 font-mono text-[12px] leading-relaxed text-smoke">
          {event.date}
        </p>

        <p className="mt-8 max-w-xs text-[14px] leading-relaxed text-smoke">
          {event.greeting}
        </p>

        {/* Variabel dinamis per-template (Tahap 3 D-12, koreksi 16 Agu)
            — daftar generik label:nilai untuk variabel usedIn='welcome'
            DI LUAR 5 token standar (yang sudah tampil lewat
            event.names/event.date di atas, tidak boleh dobel). Tata
            letak SENGAJA generik sama untuk semua template (K11/AB-15:
            klien ubah isi bukan desain) — bukan layout custom per
            template. Baris dengan nilai kosong disembunyikan, bukan
            ditampilkan label tanpa isi. */}
        {event.variables
          ?.filter((v) => v.usedIn.includes("welcome") && !STANDARD_TOKEN_KEYS.has(v.key) && v.value.trim())
          .map((v) => (
            <p key={v.key} className="mt-2 max-w-xs text-[13px] leading-relaxed text-smoke">
              <span className="text-flash">{v.label}:</span> {v.value}
            </p>
          ))}

        {/* Nama tamu diminta di sini, bukan di step terpisah — supaya
            pengantin nanti tahu tiap foto/pesan suara di galeri Momen itu
            dari siapa. Tombol "Mulai sesi foto" sengaja baru MUNCUL setelah
            nama diisi (bukan sekadar disabled), jadi jelas ini langkah yang
            diminta, bukan field opsional yang gampang dilewati. */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canEnter) onEnter();
          }}
          className="mt-8 w-full max-w-[240px]"
        >
          <input
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder={copy.guestNamePlaceholder}
            maxLength={40}
            autoComplete="name"
            className="name-input w-full border-b border-edge bg-transparent px-1 pb-2 text-center font-display text-lg tracking-tight text-paper placeholder:text-smoke/60 focus:border-flash focus:outline-none"
          />

          {canEnter && (
            <button
              type="submit"
              className="frame-slide-in btn-primary mt-6 w-full py-4 font-display text-base tracking-tight text-ink"
              style={{ borderRadius: btnRadius }}
            >
              {copy.welcomeCta}
            </button>
          )}
        </form>

        {/* Ajakan lihat momen tamu lain SEBELUM mulai sesi sendiri — supaya
            calon tamu bisa lihat contoh hasilnya dulu, bukan cuma tersedia
            di layar akhir setelah selesai foto. Tidak butuh nama diisi. */}
        {momentsEnabled && (
          <button
            onClick={() => setMomentsOpen(true)}
            className={`flex items-center justify-center gap-2 px-6 py-2.5 font-mono text-[11px] text-smoke ring-1 ring-edge transition hover:text-paper ${canEnter ? "mt-4" : "mt-6"}`}
            style={{ borderRadius: btnRadius }}
          >
            <Images className="h-3.5 w-3.5" />
            {copy.welcomeMomentsCta}
          </button>
        )}
      </div>

      {momentsOpen && momentsEnabled && (
        <MomentsGallery event={event} onClose={() => setMomentsOpen(false)} />
      )}
    </div>
  );
}
