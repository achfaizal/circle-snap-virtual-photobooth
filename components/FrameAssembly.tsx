"use client";

import { useEffect } from "react";
import type { Template } from "@/lib/templates";
import StripCanvas from "./StripCanvas";

/**
 * Momen reveal setelah jepretan terakhir dikonfirmasi: strip yang sudah
 * jadi (komposisi akhir yang sama persis dengan hasil unduhan — dipakai
 * lewat StripCanvas, bukan ditiru ulang) "muncul" satu potong utuh dari
 * atas ke bawah seperti struk keluar dari printer, bukan tiap foto
 * berkembang sendiri-sendiri di slotnya.
 *
 * Durasinya jauh lebih lambat dari animasi `print-reveal` versi StepShoot
 * (lihat globals.css) — di-override lewat inline `animationDuration`
 * memakai keyframe yang sama, bukan bikin keyframe baru cuma beda angka.
 */
const REVEAL_MS = 15000;

export default function FrameAssembly({
  template,
  onDone,
}: {
  template: Template;
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, REVEAL_MS + 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template]);

  return (
    <section className="step-enter mx-auto max-w-md space-y-5 text-center">
      <div className="flex justify-center">
        {/* print-reveal dipasang di WRAPPER ini, bukan cuma di canvas —
            supaya bingkai (ring/border, sudut membulat) ikut "tercetak"
            bareng foto di dalamnya. Kalau cuma canvas yang dianimasikan,
            garis bingkai kelihatan penuh sejak awal walau isinya belum
            tercetak, jadi ada "garis hantu" bentuk bingkai kosong. */}
        <div
          className="print-reveal relative inline-block overflow-hidden rounded-2xl ring-1 ring-edge"
          style={{ animationDuration: `${REVEAL_MS}ms` }}
        >
          {/* Bilah gelap di ujung atas meniru slot tempat kertas keluar
              dari printer. */}
          <div className="absolute inset-x-0 top-0 z-10 h-2.5 bg-ink/90 shadow-[0_2px_6px_rgba(0,0,0,0.5)]" />
          {/* Garis bayangan yang "mendorong" kertas turun — durasi & easing
              disamakan persis dengan print-reveal di bawah supaya posisinya
              selalu pas di batas bagian yang sudah tercetak. */}
          <div
            className="print-edge pointer-events-none absolute inset-x-0 z-10 h-8"
            style={{
              animationDuration: `${REVEAL_MS}ms`,
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.08) 60%, transparent)",
            }}
          />
          <StripCanvas
            scale={0.6}
            natural
            className="max-h-[58dvh] max-w-full sm:max-h-[74dvh]"
          />
        </div>
      </div>
      <p className="tracked font-mono text-[11px] text-smoke">Print Virtual Booth</p>
    </section>
  );
}
