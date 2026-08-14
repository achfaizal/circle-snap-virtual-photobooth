"use client";

import type { CopyOverrides, SessionConfig } from "@/lib/models/event";
import { COPY_DEFAULTS } from "@/lib/copy";
import { ChoiceRow, InfoBox, NumberField, Section, TextField, Toggle } from "./fields";
import FilterPicker from "./FilterPicker";

/**
 * Kontrol layar SESI FOTO — bagian yang paling menentukan rasa acaranya:
 * berapa lama tamu diberi waktu berpose, boleh mengulang berapa kali, dan
 * warna hasilnya.
 *
 * Beberapa pengaturan di sini sudah lama ada di model tapi tidak pernah
 * punya UI (countdownSeconds, mirror, autoContinue, revealMs) — event lama
 * memakai nilai bawaan tanpa klien tahu itu bisa diubah. Lihat
 * docs/blueprint/06-temuan-risiko.md T5.
 */
export default function SessionShoot({
  session,
  copy,
  onSession,
  onCopy,
}: {
  session: SessionConfig;
  copy: CopyOverrides;
  onSession: (patch: Partial<SessionConfig>) => void;
  onCopy: (patch: Partial<CopyOverrides>) => void;
}) {
  return (
    <div>
      <Section label="Tulisan di layar ini">
        <TextField
          label="Label langkah"
          value={copy.stepShoot ?? ""}
          onChange={(v) => onCopy({ stepShoot: v })}
          placeholder={COPY_DEFAULTS.stepShoot}
        />
      </Section>

      <Section label="Hitung mundur & pose">
        <ChoiceRow
          label="Hitung mundur sebelum jepret"
          value={session.countdownSeconds}
          options={[
            { value: 0, label: "Tanpa" },
            { value: 3, label: "3 detik" },
            { value: 5, label: "5 detik" },
            { value: 10, label: "10 detik" },
          ]}
          onChange={(v) => onSession({ countdownSeconds: v as SessionConfig["countdownSeconds"] })}
        />
        <ChoiceRow
          label="Bentuk area kamera"
          value={session.cameraAspect}
          options={[
            { value: "1:1", label: "1:1 kotak" },
            { value: "4:5", label: "4:5 potret" },
            { value: "3:4", label: "3:4 potret" },
          ]}
          onChange={(v) => onSession({ cameraAspect: v as SessionConfig["cameraAspect"] })}
        />
        <Toggle
          label="Cerminkan pratinjau kamera"
          hint="Seperti bercermin — tamu lebih mudah mengatur pose."
          checked={session.mirror}
          onChange={(v) => onSession({ mirror: v })}
        />
        <Toggle
          label="Lanjut otomatis ke slot berikutnya"
          hint="Tanpa perlu menekan tombol di antara jepretan."
          checked={session.autoContinue}
          onChange={(v) => onSession({ autoContinue: v })}
        />
        <NumberField
          label="Boleh ulang foto"
          value={session.maxRetakes}
          min={0}
          max={10}
          suffix="kali per slot"
          hint="0 = sekali jepret, tidak bisa diulang. Acara ramai biasanya 2–3."
          onChange={(v) => onSession({ maxRetakes: Math.max(0, Math.min(10, v)) })}
        />
      </Section>

      <Section label="Warna foto">
        <FilterPicker value={session.filterCss} onChange={(css) => onSession({ filterCss: css })} />
        <TextField
          label="Atau tulis filter CSS sendiri"
          value={session.filterCss}
          onChange={(v) => onSession({ filterCss: v })}
          placeholder="brightness(1.08) contrast(1.04) saturate(1.12)"
          hint="Dipakai bersama pratinjau kamera DAN hasil unduhan, jadi yang dilihat = yang didapat."
          mono
        />
      </Section>

      <Section label="Animasi cetak">
        <NumberField
          label="Durasi animasi strip keluar"
          value={session.revealMs}
          min={0}
          max={30000}
          suffix="milidetik"
          hint="0 = langsung tampil tanpa animasi. 2000–4000 terasa seperti foto sungguhan sedang dicetak."
          onChange={(v) => onSession({ revealMs: Math.max(0, Math.min(30000, v)) })}
        />
      </Section>

      <Section label="Catatan">
        <InfoBox>
          Di pratinjau, area kamera tampak kosong karena izin kamera sengaja tidak diminta untuk
          halaman admin. Semua pengaturan di atas tetap tersimpan dan berlaku di HP tamu.
        </InfoBox>
      </Section>
    </div>
  );
}
