"use client";

import type { CopyOverrides, SessionConfig } from "@/lib/models/event";
import type { Subscription } from "@/lib/models/plan";
import { COPY_DEFAULTS } from "@/lib/copy";
import { InfoBox, Section, TextField, Toggle } from "./fields";

/**
 * Kontrol layar HASIL & BAGIKAN — layar terakhir, dan satu-satunya tempat
 * tamu bisa menyimpan hasilnya.
 *
 * Karena itu mematikan SEMUA tombol unduh diberi peringatan, bukan
 * dibiarkan diam-diam: klien yang tidak sengaja melakukannya baru sadar
 * saat acara sudah berjalan dan tamu tidak bisa membawa pulang apa pun.
 *
 * Warna tombol dan efek konfeti ikut template — lihat
 * lib/services/builderSteps.ts.
 */
export default function SessionResult({
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
  const momentsAllowed = subscription?.features.momentsGallery ?? true;
  const share = session.share;
  const noSave = !share.downloadPng && !share.downloadJpg && !share.downloadVideo;

  const setShare = (key: keyof SessionConfig["share"]) => (v: boolean) =>
    onSession({ share: { ...share, [key]: v } });

  return (
    <div>
      <Section label="Tulisan di layar ini">
        <TextField
          label="Label langkah"
          value={copy.stepResult ?? ""}
          onChange={(v) => onCopy({ stepResult: v })}
          placeholder={COPY_DEFAULTS.stepResult}
        />
      </Section>

      <Section label="Tombol unduh">
        <Toggle label="Unduh PNG" hint="Kualitas terbaik, ukuran berkas lebih besar." checked={share.downloadPng} onChange={setShare("downloadPng")} />
        <Toggle label="Unduh JPG" hint="Lebih ringan, cocok dikirim lewat chat." checked={share.downloadJpg} onChange={setShare("downloadJpg")} />
        <Toggle
          label="Unduh video pesan suara"
          hint="Hanya muncul kalau tamu benar-benar merekam suara."
          checked={share.downloadVideo}
          onChange={setShare("downloadVideo")}
        />
        {noSave && (
          <InfoBox>
            Semua unduhan mati — tamu bisa melihat hasilnya tapi tidak bisa menyimpannya. Pilih ini
            hanya kalau itu memang yang kamu mau.
          </InfoBox>
        )}
      </Section>

      <Section label="Tombol bagikan">
        <Toggle label="Bagikan ke Instagram" checked={share.instagram} onChange={setShare("instagram")} />
        <Toggle label="Bagikan ke WhatsApp" checked={share.whatsapp} onChange={setShare("whatsapp")} />
        <Toggle
          label="Tombol bagikan bawaan HP"
          hint="Membuka menu berbagi sistem — hanya muncul di perangkat yang mendukung."
          checked={share.nativeShare}
          onChange={setShare("nativeShare")}
        />
      </Section>

      <Section label="Galeri momen">
        <Toggle
          label="Tamu boleh melihat momen tamu lain"
          hint="Muncul sebagai tombol di layar ini dan di layar Selamat Datang."
          checked={session.moments.enabled && momentsAllowed}
          locked={!momentsAllowed}
          lockedReason="Belum termasuk paketmu — upgrade untuk mengaktifkan."
          onChange={(v) => onSession({ moments: { ...session.moments, enabled: v } })}
        />
        {session.moments.enabled && momentsAllowed && (
          <>
            <Toggle
              label="Tampilkan nama tamu di galeri"
              hint="Matikan bila acara ingin lebih privat."
              checked={session.moments.showGuestName}
              onChange={(v) => onSession({ moments: { ...session.moments, showGuestName: v } })}
            />
            <TextField
              label="Judul galeri"
              value={copy.momentsTitle ?? ""}
              onChange={(v) => onCopy({ momentsTitle: v })}
              placeholder={COPY_DEFAULTS.momentsTitle}
            />
            <TextField
              label="Teks saat galeri masih kosong"
              value={copy.momentsEmpty ?? ""}
              onChange={(v) => onCopy({ momentsEmpty: v })}
              placeholder={COPY_DEFAULTS.momentsEmpty}
              multiline
            />
          </>
        )}
      </Section>

      <Section label="Kalau kuota habis">
        <InfoBox>
          Tamu yang datang setelah kuota strip habis tidak sampai ke layar ini — mereka melihat
          pesan di bawah. Tulis nomor panitia di situ supaya mereka tahu harus ke mana.
        </InfoBox>
        <TextField
          label="Judul"
          value={copy.quotaExhaustedTitle ?? ""}
          onChange={(v) => onCopy({ quotaExhaustedTitle: v })}
          placeholder={COPY_DEFAULTS.quotaExhaustedTitle}
        />
        <TextField
          label="Penjelasan"
          value={copy.quotaExhaustedBody ?? ""}
          onChange={(v) => onCopy({ quotaExhaustedBody: v })}
          placeholder={COPY_DEFAULTS.quotaExhaustedBody}
          multiline
        />
      </Section>
    </div>
  );
}
