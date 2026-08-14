"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Frame as FrameIcon, X, Zap } from "lucide-react";
import type { Event } from "@/lib/models/event";
import type { Theme } from "@/lib/models/theme";
import {
  allTemplateFrameIds,
  PLAYGROUND_TEMPLATES,
  type PlaygroundTemplate,
} from "@/lib/services/playgroundTemplates";
import { notifyEventSaved, showErrorToast, showSuccessToast } from "@/lib/utils";
import { buildPreviewPatch, PREVIEW_MESSAGE, PREVIEW_READY_MESSAGE } from "@/lib/services/livePreview";
import DeviceMockup, { PHONE_VIEWPORT } from "./DeviceMockup";
import Spinner from "./Spinner";
import TemplateSwatch from "./builder/TemplateSwatch";

/** Sama persis dengan applyTemplate di VisualBuilder.tsx — elements
    DIGABUNG, bukan ditimpa, supaya aset milik klien (logo, foto acara)
    tidak hilang cuma karena mencoba template lain. */
function mergeTemplate(prev: Theme, t: PlaygroundTemplate): Theme {
  return {
    ...prev,
    preset: t.id,
    colors: t.colors,
    effects: t.effects,
    videoCard: t.videoCard,
    fontDisplayId: t.fontDisplayId,
    // Aset BERSAMA milik template (dekorasi sudut, latar kartu video) —
    // ditimpa langsung seperti warna. Beda dari elements.monogram/
    // heroPhoto di bawah yang aset PRIBADI klien, sengaja dipertahankan.
    decorAssetId: t.decorAssetId,
    videoBgAssetId: t.videoBgAssetId,
    elements: {
      ...prev.elements,
      ...t.elements,
      monogram: {
        ...t.elements.monogram,
        ...prev.elements?.monogram,
        mode: prev.elements?.monogram?.mode ?? t.elements.monogram?.mode ?? "initials",
      },
      heroPhoto: prev.elements?.heroPhoto,
    },
  };
}

/**
 * MENU "TEMPLATE" — daftar kartu, klik untuk coba di pop-up hp, tombol
 * "Pakai Template Ini" untuk pasang. TANPA panel builder (warna/font/
 * bentuk/animasi satu-satu) — itu tetap ada di Visual Builder untuk yang
 * mau menyetel lebih jauh. Di sini murni: lihat pilihan, coba, pakai.
 */
export default function EventTemplatePicker({
  event,
  initialAssetUrls,
}: {
  event: Event;
  initialAssetUrls: Record<string, string>;
}) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState(event.templateId);
  const [previewing, setPreviewing] = useState<PlaygroundTemplate | null>(null);
  const [applying, setApplying] = useState(false);

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3" style={{ gap: 12 }}>
        {PLAYGROUND_TEMPLATES.map((t) => {
          const active = templateId === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setPreviewing(t)}
              className="relative text-left"
              style={{
                padding: 10,
                borderRadius: 16,
                border: `2px solid ${active ? "var(--a-clr-primary)" : "var(--a-clr-border)"}`,
                background: "white",
                cursor: "pointer",
              }}
            >
              {active && (
                <span
                  className="absolute grid place-items-center rounded-full"
                  style={{ top: -8, right: -8, width: 22, height: 22, background: "var(--a-clr-primary)" }}
                >
                  <Check size={13} color="white" />
                </span>
              )}
              <TemplateSwatch t={t} />
              <p style={{ fontSize: 13, fontWeight: 800, marginTop: 8, color: active ? "var(--a-clr-primary)" : "#0F172A" }}>
                {t.name}
              </p>
              <p style={{ fontSize: 11, lineHeight: 1.4, color: "var(--a-clr-text-muted)", marginTop: 1 }}>
                {t.hint}
              </p>
              <p
                className="flex items-center"
                style={{ gap: 4, fontSize: 10.5, color: "#94A3B8", marginTop: 5, fontWeight: 700 }}
              >
                <FrameIcon size={10} />
                {t.frameIds.length} bingkai selaras
              </p>
              {active && (
                <p style={{ fontSize: 10.5, fontWeight: 800, color: "var(--a-clr-primary)", marginTop: 4 }}>
                  Terpasang di acara ini
                </p>
              )}
            </button>
          );
        })}
      </div>

      {PLAYGROUND_TEMPLATES.length === 0 && (
        <div
          style={{
            borderRadius: 14,
            border: "1px dashed var(--a-clr-border)",
            padding: "28px 20px",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 14, fontWeight: 800, color: "#0F172A" }}>Template sedang disiapkan</p>
          <p
            style={{
              fontSize: 12.5,
              lineHeight: 1.6,
              color: "var(--a-clr-text-muted)",
              marginTop: 6,
              maxWidth: 380,
              marginInline: "auto",
            }}
          >
            Belum ada template yang bisa dipilih. Acaramu tetap bisa diatur lewat{" "}
            <strong>Detail Acara</strong> dan <strong>Visual Builder</strong> — tampilannya memakai
            gaya bawaan sampai template pertama tersedia.
          </p>
        </div>
      )}

      {PLAYGROUND_TEMPLATES.length === 1 && (
        <p style={{ fontSize: 11.5, lineHeight: 1.5, color: "var(--a-clr-text-muted)", marginTop: 14 }}>
          Template lain menyusul — belum ditawarkan sampai bingkainya benar-benar dirancang selaras,
          bukan sekadar dipasang-pasangkan.
        </p>
      )}

      {previewing && (
        <TemplatePreviewModal
          template={previewing}
          event={event}
          initialAssetUrls={initialAssetUrls}
          applying={applying}
          onClose={() => setPreviewing(null)}
          onApply={async () => {
            setApplying(true);
            try {
              const nextTheme = mergeTemplate(event.theme, previewing);
              const res = await fetch(`/api/admin/events/${event.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  theme: nextTheme,
                  templateId: previewing.id,
                  // Bingkai template ikut TERPASANG, bukan cuma "boleh
                  // dipilih" — template adalah paket siap pakai. Tanpa ini
                  // event baru tetap frameIds:[] dan tamu tidak bisa
                  // memotret sama sekali sampai klien sadar harus mampir
                  // ke menu Bingkai dan mencentangnya satu per satu.
                  //
                  // Bingkai UNGGAHAN KLIEN yang sudah terpasang tetap
                  // dipertahankan (yang tidak dimiliki template mana pun) —
                  // ganti template tidak boleh membuang desain yang dia
                  // kerjakan sendiri; yang dibuang cuma bingkai template LAMA.
                  //
                  // Identitas acara (nama, tanggal) SENGAJA tidak ikut —
                  // itu data klien yang sudah dia isi saat membuat event;
                  // `sample` di template cuma untuk pratinjau.
                  frameIds: [
                    ...previewing.frameIds,
                    ...event.frameIds.filter((id) => !allTemplateFrameIds().includes(id)),
                  ],
                }),
              });
              if (!res.ok) {
                const data = (await res.json().catch(() => null)) as { error?: string } | null;
                showErrorToast(data?.error ?? "Gagal menyimpan.");
                return;
              }
              setTemplateId(previewing.id);
              showSuccessToast(`Template "${previewing.name}" terpasang.`);
              notifyEventSaved();
              // templateId ikut menyaring Pustaka Bingkai — halaman itu Server
              // Component, jadi tanpa refresh daftarnya masih hasil saringan lama.
              router.refresh();
              setPreviewing(null);
            } catch {
              showErrorToast("Tidak bisa menghubungi server.");
            } finally {
              setApplying(false);
            }
          }}
        />
      )}
    </div>
  );
}

/** Pop-up "coba di hp" — mockup telepon menampilkan template TERPILIH
    (bukan tema tersimpan event), lewat jembatan pratinjau langsung yang
    sama dipakai Visual Builder. Menutup pop-up TIDAK menyimpan apa pun —
    cuma "Pakai Template Ini" yang menulis ke server. */
function TemplatePreviewModal({
  template,
  event,
  initialAssetUrls,
  applying,
  onClose,
  onApply,
}: {
  template: PlaygroundTemplate;
  event: Event;
  initialAssetUrls: Record<string, string>;
  applying: boolean;
  onClose: () => void;
  onApply: () => void;
}) {
  const [previewReady, setPreviewReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const previewTheme = useMemo(() => mergeTemplate(event.theme, template), [event.theme, template]);
  const draftPatch = useMemo(
    () => ({
      ...buildPreviewPatch(previewTheme, event.session, event.copy ?? {}, initialAssetUrls),
      // Identitas CONTOH milik template, menimpa data event klien —
      // inilah yang membuat pratinjau tampil sebagai etalase desain
      // ("Salma & Faizal") dan bukan sebagai event setengah jadi milik
      // klien ("q"). Hanya di pratinjau; tidak pernah ikut tersimpan.
      names: template.sample.names,
      date: template.sample.date,
      venue: template.sample.venue,
      hashtag: template.sample.hashtag,
      greeting: template.sample.greeting,
      brandLabel: template.sample.brandLabel,
    }),
    [previewTheme, event.session, event.copy, initialAssetUrls, template]
  );

  const sendDraft = () => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({ type: PREVIEW_MESSAGE, payload: draftPatch }, window.location.origin);
  };

  useEffect(() => {
    sendDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftPatch]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (e.data?.type === PREVIEW_READY_MESSAGE) {
        setPreviewReady(true);
        sendDraft();
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftPatch]);

  return (
    <div
      className="fixed inset-0 z-[130] grid place-items-center p-4"
      style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-sm flex-col items-center rounded-2xl bg-white"
        style={{ maxHeight: "92vh", overflowY: "auto", padding: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex w-full items-center justify-between" style={{ marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 900, color: "#0F172A" }}>{template.name}</p>
            <p style={{ fontSize: 11.5, color: "var(--a-clr-text-muted)" }}>Mencoba di layar HP tamu</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="grid h-8 w-8 place-items-center rounded-full text-[var(--a-clr-text-muted)] hover:bg-[var(--a-clr-bg)]"
          >
            <X size={16} />
          </button>
        </div>

        <div
          className="flex items-center"
          style={{
            gap: 6,
            fontSize: 10.5,
            fontWeight: 800,
            color: previewReady ? "var(--a-clr-success)" : "#94A3B8",
            marginBottom: 10,
          }}
        >
          <Zap size={11} aria-hidden fill={previewReady ? "var(--a-clr-success)" : "none"} />
          {previewReady ? "Pratinjau langsung" : "Menyambungkan…"}
        </div>

        <DeviceMockup>
          <iframe
            ref={iframeRef}
            src={`/e/${encodeURIComponent(event.slug)}`}
            width={PHONE_VIEWPORT.width}
            height={PHONE_VIEWPORT.height}
            allow=""
            style={{ border: "none", display: "block", background: "white" }}
            title={`Coba ${template.name}`}
          />
        </DeviceMockup>

        <div className="flex w-full" style={{ gap: 8, marginTop: 18 }}>
          <button
            onClick={onClose}
            className="flex-1"
            style={{
              padding: "12px",
              borderRadius: 12,
              fontSize: 13.5,
              fontWeight: 700,
              border: "1.5px solid var(--a-clr-border)",
              background: "white",
              color: "#0F172A",
              cursor: "pointer",
            }}
          >
            Batal
          </button>
          <button
            onClick={onApply}
            disabled={applying}
            className="flex flex-1 items-center justify-center gap-2 text-white disabled:opacity-50"
            style={{
              padding: "12px",
              borderRadius: 12,
              fontSize: 13.5,
              fontWeight: 800,
              border: "none",
              cursor: applying ? "wait" : "pointer",
              background: "linear-gradient(135deg, var(--a-clr-brand-1), var(--a-clr-brand-2))",
            }}
          >
            {applying && <Spinner size={14} />}
            {applying ? "Memasang…" : "Pakai Template Ini"}
          </button>
        </div>
      </div>
    </div>
  );
}
