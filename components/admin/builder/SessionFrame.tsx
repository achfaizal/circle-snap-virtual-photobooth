"use client";

import Link from "next/link";
import { ArrowRight, Images } from "lucide-react";
import type { CopyOverrides } from "@/lib/models/event";
import { COPY_DEFAULTS } from "@/lib/copy";
import { InfoBox, Section, TextField } from "./fields";

/**
 * Kontrol layar PILIH BINGKAI.
 *
 * Isi carousel-nya sendiri (bingkai mana saja yang tampil dan urutannya)
 * TIDAK diatur di sini — itu menu Bingkai, yang punya pratinjau ukuran
 * penuh dan pengunggahan. Menduplikasi pemilihnya di dua tempat cuma
 * melahirkan pertanyaan "yang mana yang menang". Di sini hanya
 * tampilannya: label langkah dan warna kartu.
 */
export default function SessionFrame({
  eventId,
  frameCount,
  copy,
  onCopy,
}: {
  eventId: string;
  frameCount: number;
  copy: CopyOverrides;
  onCopy: (patch: Partial<CopyOverrides>) => void;
}) {
  return (
    <div>
      <Section label="Bingkai yang ditawarkan">
        <div
          className="flex items-center justify-between gap-3"
          style={{ borderRadius: 12, border: "1px solid var(--a-clr-border)", padding: "12px" }}
        >
          <div className="flex min-w-0 items-center" style={{ gap: 10 }}>
            <span
              className="grid shrink-0 place-items-center rounded-full"
              style={{ width: 34, height: 34, background: "var(--a-clr-primary-light)" }}
            >
              <Images size={16} color="var(--a-clr-primary)" aria-hidden />
            </span>
            <div className="min-w-0">
              <p style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>
                {frameCount} bingkai aktif
              </p>
              <p style={{ fontSize: 11, color: "var(--a-clr-text-muted)" }}>
                Urutannya = urutan yang dilihat tamu
              </p>
            </div>
          </div>
          <Link
            href={`/admin/events/${eventId}/frames`}
            className="admin-btn admin-btn-outline admin-btn-sm shrink-0"
          >
            Atur
            <ArrowRight size={13} />
          </Link>
        </div>
        {frameCount === 0 && (
          <InfoBox>
            Belum ada bingkai yang dipilih — tamu akan sampai di layar ini dan tidak menemukan
            apa pun. Pilih minimal satu di menu <strong>Bingkai</strong>.
          </InfoBox>
        )}
      </Section>

      <Section label="Tulisan di layar ini">
        <TextField
          label="Label langkah"
          value={copy.stepFrame ?? ""}
          onChange={(v) => onCopy({ stepFrame: v })}
          placeholder={COPY_DEFAULTS.stepFrame}
          hint="Teks kecil di bawah nama acara saat tamu ada di layar ini."
        />
      </Section>

      <Section label="Catatan">
        <InfoBox>
          Warna kartu bingkai, garis tepi, dan bentuk tombol layar ini ikut{" "}
          <strong>Palet</strong> &amp; <strong>Bentuk Tombol</strong> yang sudah kamu pilih di
          langkah awal — berlaku sama di semua layar supaya tampilannya tidak berganti-ganti di
          tengah sesi.
        </InfoBox>
      </Section>
    </div>
  );
}
