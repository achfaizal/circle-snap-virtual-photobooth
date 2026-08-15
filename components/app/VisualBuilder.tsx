"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import Spinner from "@/components/admin/Spinner";
import { Section, Toggle, TextField, ChoiceRow } from "@/components/admin/builder/fields";
import type { SessionConfig } from "@/lib/services/defaultSessionConfig";

export interface BuilderVariable {
  key: string;
  label: string;
  helpText: string | null;
  inputType: string;
  isRequired: boolean;
  usedIn: string[];
}

const USED_IN_LABEL: Record<string, string> = {
  welcome: "Selamat Datang",
  frame: "Bingkai",
  video_card: "Kartu Video",
  share: "Bagikan",
};

/**
 * Visual Builder dinamis (Langkah 7 Tahap 3, D-12, dok 06 §2.3/§3) —
 * form dibangun dari `variables` (props, dari `template_variables`
 * MILIK template acara) — TIDAK ADA field hardcode per template. Ganti
 * template acara (halaman /template) → props ini berubah → form ikut
 * berubah, tanpa menyentuh komponen ini sama sekali.
 *
 * Kontrol dasar (Section/Toggle/TextField/ChoiceRow) dipakai ULANG dari
 * components/admin/builder/fields.tsx (Visual Builder lama, Fase
 * sebelumnya) — sudah generik/bersih, tidak ditulis ulang.
 *
 * K11/AB-15: hanya ISI yang diedit di sini (variabel + identitas tetap +
 * perilaku sesi) — warna/font/posisi terkunci ke template, tidak ada
 * kontrol untuk itu di halaman ini sama sekali.
 */
export default function VisualBuilder({
  eventId,
  templateName,
  brandLabel,
  variables,
  initialValues,
  initialIdentity,
  initialSessionConfig,
}: {
  eventId: string;
  templateName: string;
  brandLabel: string;
  variables: BuilderVariable[];
  initialValues: Record<string, string>;
  initialIdentity: { displayNames: string; dateDisplay: string; hashtag: string; greeting: string; guestNameRequired: boolean };
  initialSessionConfig: SessionConfig;
}) {
  const router = useRouter();
  const [identity, setIdentity] = useState(initialIdentity);
  const [values, setValues] = useState(initialValues);
  const [session, setSession] = useState<SessionConfig>(initialSessionConfig);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const requiredMissing = variables.filter((v) => v.isRequired && !values[v.key]?.trim());
  const noDownload = !session.share.downloadPng && !session.share.downloadJpg && !session.share.downloadVideo;

  const save = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const [identityRes, variablesRes] = await Promise.all([
        fetch(`/api/app/events/${eventId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...identity, sessionConfig: session }),
        }),
        fetch(`/api/app/events/${eventId}/variables`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ values }),
        }),
      ]);
      if (!identityRes.ok) {
        const data = (await identityRes.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Gagal menyimpan identitas/sesi.");
        return;
      }
      if (!variablesRes.ok) {
        const data = (await variablesRes.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Gagal menyimpan variabel.");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Tidak bisa menghubungi server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <h1 style={{ fontSize: 20, fontWeight: 900, color: "#18181B", marginBottom: 2 }}>Visual Builder</h1>
      <p style={{ fontSize: 13, color: "#71717A", marginBottom: 20 }}>
        Template: <strong>{templateName}</strong> — warna, font, dan posisi mengikuti template. Kamu cuma mengubah isi.
      </p>

      <Section label="Sapaan & Identitas">
        <TextField label="Sapaan (terkunci template)" value={brandLabel} onChange={() => {}} hint="Tidak bisa diubah — bagian dari template." />
        <TextField label="Nama tampil ke tamu" value={identity.displayNames} onChange={(v) => setIdentity((p) => ({ ...p, displayNames: v }))} />
        <TextField label="Tanggal tampil" value={identity.dateDisplay} onChange={(v) => setIdentity((p) => ({ ...p, dateDisplay: v }))} />
        <TextField label="Sambutan" value={identity.greeting} onChange={(v) => setIdentity((p) => ({ ...p, greeting: v }))} multiline />
        <TextField label="Tagar" value={identity.hashtag} onChange={(v) => setIdentity((p) => ({ ...p, hashtag: v }))} />
        <Toggle
          label="Wajib isi nama tamu sebelum berfoto"
          checked={identity.guestNameRequired}
          onChange={(v) => setIdentity((p) => ({ ...p, guestNameRequired: v }))}
        />
      </Section>

      {variables.length > 0 && (
        <Section label="Variabel Template">
          {variables.map((v) => (
            <TextField
              key={v.key}
              label={`${v.label}${v.isRequired ? " *" : ""}`}
              hint={[v.helpText, `dipakai di: ${v.usedIn.map((u) => USED_IN_LABEL[u] ?? u).join(", ")}`].filter(Boolean).join(" — ")}
              value={values[v.key] ?? ""}
              onChange={(val) => setValues((p) => ({ ...p, [v.key]: val }))}
            />
          ))}
        </Section>
      )}

      <Section label="Sesi Foto">
        <ChoiceRow
          label="Hitung mundur"
          value={session.countdownSeconds}
          options={[
            { value: 0, label: "Tanpa" },
            { value: 3, label: "3 detik" },
            { value: 5, label: "5 detik" },
            { value: 10, label: "10 detik" },
          ]}
          onChange={(v) => setSession((p) => ({ ...p, countdownSeconds: v }))}
        />
        <ChoiceRow
          label="Rasio kamera"
          value={session.cameraAspect}
          options={[
            { value: "1:1", label: "1:1" },
            { value: "4:5", label: "4:5" },
            { value: "3:4", label: "3:4" },
          ]}
          onChange={(v) => setSession((p) => ({ ...p, cameraAspect: v }))}
        />
        <Toggle label="Lanjut otomatis antar-jepretan" checked={session.autoContinue} onChange={(v) => setSession((p) => ({ ...p, autoContinue: v }))} />
        <Toggle label="Cerminkan pratinjau kamera" checked={session.mirror} onChange={(v) => setSession((p) => ({ ...p, mirror: v }))} />
      </Section>

      <Section label="Pesan Suara">
        <Toggle
          label="Aktifkan pesan suara"
          checked={session.voice.enabled}
          onChange={(v) => setSession((p) => ({ ...p, voice: { ...p.voice, enabled: v } }))}
        />
        <TextField
          label="Ajakan pesan suara"
          value={session.voice.prompt}
          onChange={(v) => setSession((p) => ({ ...p, voice: { ...p.voice, prompt: v } }))}
          hint="Durasi maksimal dibatasi plafon paket — belum ditegakkan di Tahap 3."
        />
      </Section>

      <Section label="Hasil & Bagikan">
        <Toggle label="Unduh PNG" checked={session.share.downloadPng} onChange={(v) => setSession((p) => ({ ...p, share: { ...p.share, downloadPng: v } }))} />
        <Toggle label="Unduh JPG" checked={session.share.downloadJpg} onChange={(v) => setSession((p) => ({ ...p, share: { ...p.share, downloadJpg: v } }))} />
        <Toggle label="Unduh video" checked={session.share.downloadVideo} onChange={(v) => setSession((p) => ({ ...p, share: { ...p.share, downloadVideo: v } }))} />
        <Toggle label="Bagikan ke Instagram" checked={session.share.instagram} onChange={(v) => setSession((p) => ({ ...p, share: { ...p.share, instagram: v } }))} />
        <Toggle label="Bagikan ke WhatsApp" checked={session.share.whatsapp} onChange={(v) => setSession((p) => ({ ...p, share: { ...p.share, whatsapp: v } }))} />
        {noDownload && (
          <div style={{ display: "flex", gap: 8, padding: 12, borderRadius: 10, background: "#FEF2F2", border: "1px solid #FECACA" }}>
            <AlertTriangle size={16} color="#B91C1C" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: "#991B1B", fontWeight: 600 }}>
              Minimal satu tombol unduh (PNG/JPG/Video) harus menyala — kalau tidak, tamu tidak bisa membawa pulang apa pun.
            </p>
          </div>
        )}
      </Section>

      {requiredMissing.length > 0 && (
        <p style={{ fontSize: 12.5, color: "#B45309", marginBottom: 10 }}>
          Belum lengkap: {requiredMissing.map((v) => v.label).join(", ")}
        </p>
      )}
      {error && <p style={{ fontSize: 13, color: "#EF4444", marginBottom: 10 }}>{error}</p>}
      {saved && !error && <p style={{ fontSize: 13, color: "#16A34A", marginBottom: 10 }}>Tersimpan.</p>}

      <button
        type="button"
        onClick={save}
        disabled={busy || noDownload}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 20px",
          borderRadius: 100,
          border: "none",
          background: "linear-gradient(135deg, var(--a-clr-brand-1), var(--a-clr-brand-2))",
          color: "white",
          fontWeight: 800,
          fontSize: 13,
          cursor: busy || noDownload ? "not-allowed" : "pointer",
          opacity: busy || noDownload ? 0.6 : 1,
        }}
      >
        {busy && <Spinner size={14} />}
        {busy ? "Menyimpan…" : "Simpan"}
      </button>
    </div>
  );
}
