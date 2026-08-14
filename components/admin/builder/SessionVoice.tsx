"use client";

import type { CopyOverrides, SessionConfig } from "@/lib/models/event";
import type { Subscription } from "@/lib/models/plan";
import { COPY_DEFAULTS } from "@/lib/copy";
import { InfoBox, NumberField, Section, TextField, Toggle } from "./fields";

/**
 * Kontrol layar PESAN SUARA.
 *
 * Warna tombol rekam dan seluruh palet kartu video sudah ikut template
 * (termasuk latar kartunya) — dulu semuanya bisa disetel di sini, satu
 * per satu, sampai belasan pemilih warna. Lihat lib/services/builderSteps.ts
 * untuk alasan pemangkasannya.
 */
export default function SessionVoice({
  session,
  copy,
  subscription,
  onSession,
  onCopy,
}: {
  session: SessionConfig;
  copy: CopyOverrides;
  subscription: Subscription | null;
  onSession: (patch: Partial<SessionConfig>) => void;
  onCopy: (patch: Partial<CopyOverrides>) => void;
}) {
  const allowed = subscription?.features.voiceNote ?? true;
  const cap = subscription?.maxVoiceSeconds ?? 15;
  const on = session.voice.enabled && allowed;

  return (
    <div>
      <Section label="Aktifkan layar ini">
        <Toggle
          label="Minta tamu merekam ucapan"
          hint="Kalau dimatikan, tamu langsung lompat dari sesi foto ke hasil."
          checked={on}
          locked={!allowed}
          lockedReason="Belum termasuk paketmu — upgrade untuk mengaktifkan."
          onChange={(v) => onSession({ voice: { ...session.voice, enabled: v } })}
        />
        {on && (
          <NumberField
            label="Durasi maksimal rekaman"
            value={session.voice.maxSeconds}
            min={3}
            max={cap}
            suffix={`detik · plafon paket ${cap}s`}
            hint="Pendek justru bagus — tamu tidak bingung harus bicara apa selama itu."
            onChange={(v) =>
              onSession({ voice: { ...session.voice, maxSeconds: Math.min(cap, Math.max(3, v)) } })
            }
          />
        )}
      </Section>

      {!on ? (
        <InfoBox>
          Layar ini sedang mati, jadi pratinjau di sebelah kanan melewatinya. Nyalakan dulu untuk
          menata tampilannya.
        </InfoBox>
      ) : (
        <>
          <Section label="Tulisan di layar ini">
            <TextField
              label="Label langkah"
              value={copy.stepVoice ?? ""}
              onChange={(v) => onCopy({ stepVoice: v })}
              placeholder={COPY_DEFAULTS.stepVoice}
            />
            <TextField
              label="Judul ajakan"
              value={copy.voiceTitle ?? ""}
              onChange={(v) => onCopy({ voiceTitle: v })}
              placeholder="Titip Pesan untuk {{names}}"
              hint="Default memecah nama pakai “ & ” — untuk acara non-pernikahan sebaiknya tulis sendiri di sini."
            />
            <TextField
              label="Kalimat pengantar"
              value={copy.voiceIntro ?? ""}
              onChange={(v) => onCopy({ voiceIntro: v })}
              placeholder={COPY_DEFAULTS.voiceIntro}
              multiline
            />
            <InfoBox>
              Kamu bisa memakai token <strong>{"{{names}}"}</strong>, <strong>{"{{date}}"}</strong>,{" "}
              <strong>{"{{venue}}"}</strong>, dan <strong>{"{{hashtag}}"}</strong> — nilainya diisi
              otomatis dari Detail Acara.
            </InfoBox>
          </Section>

          <InfoBox>
            Tampilan kartu video yang diunduh tamu — warna dan latarnya — sudah diatur oleh
            template. Di sini kamu cukup mengatur <strong>isinya</strong>.
          </InfoBox>
        </>
      )}
    </div>
  );
}
