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
  natural = false,
}: {
  scale?: number;
  className?: string;
  /** Isi penuh induknya (posisi absolut) alih-alih mengikuti lebar alami —
      dipakai saat canvas ini jadi lapisan dasar di balik video kamera hidup. */
  fill?: boolean;
  /** Canvas menentukan ukurannya sendiri lewat max-height/max-width bawaan
      elemen replaced (persis seperti <img>), bukan mengikuti lebar induk.
      Ini SATU-SATUNYA cara yang konsisten di Chromium maupun WebKit — div
      pembungkus dengan aspect-ratio + max-height + width:auto TIDAK
      menyusut lebarnya di Safari (box block statis di sana mengisi lebar
      tersedia dulu, baru memotong tinggi lewat max-height, jadi rasio
      rusak). `className` di sini diterapkan langsung ke <canvas>, dan div
      pembungkus dibuat `display:contents` supaya tidak ikut memengaruhi
      layout — pemanggil wajib membungkusnya sendiri dengan elemen yang
      menyusut mengikuti konten (mis. inline-block atau flex item). */
  natural?: boolean;
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
        : natural
          ? `block h-auto w-auto ${className}`
          : "block h-auto w-full";
      holder.current.replaceChildren(canvas);
    })();

    return () => {
      dead = true;
    };
  }, [template, frames, filterId, mirror, event, scale, fill, natural, className]);

  return <div ref={holder} className={natural ? "contents" : className} />;
}
