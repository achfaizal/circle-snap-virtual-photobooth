"use client";

import { useState } from "react";
import { ImagePlus } from "lucide-react";
import type { CopyOverrides, SessionConfig } from "@/lib/models/event";
import type { Theme, ThemeElements } from "@/lib/models/theme";
import { COPY_DEFAULTS } from "@/lib/copy";
import { ChoiceRow, InfoBox, NumberField, Section, TextField, Toggle } from "./fields";

/** Baca ukuran gambar sebelum unggah — server memakainya sebagai metadata. */
function readImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Gagal membaca gambar."));
    };
    img.src = url;
  });
}

/**
 * LANGKAH 5 — LAYAR SELAMAT DATANG.
 *
 * Sejak Visual Builder jadi pemandu berurutan, panel ini HANYA berisi
 * yang khas layar ini: monogram + tulisan-tulisannya. Warna, font,
 * bentuk tombol, dan animasi sudah diputuskan di langkah 1–4 dan berlaku
 * global — menampilkannya lagi di sini cuma bikin klien ragu mana yang
 * benar-benar berlaku.
 */
export default function SessionWelcome({
  theme,
  session,
  copy,
  onTheme,
  onSession,
  onCopy,
  onAssetResolved,
}: {
  theme: Theme;
  session: SessionConfig;
  copy: CopyOverrides;
  onTheme: (patch: Partial<Theme>) => void;
  onSession: (patch: Partial<SessionConfig>) => void;
  onCopy: (patch: Partial<CopyOverrides>) => void;
  onAssetResolved: (assetId: string, url: string) => void;
}) {
  const [uploading, setUploading] = useState<"logo" | "hero" | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const el: ThemeElements = theme.elements ?? {};
  const mono = el.monogram ?? { mode: "initials" as const };
  const hero = el.heroPhoto ?? { mode: "hidden" as const };

  const setEl = (patch: Partial<ThemeElements>) => onTheme({ elements: { ...el, ...patch } });
  const setMono = (patch: Partial<NonNullable<ThemeElements["monogram"]>>) =>
    setEl({ monogram: { ...mono, ...patch } });
  const setHero = (patch: Partial<NonNullable<ThemeElements["heroPhoto"]>>) =>
    setEl({ heroPhoto: { ...hero, ...patch } });

  /** Satu jalur unggah untuk logo & foto — bedanya cuma ke mana hasilnya
      dipasang. `kind: "decor-corner"` dipakai keduanya karena route aset
      hanya mengenal tiga jenis, dan yang penting cuma pembatasan tipe
      berkas + kepemilikan, bukan labelnya. */
  const upload = async (file: File | undefined, target: "logo" | "hero") => {
    if (!file) return;
    setUploading(target);
    setUploadError(null);
    try {
      const { width, height } = await readImageSize(file);
      const form = new FormData();
      form.append("file", file);
      form.append("kind", "decor-corner");
      form.append("width", String(width));
      form.append("height", String(height));
      const res = await fetch("/api/admin/assets", { method: "POST", body: form });
      const data = (await res.json().catch(() => null)) as
        | { asset?: { id: string; url: string }; error?: string }
        | null;
      if (!res.ok || !data?.asset) {
        setUploadError(data?.error ?? "Gagal unggah.");
        return;
      }
      onAssetResolved(data.asset.id, data.asset.url);
      if (target === "logo") setMono({ mode: "image", assetId: data.asset.id });
      // Foto yang baru diunggah langsung ditampilkan bulat — mode
      // "hidden" setelah repot mengunggah cuma bikin klien mengira
      // unggahannya gagal.
      else setHero({ mode: hero.mode === "hidden" ? "circle" : hero.mode, assetId: data.asset.id });
    } catch {
      setUploadError("Tidak bisa menghubungi server.");
    } finally {
      setUploading(null);
    }
  };

  return (
    <div>
      <Section label="Foto acara">
        <ChoiceRow
          label="Tampilkan foto"
          value={hero.mode}
          options={[
            { value: "hidden", label: "Tanpa foto" },
            { value: "circle", label: "Bulat di atas nama" },
            { value: "cover", label: "Latar penuh" },
          ]}
          onChange={(v) => setHero({ mode: v as "hidden" | "circle" | "cover" })}
        />

        {hero.mode !== "hidden" && (
          <div style={{ borderRadius: 12, border: "1px solid var(--a-clr-border)", padding: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>Berkas foto</p>
            <p style={{ fontSize: 11, color: "var(--a-clr-text-muted)" }}>
              {hero.mode === "cover"
                ? "Foto tegak (potret) paling pas — akan memenuhi layar HP tamu."
                : "Bagian tengah foto yang dipakai — wajah sebaiknya di tengah."}
            </p>
            <label className="admin-btn admin-btn-outline admin-btn-sm mt-2 cursor-pointer">
              <ImagePlus size={13} />
              {uploading === "hero" ? "Mengunggah…" : hero.assetId ? "Ganti foto" : "Unggah foto"}
              <input
                type="file"
                accept="image/png,image/webp,image/jpeg"
                className="hidden"
                disabled={uploading !== null}
                onChange={(e) => upload(e.target.files?.[0], "hero")}
              />
            </label>
            {hero.assetId && (
              <p style={{ fontSize: 11, color: "var(--a-clr-success)", marginTop: 6 }}>
                Foto terpasang — lihat hasilnya di pratinjau.
              </p>
            )}
            {!hero.assetId && (
              <p style={{ fontSize: 11, color: "var(--a-clr-warning)", marginTop: 6 }}>
                Belum ada foto — layar tamu tetap tampil tanpa foto sampai kamu mengunggahnya.
              </p>
            )}
          </div>
        )}

        {hero.mode === "circle" && (
          <NumberField
            label="Ukuran foto"
            value={hero.size ?? 160}
            min={90}
            max={280}
            suffix="px"
            onChange={(v) => setHero({ size: Math.max(90, Math.min(280, v)) })}
          />
        )}
        {hero.mode === "cover" && (
          <NumberField
            label="Kepekatan lapisan gelap"
            value={hero.overlay ?? 45}
            min={0}
            max={90}
            suffix="% — makin tinggi, teks makin terbaca"
            onChange={(v) => setHero({ overlay: Math.max(0, Math.min(90, v)) })}
          />
        )}
      </Section>
      <Section label="Monogram / Logo">
        <ChoiceRow
          label="Tampilkan sebagai"
          value={mono.mode}
          options={[
            { value: "initials", label: "Inisial otomatis" },
            { value: "image", label: "Logo sendiri" },
            { value: "hidden", label: "Sembunyikan" },
          ]}
          onChange={(v) => setMono({ mode: v as "initials" | "image" | "hidden" })}
        />

        {mono.mode === "initials" && (
          <InfoBox>
            Diambil otomatis dari “Nama yang ditampilkan” — mis. “Salma &amp; Faizal” jadi
            <strong> S · F</strong>. Ubah namanya di menu Detail Acara.
          </InfoBox>
        )}

        {mono.mode === "image" && (
          <div style={{ borderRadius: 12, border: "1px solid var(--a-clr-border)", padding: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>Berkas logo</p>
            <p style={{ fontSize: 11, color: "var(--a-clr-text-muted)" }}>
              PNG transparan paling bagus. Bentuknya dipotong lingkaran.
            </p>
            <label className="admin-btn admin-btn-outline admin-btn-sm mt-2 cursor-pointer">
              <ImagePlus size={13} />
              {uploading === "logo" ? "Mengunggah…" : mono.assetId ? "Ganti logo" : "Unggah logo"}
              <input
                type="file"
                accept="image/png,image/webp,image/jpeg,image/svg+xml"
                className="hidden"
                disabled={uploading !== null}
                onChange={(e) => upload(e.target.files?.[0], "logo")}
              />
            </label>
            {mono.assetId && (
              <p style={{ fontSize: 11, color: "var(--a-clr-success)", marginTop: 6 }}>
                Logo terpasang — lihat hasilnya di pratinjau.
              </p>
            )}
            {uploadError && (
              <p style={{ fontSize: 11, color: "var(--a-clr-danger)", marginTop: 6 }}>{uploadError}</p>
            )}
          </div>
        )}

        {mono.mode !== "hidden" && (
          <>
            <NumberField
              label="Ukuran"
              value={mono.size ?? 64}
              min={40}
              max={140}
              suffix="px"
              onChange={(v) => setMono({ size: Math.max(40, Math.min(140, v)) })}
            />
            <Toggle
              label="Cincin tipis di sekeliling"
              checked={mono.ring ?? true}
              onChange={(v) => setMono({ ring: v })}
            />
          </>
        )}
      </Section>

      <Section label="Tulisan di layar ini">
        <TextField
          label="Teks kecil di atas nama"
          value={copy.welcomeKicker ?? ""}
          onChange={(v) => onCopy({ welcomeKicker: v })}
          placeholder={COPY_DEFAULTS.welcomeKicker}
        />
        <TextField
          label="Placeholder kolom nama tamu"
          value={copy.guestNamePlaceholder ?? ""}
          onChange={(v) => onCopy({ guestNamePlaceholder: v })}
          placeholder={COPY_DEFAULTS.guestNamePlaceholder}
        />
        <TextField
          label="Tulisan tombol mulai"
          value={copy.welcomeCta ?? ""}
          onChange={(v) => onCopy({ welcomeCta: v })}
          placeholder={COPY_DEFAULTS.welcomeCta}
        />
        <TextField
          label="Tulisan tombol lihat momen"
          value={copy.welcomeMomentsCta ?? ""}
          onChange={(v) => onCopy({ welcomeMomentsCta: v })}
          placeholder={COPY_DEFAULTS.welcomeMomentsCta}
        />
        <Toggle
          label="Nama tamu wajib diisi"
          hint="Kalau mati, tamu boleh langsung mulai tanpa mengisi nama."
          checked={session.guestNameRequired}
          onChange={(v) => onSession({ guestNameRequired: v })}
        />
        <InfoBox>
          Nama acara, tanggal, dan sambutan diambil dari menu <strong>Detail Acara</strong> —
          bukan diketik ulang di sini, supaya tidak ada dua versi yang bisa berbeda.
        </InfoBox>
      </Section>
    </div>
  );
}
