"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, RefreshCw, Save, TriangleAlert, Zap } from "lucide-react";
import type { CopyOverrides, Event, SessionConfig } from "@/lib/models/event";
import type { Theme } from "@/lib/models/theme";
import type { Subscription } from "@/lib/models/plan";
import { BUILDER_STEPS, indexOfStep, stepAt, type BuilderStepId } from "@/lib/services/builderSteps";
import { notifyEventSaved, showErrorToast, showSuccessToast } from "@/lib/utils";
import { buildPreviewPatch, PREVIEW_MESSAGE, PREVIEW_READY_MESSAGE } from "@/lib/services/livePreview";
import DeviceMockup, { PHONE_VIEWPORT } from "./DeviceMockup";
import Spinner from "./Spinner";
import StepRail from "./builder/StepRail";
import StepSummary from "./builder/StepSummary";
import SessionWelcome from "./builder/SessionWelcome";
import SessionFrame from "./builder/SessionFrame";
import SessionShoot from "./builder/SessionShoot";
import SessionVoice from "./builder/SessionVoice";
import SessionResult from "./builder/SessionResult";

/**
 * VISUAL BUILDER — pemandu 6 langkah berurutan (§11.8 UI-UX-DESIGN-SYSTEM).
 *
 * Bentuknya sengaja PEMANDU, bukan papan kontrol berisi semua tombol
 * sekaligus: klien yang baru pertama kali membukanya tidak perlu
 * memutuskan "mulai dari mana". Urutannya mengikuti perjalanan tamu:
 * Selamat Datang → Bingkai → Sesi Foto → Pesan Suara → Hasil.
 *
 * ⚠️ BUKAN alat desain. Warna, font, bentuk tombol, dekorasi, dan
 * animasi semuanya ikut template (menu **Template**) dan TIDAK bisa
 * diubah di sini — lihat alasannya di lib/services/builderSteps.ts. Yang
 * diatur di builder ini cuma ISI: nama, kata-kata, foto, dan perilaku
 * sesi.
 *
 * Dua hal yang TIDAK berubah, dan disengaja:
 *
 *  1. Struktur tiap layar tamu tetap (bukan kanvas drag-and-drop bebas).
 *     Playground ini dipakai acara sungguhan — tata letak yang sudah
 *     teruji di layar HP lebih berharga daripada kebebasan menggeser
 *     yang gampang menghasilkan layar rusak.
 *
 *  2. Pratinjau langsung: tiap perubahan dikirim ke iframe lewat
 *     postMessage dan diterapkan TANPA reload, TANPA menunggu Simpan.
 *     Tombol Simpan tetap wajib untuk PERSISTENSI, bukan untuk melihat.
 */
export default function VisualBuilder({
  event,
  subscription,
  initialAssetUrls,
  onSaved,
}: {
  event: Event;
  subscription: Subscription | null;
  initialAssetUrls: Record<string, string>;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [theme, setTheme] = useState<Theme>(event.theme);
  const [session, setSession] = useState<SessionConfig>(event.session);
  const [copy, setCopy] = useState<CopyOverrides>(event.copy ?? {});
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>(initialAssetUrls);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [previewToken, setPreviewToken] = useState(0);
  const [previewReady, setPreviewReady] = useState(false);

  const step = stepAt(stepIndex);
  const isLast = stepIndex === BUILDER_STEPS.length - 1;
  const previewSrc = `/e/${encodeURIComponent(event.slug)}${
    step.previewStep ? `?preview=${step.previewStep}` : ""
  }`;

  const goTo = (i: number) => {
    const next = Math.max(0, Math.min(i, BUILDER_STEPS.length - 1));
    setStepIndex(next);
    setFurthest((f) => Math.max(f, next));
  };
  const goToId = (id: BuilderStepId) => goTo(indexOfStep(id));

  const touched = () => {
    setDirty(true);
    setJustSaved(false);
  };
  const patchTheme = (p: Partial<Theme>) => {
    setTheme((t) => ({ ...t, ...p }));
    touched();
  };
  const patchSession = (p: Partial<SessionConfig>) => {
    setSession((s) => ({ ...s, ...p }));
    touched();
  };
  const patchCopy = (p: Partial<CopyOverrides>) => {
    setCopy((c) => ({ ...c, ...p }));
    touched();
  };
  const registerAssetUrl = (id: string, url: string) => {
    setAssetUrls((prev) => ({ ...prev, [id]: url }));
  };

  // --- Jembatan pratinjau langsung ---------------------------------------
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const draftPatch = useMemo(
    () => buildPreviewPatch(theme, session, copy, assetUrls),
    [theme, session, copy, assetUrls]
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

  // Iframe navigasi ulang (ganti langkah / muat ulang) me-reset halaman
  // sesaat sampai handshake berikutnya selesai.
  useEffect(() => {
    setPreviewReady(false);
  }, [step.previewStep, previewToken]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // templateId sengaja TIDAK dikirim — builder ini tidak lagi
        // memilih template (itu urusan menu Template). Mengirimnya cuma
        // membuka peluang menimpa balik pilihan yang baru saja diubah di
        // tab lain dengan nilai basi dari saat halaman ini dimuat.
        body: JSON.stringify({ theme, session, copy }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        showErrorToast(data?.error ?? "Gagal menyimpan.");
        return;
      }
      setDirty(false);
      setJustSaved(true);
      showSuccessToast("Tampilan acara tersimpan.");
      notifyEventSaved();
      // Halaman event lain (Ringkasan, Bingkai) Server Component — tanpa
      // refresh mereka masih menampilkan tema versi sebelum disimpan.
      router.refresh();
      onSaved?.();
      setTimeout(() => setJustSaved(false), 2500);
    } catch {
      showErrorToast("Tidak bisa menghubungi server.");
    } finally {
      setSaving(false);
    }
  };

  const accent = theme.colors.flash;
  const progress = ((stepIndex + 1) / BUILDER_STEPS.length) * 100;

  return (
    <div className="flex flex-col-reverse xl:flex-row xl:items-start" style={{ gap: 20 }}>
      {/* ============ KIRI: rel langkah ============ */}
      <div
        className="shrink-0 xl:sticky xl:top-4 xl:w-[212px]"
        style={{ background: "white", borderRadius: 18, border: "1px solid var(--a-clr-border)", padding: 14 }}
      >
        <StepRail current={stepIndex} furthest={furthest} onJump={goTo} />
      </div>

      {/* ============ TENGAH: kontrol langkah aktif ============ */}
      <div
        className="flex min-w-0 flex-col xl:sticky xl:top-4 xl:max-h-[calc(100vh-8rem)] xl:w-[382px] xl:shrink-0"
        style={{
          background: "white",
          borderRadius: 20,
          border: "1px solid var(--a-clr-border)",
          overflow: "hidden",
        }}
      >
        {/* Bilah kemajuan — satu-satunya penanda "berapa lagi sisanya". */}
        <div style={{ height: 3, background: "var(--a-clr-bg)" }}>
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "linear-gradient(90deg, var(--a-clr-brand-1), var(--a-clr-brand-2))",
              transition: "width 0.35s ease",
            }}
          />
        </div>

        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--a-clr-border)" }}>
          <p style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.1em", color: "#94A3B8" }}>
            LANGKAH {step.step} DARI {BUILDER_STEPS.length}
          </p>
          <p style={{ fontSize: 16, fontWeight: 900, color: "#0F172A", marginTop: 2 }}>
            {step.emoji} {step.label}
          </p>
          <p style={{ fontSize: 12, lineHeight: 1.45, color: "var(--a-clr-text-muted)", marginTop: 2 }}>
            {step.hint}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto" style={{ padding: "16px 16px 8px", minHeight: 240 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.16 }}
            >
              {step.id === "welcome" && (
                <SessionWelcome
                  theme={theme}
                  session={session}
                  copy={copy}
                  onTheme={patchTheme}
                  onSession={patchSession}
                  onCopy={patchCopy}
                  onAssetResolved={registerAssetUrl}
                />
              )}
              {step.id === "frame" && (
                <SessionFrame
                  eventId={event.id}
                  frameCount={event.frameIds.length}
                  copy={copy}
                  onCopy={patchCopy}
                />
              )}
              {step.id === "shoot" && (
                <SessionShoot session={session} copy={copy} onSession={patchSession} onCopy={patchCopy} />
              )}
              {step.id === "voice" && (
                <SessionVoice
                  session={session}
                  copy={copy}
                  subscription={subscription}
                  onSession={patchSession}
                  onCopy={patchCopy}
                />
              )}
              {step.id === "result" && (
                <SessionResult
                  session={session}
                  copy={copy}
                  subscription={subscription}
                  onSession={patchSession}
                  onCopy={patchCopy}
                />
              )}
              {step.id === "summary" && (
                <StepSummary
                  theme={theme}
                  session={session}
                  copy={copy}
                  frameCount={event.frameIds.length}
                  templateId={event.templateId}
                  onGoToStep={goToId}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ---- Navigasi: Kembali / Lanjut, Simpan hanya di langkah akhir ---- */}
        <div style={{ borderTop: "1px solid var(--a-clr-border)", padding: 14 }}>
          {dirty && (
            <p
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: "#D97706",
                marginBottom: 10,
                lineHeight: 1.45,
              }}
            >
              Sudah tampil di pratinjau, belum tersimpan.
            </p>
          )}
          <div className="flex items-center" style={{ gap: 8 }}>
            <button
              onClick={() => goTo(stepIndex - 1)}
              disabled={stepIndex === 0}
              className="flex items-center justify-center disabled:opacity-40"
              style={{
                gap: 5,
                padding: "11px 14px",
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 700,
                border: "1.5px solid var(--a-clr-border)",
                background: "white",
                color: "#0F172A",
                cursor: stepIndex === 0 ? "not-allowed" : "pointer",
              }}
            >
              <ArrowLeft size={14} />
              Kembali
            </button>

            {isLast ? (
              <button
                onClick={save}
                disabled={saving || !dirty}
                className="flex flex-1 items-center justify-center gap-2 text-white disabled:opacity-50"
                style={{
                  padding: "12px",
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 800,
                  border: "none",
                  cursor: saving || !dirty ? "not-allowed" : "pointer",
                  background: justSaved
                    ? "var(--a-clr-success)"
                    : "linear-gradient(135deg, var(--a-clr-brand-1), var(--a-clr-brand-2))",
                  transition: "background 0.3s",
                }}
              >
                {saving ? <Spinner size={15} /> : justSaved ? <Check size={16} /> : <Save size={16} />}
                {saving ? "Menyimpan…" : justSaved ? "Tersimpan!" : "Simpan Tampilan"}
              </button>
            ) : (
              <button
                onClick={() => goTo(stepIndex + 1)}
                className="flex flex-1 items-center justify-center gap-2 text-white"
                style={{
                  padding: "12px",
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 800,
                  border: "none",
                  cursor: "pointer",
                  background: "linear-gradient(135deg, var(--a-clr-brand-1), var(--a-clr-brand-2))",
                }}
              >
                Lanjut
                <ArrowRight size={15} />
              </button>
            )}
          </div>

          {/* Jalan keluar untuk yang cuma mau menambal satu hal di tengah
              jalan — tanpa ini mereka harus menekan Lanjut sampai akhir
              cuma untuk menyimpan satu perubahan warna. */}
          {!isLast && dirty && (
            <button
              onClick={save}
              disabled={saving}
              className="mt-2 w-full disabled:opacity-50"
              style={{
                padding: "8px",
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                border: "none",
                background: "transparent",
                color: "var(--a-clr-primary)",
                cursor: saving ? "wait" : "pointer",
              }}
            >
              {saving ? "Menyimpan…" : "Simpan sekarang tanpa menyelesaikan langkah"}
            </button>
          )}
        </div>
      </div>

      {/* ============ KANAN: kanvas pratinjau ============ */}
      <div
        className="relative flex flex-1 flex-col items-center justify-center"
        style={{
          minHeight: 520,
          padding: "20px 16px",
          borderRadius: 20,
          overflow: "hidden",
          backgroundImage: "radial-gradient(#CBD5E1 2px, transparent 2px)",
          backgroundSize: "32px 32px",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse at 50% 40%, ${accent} 0%, transparent 65%)`,
            opacity: 0.06,
            transition: "background 0.6s",
            pointerEvents: "none",
          }}
        />

        <div
          className="relative z-10 flex items-center"
          style={{
            gap: 10,
            background: "#1E293B",
            color: "white",
            borderRadius: 100,
            padding: "7px 15px",
            marginBottom: 10,
          }}
        >
          <span
            aria-hidden
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: previewReady ? "#10B981" : "#94A3B8",
              animation: previewReady ? "admin-pulse 2s ease-in-out infinite" : undefined,
            }}
          />
          <span style={{ fontSize: 11.5, fontWeight: 700 }}>
            {step.previewStep ? `Layar ${step.label}` : "Layar Selamat Datang"}
          </span>
          <button
            onClick={() => setPreviewToken((t) => t + 1)}
            aria-label="Muat ulang pratinjau"
            title="Muat ulang pratinjau"
            className="flex"
            style={{ color: "rgba(255,255,255,0.7)", background: "none", border: "none", cursor: "pointer" }}
          >
            <RefreshCw size={12} />
          </button>
        </div>

        <div
          className="relative z-10 mb-3 flex items-center"
          style={{ gap: 6, fontSize: 11, fontWeight: 800, color: previewReady ? "var(--a-clr-success)" : "#94A3B8" }}
        >
          <Zap size={12} aria-hidden fill={previewReady ? "var(--a-clr-success)" : "none"} />
          {previewReady ? "Pratinjau langsung — perubahan tampil seketika" : "Menyambungkan pratinjau…"}
        </div>

        <div className="relative z-10">
          <DeviceMockup>
            <iframe
              ref={iframeRef}
              key={`${step.previewStep ?? "welcome"}-${previewToken}`}
              src={previewSrc}
              width={PHONE_VIEWPORT.width}
              height={PHONE_VIEWPORT.height}
              /* Kamera & mikrofon sengaja TIDAK diizinkan — admin tidak
                 perlu menyalakan kameranya sendiri hanya untuk menata
                 warna tombol. */
              allow=""
              style={{ border: "none", display: "block", background: "white" }}
              title={`Pratinjau ${step.label}`}
            />
          </DeviceMockup>
        </div>

        {step.needsDevice && (
          <p
            className="relative z-10 flex items-center"
            style={{
              gap: 6,
              fontSize: 11.5,
              color: "var(--a-clr-warning)",
              marginTop: 12,
              maxWidth: 400,
              textAlign: "center",
            }}
          >
            <TriangleAlert size={13} aria-hidden className="shrink-0" />
            Layar ini memakai {step.needsDevice} saat dipakai tamu — di pratinjau sengaja
            dimatikan, jadi areanya tampak kosong.
          </p>
        )}
      </div>
    </div>
  );
}
