"use client";

import { useEffect, useState } from "react";

/**
 * EVENT AKTIF — event yang terakhir dibuka klien.
 *
 * Kenapa perlu disimpan, bukan cukup dibaca dari URL: menu "Kelola Event"
 * di sidebar dan badge "AKTIF" di kartu daftar harus tetap menunjuk event
 * yang sama saat klien kembali ke /admin (Daftar Event) — dan URL di situ
 * tidak memuat id event apa pun. Pola yang sama dipakai referensi Glyka
 * PartyBox untuk "Pesta Aktif", dan direstui §9 UI-UX-DESIGN-SYSTEM.md
 * (localStorage + custom window event untuk sinkronisasi antar komponen).
 *
 * URL tetap jadi sumber kebenaran KALAU ada: membuka /admin/events/{id}
 * langsung (mis. dari tautan yang dibagikan) menjadikan event itu aktif,
 * tidak peduli apa isi localStorage.
 */
const KEY = "circlesnap:active-event";
const CHANGED = "circlesnap:active-event-changed";

function setActiveEventId(id: string): void {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(KEY) === id) return;
  window.localStorage.setItem(KEY, id);
  window.dispatchEvent(new Event(CHANGED));
}

export function clearActiveEventId(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(CHANGED));
}

/**
 * `null` pada render pertama (server & hidrasi awal) — localStorage tidak
 * ada di server, jadi membacanya langsung saat render akan membuat HTML
 * server dan klien berbeda. Pemanggil harus tahan terhadap null sesaat.
 */
export function useActiveEventId(fromUrl: string | null): string | null {
  const [stored, setStored] = useState<string | null>(null);

  useEffect(() => {
    const read = () => setStored(window.localStorage.getItem(KEY));
    read();
    window.addEventListener(CHANGED, read);
    return () => window.removeEventListener(CHANGED, read);
  }, []);

  // URL menang bila ada, sekaligus dicatat supaya bertahan saat pindah
  // ke halaman yang tidak membawa id (mis. kembali ke Daftar Event).
  useEffect(() => {
    if (fromUrl) setActiveEventId(fromUrl);
  }, [fromUrl]);

  return fromUrl ?? stored;
}
