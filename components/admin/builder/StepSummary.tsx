"use client";

import { AlertTriangle, Check } from "lucide-react";
import type { CopyOverrides, SessionConfig } from "@/lib/models/event";
import type { Theme } from "@/lib/models/theme";
import { templateById } from "@/lib/services/playgroundTemplates";
import { matchFilterPreset } from "@/lib/services/filters";
import { InfoBox, Section } from "./fields";
import { type BuilderStepId } from "@/lib/services/builderSteps";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-start justify-between gap-3"
      style={{ padding: "7px 0", borderBottom: "1px dashed var(--a-clr-border)" }}
    >
      <span style={{ fontSize: 12.5, color: "var(--a-clr-text-muted)" }}>{label}</span>
      <span className="text-right" style={{ fontSize: 12.5, fontWeight: 700, color: "#0F172A" }}>
        {value}
      </span>
    </div>
  );
}

/**
 * LANGKAH TERAKHIR — RINGKASAN.
 *
 * Bukan sekadar daftar bacaan: ini kesempatan terakhir menangkap
 * keputusan yang mungkin tidak disengaja (bingkai kosong, semua unduhan
 * mati) SEBELUM acara dipublikasikan ke tamu. Tiap peringatan
 * menyediakan tautan balik ke langkah yang bersangkutan.
 *
 * Peringatan kontras warna sengaja DIHAPUS bersama pindahnya gaya ke
 * template: warna sekarang datang dari template yang sudah dirancang
 * selaras, dan klien tidak punya cara mengubahnya dari builder — jadi
 * peringatan itu cuma bikin cemas tanpa memberi tombol untuk membereskan.
 * Keselarasan warna sekarang tanggung jawab kami saat membuat template,
 * bukan pekerjaan klien.
 */
export default function StepSummary({
  theme,
  session,
  copy,
  frameCount,
  templateId,
  onGoToStep,
}: {
  theme: Theme;
  session: SessionConfig;
  copy: CopyOverrides;
  frameCount: number;
  templateId?: string;
  onGoToStep: (id: BuilderStepId) => void;
}) {
  const template = templateById(templateId);
  const filter = matchFilterPreset(session.filterCss);

  const noDownload = !session.share.downloadPng && !session.share.downloadJpg && !session.share.downloadVideo;

  const warnings: { text: string; step: BuilderStepId }[] = [];
  if (frameCount === 0) {
    warnings.push({ text: "Belum ada bingkai — tamu tidak bisa memotret sama sekali.", step: "frame" });
  }
  if (noDownload) {
    warnings.push({ text: "Semua tombol unduh mati — tamu tidak bisa menyimpan hasilnya.", step: "result" });
  }

  return (
    <div>
      {warnings.length === 0 ? (
        <div
          className="flex items-start gap-2"
          style={{
            borderRadius: 12,
            border: "1px solid #A7F3D0",
            background: "#ECFDF5",
            padding: "12px 14px",
            marginBottom: 20,
          }}
        >
          <Check size={16} color="var(--a-clr-success)" className="mt-px shrink-0" />
          <p style={{ fontSize: 12.5, lineHeight: 1.55, color: "#065F46" }}>
            Semua terlihat beres. Simpan, lalu publikasikan lewat menu <strong>Publish</strong>.
          </p>
        </div>
      ) : (
        <div style={{ marginBottom: 20 }}>
          {warnings.map((w) => (
            <div
              key={w.step + w.text}
              className="flex items-start gap-2"
              style={{
                borderRadius: 12,
                border: "1px solid #FDE68A",
                background: "#FFFBEB",
                padding: "11px 13px",
                marginBottom: 8,
              }}
            >
              <AlertTriangle size={15} color="#D97706" className="mt-px shrink-0" />
              <div className="min-w-0 flex-1">
                <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "#92400E" }}>{w.text}</p>
                <button
                  type="button"
                  onClick={() => onGoToStep(w.step)}
                  style={{
                    fontSize: 11.5,
                    fontWeight: 800,
                    color: "#B45309",
                    background: "none",
                    border: "none",
                    padding: 0,
                    marginTop: 3,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Perbaiki sekarang →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Section label="Gaya dasar">
        <div>
          <Row label="Template" value={template?.name ?? "Belum dipilih"} />
        </div>
        <InfoBox>
          Warna, font, bentuk tombol, dan dekorasi mengikuti template ini — semuanya sudah
          diselaraskan sejak dirancang. Mau tampilan lain? Ganti templatenya di menu{" "}
          <strong>Template</strong>.
        </InfoBox>
      </Section>

      <Section label="Layar tamu">
        <div>
          <Row
            label="Monogram"
            value={
              theme.elements?.monogram?.mode === "image"
                ? "Logo sendiri"
                : theme.elements?.monogram?.mode === "hidden"
                  ? "Disembunyikan"
                  : "Inisial otomatis"
            }
          />
          <Row label="Bingkai terpasang" value={`${frameCount} bingkai`} />
          <Row
            label="Hitung mundur"
            value={session.countdownSeconds === 0 ? "Tanpa" : `${session.countdownSeconds} detik`}
          />
          <Row label="Filter warna" value={filter?.label ?? "Khusus (CSS sendiri)"} />
          <Row
            label="Pesan suara"
            value={session.voice.enabled ? `Nyala · maks ${session.voice.maxSeconds} detik` : "Mati"}
          />
          <Row label="Galeri momen" value={session.moments.enabled ? "Nyala" : "Mati"} />
        </div>
      </Section>

      <Section label="Sebelum menyimpan">
        <InfoBox>
          Menyimpan TIDAK mempublikasikan acara. Tamu baru bisa membuka playground setelah kamu
          mengisi jadwal di <strong>Detail Acara</strong> dan menekan Publikasikan di menu{" "}
          <strong>Publish</strong>.
          {Object.keys(copy).length > 0 && " Teks yang kamu ubah sudah ikut tersimpan."}
        </InfoBox>
      </Section>
    </div>
  );
}
