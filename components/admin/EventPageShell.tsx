"use client";

import type { Event } from "@/lib/models/event";
import PlaygroundPreview from "./PlaygroundPreview";

/**
 * Kerangka halaman untuk satu bagian event (Info, Bingkai, Publish).
 *
 * Menggantikan tab-bar lama: tiap bagian sekarang punya rutenya sendiri
 * dan berpindah lewat sidebar, jadi yang dibutuhkan di sini cuma judul
 * halaman + (opsional) pratinjau di kanan.
 *
 * Visual Builder TIDAK memakai kerangka ini — ia punya tata letak dua
 * panel sendiri dengan pratinjaunya menyatu (§11.8 design system).
 */
export default function EventPageShell({
  event,
  title,
  subtitle,
  withPreview,
  children,
}: {
  event: Event;
  title: string;
  subtitle?: string;
  /** Tampilkan pratinjau ponsel di kolom kanan (layar lebar). */
  withPreview?: boolean;
  children: React.ReactNode;
}) {
  const header = (
    <div style={{ marginBottom: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, color: "#0F172A", letterSpacing: "-0.03em" }}>{title}</h1>
      {subtitle && (
        <p style={{ fontSize: 14, color: "var(--a-clr-text-muted)", fontWeight: 500, marginTop: 4 }}>
          {subtitle}
        </p>
      )}
    </div>
  );

  if (!withPreview) {
    return (
      <div style={{ paddingBottom: 40 }}>
        {header}
        {children}
      </div>
    );
  }

  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start xl:gap-10" style={{ paddingBottom: 40 }}>
      <div className="min-w-0">
        {header}
        {children}
      </div>
      <div className="mt-10 xl:sticky xl:top-6 xl:mt-0">
        {/* Pratinjau memuat ulang sendiri saat mendengar EVENT_SAVED —
            lihat catatan di lib/utils.ts kenapa lewat window event. */}
        <PlaygroundPreview slug={event.slug} />
      </div>
    </div>
  );
}
