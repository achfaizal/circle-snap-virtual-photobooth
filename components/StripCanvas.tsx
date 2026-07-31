"use client";

import { useEffect, useRef } from "react";
import { compose } from "@/lib/compositor";
import { tokensFor } from "@/lib/event";
import { getFilter } from "@/lib/filters";
import { useSession } from "@/lib/store";

/**
 * Preview memanggil compose() dengan scale kecil; tombol unduh memanggil
 * fungsi yang sama dengan scale 1. Tidak ada tiruan berbasis CSS, jadi
 * "hasil unduhan beda dengan yang di layar" secara struktural tidak mungkin.
 */
export default function StripCanvas({
  scale = 0.45,
  className = "",
  fill = false,
  fitHeight = false,
}: {
  scale?: number;
  className?: string;
  /** Isi penuh induknya (posisi absolut) alih-alih mengikuti lebar alami —
      dipakai saat canvas ini jadi lapisan dasar di balik video kamera hidup. */
  fill?: boolean;
  /** Ikuti tinggi kotak pembungkus (yang punya aspect-ratio + max-height
      sendiri) alih-alih lebar penuh — dipakai supaya strip vertikal panjang
      tidak meluber di layar HP. Pembungkus wajib set aspect-ratio yang sama
      dengan template, kalau tidak gambar akan gepeng. */
  fitHeight?: boolean;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const { template, frames, filterId, mirror, event } = useSession();

  useEffect(() => {
    if (!template || !event || !holder.current) return;
    let dead = false;

    (async () => {
      const canvas = await compose({
        template,
        frames,
        filterCss: getFilter(filterId).css,
        mirror,
        tokens: tokensFor(event),
        scale,
      });
      if (dead || !holder.current) return;
      canvas.className = fill
        ? "absolute inset-0 h-full w-full object-cover"
        : fitHeight
          ? "block h-full w-full"
          : "block h-auto w-full";
      holder.current.replaceChildren(canvas);
    })();

    return () => {
      dead = true;
    };
  }, [template, frames, filterId, mirror, event, scale, fill, fitHeight]);

  return <div ref={holder} className={className} />;
}
