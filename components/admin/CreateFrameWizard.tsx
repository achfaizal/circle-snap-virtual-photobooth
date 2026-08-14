"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Plus, Trash2, AlertTriangle } from "lucide-react";
import type { Slot } from "@/lib/models/frame";
import Spinner from "./Spinner";

const STEPS = ["Unggah PNG", "Koreksi Slot", "Detail & Simpan"] as const;
const PREVIEW_WIDTH = 300;

interface DetectedSlot extends Slot {
  fillRatio: number;
  suspicious: boolean;
}

interface DetectResponse {
  width: number;
  height: number;
  paper: string;
  slots: DetectedSlot[];
  warning?: string;
  error?: string;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="admin-label">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="admin-input"
      />
    </label>
  );
}

export default function CreateFrameWizard({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [detectWarning, setDetectWarning] = useState<string | null>(null);

  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [paper, setPaper] = useState("#FFFFFF");
  const [slots, setSlots] = useState<DetectedSlot[]>([]);
  const [slotSource, setSlotSource] = useState<"auto" | "manual" | "auto-adjusted">("auto");

  const [name, setName] = useState("");
  const [blurb, setBlurb] = useState("");
  const [printSize, setPrintSize] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const scale = width > 0 ? PREVIEW_WIDTH / width : 1;
  const previewHeight = height * scale;

  const pickFile = async (f: File | undefined) => {
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setDetecting(true);
    setDetectError(null);
    setDetectWarning(null);
    try {
      const form = new FormData();
      form.append("file", f);
      const res = await fetch("/api/admin/frames/detect", { method: "POST", body: form });
      const data = (await res.json().catch(() => null)) as DetectResponse | null;
      if (!res.ok || !data) {
        setDetectError(data?.error ?? "Gagal mendeteksi slot.");
        return;
      }
      setWidth(data.width);
      setHeight(data.height);
      setPaper(data.paper);
      setSlots(data.slots);
      setSlotSource("auto");
      if (data.warning) setDetectWarning(data.warning);
      setStep(1);
    } catch {
      setDetectError("Tidak bisa menghubungi server.");
    } finally {
      setDetecting(false);
    }
  };

  const updateSlot = (i: number, patch: Partial<Slot>) => {
    setSlots((s) => s.map((slot, idx) => (idx === i ? { ...slot, ...patch } : slot)));
    setSlotSource((src) => (src === "auto" ? "auto-adjusted" : src));
  };

  const removeSlot = (i: number) => {
    setSlots((s) => s.filter((_, idx) => idx !== i));
    setSlotSource((src) => (src === "auto" ? "auto-adjusted" : src));
  };

  const addSlot = () => {
    const w = Math.round(width * 0.4) || 200;
    const h = Math.round(height * 0.3) || 200;
    setSlots((s) => [
      ...s,
      {
        x: Math.round((width - w) / 2),
        y: Math.round((height - h) / 2),
        w,
        h,
        fillRatio: 1,
        suspicious: false,
      },
    ]);
    setSlotSource((src) => (src === "auto" ? "manual" : src));
  };

  const sortByY = () => {
    setSlots((s) => [...s].sort((a, b) => a.y - b.y));
  };

  const slotsValid = slots.length > 0;

  const submit = async () => {
    if (!file || !slotsValid) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const uploadForm = new FormData();
      uploadForm.append("file", file);
      uploadForm.append("kind", "frame-overlay");
      uploadForm.append("width", String(width));
      uploadForm.append("height", String(height));
      const uploadRes = await fetch("/api/admin/assets", { method: "POST", body: uploadForm });
      const uploadData = (await uploadRes.json().catch(() => null)) as
        | { asset?: { id: string }; error?: string }
        | null;
      if (!uploadRes.ok || !uploadData?.asset) {
        setSubmitError(uploadData?.error ?? "Gagal unggah gambar bingkai.");
        return;
      }

      const createRes = await fetch("/api/admin/frames", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          blurb,
          printSize,
          overlayAssetId: uploadData.asset.id,
          paper,
          width,
          height,
          slots: slots.map(({ x, y, w, h }) => ({ x, y, w, h })),
          slotSource,
        }),
      });
      const createData = (await createRes.json().catch(() => null)) as
        | { frame?: { id: string }; error?: string }
        | null;
      if (!createRes.ok || !createData?.frame) {
        setSubmitError(createData?.error ?? "Gagal menyimpan bingkai.");
        return;
      }

      router.refresh();
      onClose();
    } catch {
      setSubmitError("Tidak bisa menghubungi server.");
    } finally {
      setSubmitting(false);
    }
  };

  const canNext = step === 0 ? Boolean(previewUrl) && !detecting : step === 1 ? slotsValid : true;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.55)", backdropFilter: "blur(6px)" }}
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative z-[130] flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--a-radius-xl)] bg-white shadow-2xl"
        >
          <div className="flex items-start justify-between border-b border-[var(--a-clr-border)] px-7 py-6">
            <div>
              <h2 className="text-xl font-extrabold text-[#0F172A]">Buat Bingkai Baru</h2>
              <p className="mt-0.5 text-xs font-semibold text-[var(--a-clr-text-muted)]">
                Langkah {step + 1} dari {STEPS.length} — {STEPS[step]}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Tutup"
              className="grid h-9 w-9 place-items-center rounded-full bg-[var(--a-clr-bg)] text-[var(--a-clr-text-muted)] transition hover:text-[#0F172A]"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex gap-2 px-7 pt-5">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className="h-1.5 flex-1 rounded-full transition-all"
                style={{ background: i <= step ? "var(--a-clr-primary)" : "var(--a-clr-border)" }}
              />
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-7 py-6">
            {step === 0 && (
              <div>
                <h3 className="text-lg font-extrabold text-[#0F172A]">Unggah PNG bingkai</h3>
                <p className="text-sm text-[var(--a-clr-text-muted)]">
                  PNG transparan penuh di area foto (bukan putih opak) — kalau ragu, area yang
                  benar-benar transparan akan otomatis dikenali sebagai lubang foto.
                </p>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-[24px] border-2 border-dashed border-[var(--a-clr-border)] py-10 text-[var(--a-clr-text-muted)] transition hover:border-[var(--a-clr-primary)] hover:text-[var(--a-clr-primary)]"
                >
                  <Upload size={28} />
                  <span className="text-sm font-semibold">
                    {detecting ? "Mendeteksi slot…" : "Klik untuk pilih file PNG"}
                  </span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png"
                  className="hidden"
                  onChange={(e) => pickFile(e.target.files?.[0])}
                />

                {previewUrl && (
                  <div className="mt-4 flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element -- pratinjau upload lokal */}
                    <img
                      src={previewUrl}
                      alt=""
                      className="max-h-64 rounded-lg border border-[var(--a-clr-border)]"
                    />
                  </div>
                )}
                {detectError && (
                  <p className="mt-3 text-sm font-medium text-[var(--a-clr-danger)]">{detectError}</p>
                )}
              </div>
            )}

            {step === 1 && previewUrl && (
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-extrabold text-[#0F172A]">Koreksi slot foto</h3>
                  <button onClick={sortByY} className="text-xs font-semibold text-[var(--a-clr-primary)]">
                    Urutkan ulang (atas→bawah)
                  </button>
                </div>
                <p className="text-sm text-[var(--a-clr-text-muted)]">
                  {slots.length} slot terdeteksi. Ubah angka untuk geser/resize — kotak di gambar ikut
                  berubah langsung.
                </p>
                {detectWarning && (
                  <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                    <AlertTriangle size={14} className="shrink-0" />
                    {detectWarning}
                  </p>
                )}

                <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                  <div
                    className="relative shrink-0 overflow-hidden rounded-lg border border-[var(--a-clr-border)]"
                    style={{ width: PREVIEW_WIDTH, height: previewHeight }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- pratinjau upload lokal */}
                    <img src={previewUrl} alt="" className="h-full w-full object-contain" />
                    {slots.map((s, i) => (
                      <div
                        key={i}
                        className="absolute flex items-start justify-start"
                        style={{
                          left: s.x * scale,
                          top: s.y * scale,
                          width: s.w * scale,
                          height: s.h * scale,
                          border: `2px solid ${s.suspicious ? "#F97316" : "var(--a-clr-primary)"}`,
                          background: "rgba(25,118,243,0.12)",
                        }}
                      >
                        <span
                          className="m-0.5 rounded px-1 text-[10px] font-bold text-white"
                          style={{ background: s.suspicious ? "#F97316" : "var(--a-clr-primary)" }}
                        >
                          {i + 1}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="w-full flex-1 space-y-2">
                    {slots.map((s, i) => (
                      <div key={i} className="rounded-lg border border-[var(--a-clr-border)] p-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#0F172A]">
                            Slot {i + 1}
                            {s.suspicious && (
                              <span className="ml-1.5 text-amber-600" title="Bentuknya tidak persegi bersih, periksa lagi">
                                ⚠ periksa
                              </span>
                            )}
                          </span>
                          <button onClick={() => removeSlot(i)} aria-label={`Hapus slot ${i + 1}`} className="text-[var(--a-clr-danger)]">
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                          {(["x", "y", "w", "h"] as const).map((k) => (
                            <label key={k} className="block">
                              <span className="text-[10px] uppercase text-[var(--a-clr-text-muted)]">{k}</span>
                              <input
                                type="number"
                                value={s[k]}
                                onChange={(e) => updateSlot(i, { [k]: e.target.valueAsNumber || 0 })}
                                className="w-full rounded border border-[var(--a-clr-border)] px-1.5 py-1 text-xs"
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={addSlot}
                      className="admin-btn admin-btn-outline admin-btn-sm w-full justify-center"
                    >
                      <Plus size={14} />
                      Tambah slot manual
                    </button>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <Field label="Nama bingkai" value={name} onChange={setName} placeholder="Misal: Dua Foto Elegan" />
                <Field
                  label="Deskripsi singkat"
                  value={blurb}
                  onChange={setBlurb}
                  placeholder="Muncul di kartu pemilihan bingkai untuk tamu"
                />
                <Field
                  label="Ukuran cetak"
                  value={printSize}
                  onChange={setPrintSize}
                  placeholder='Misal: 2.7 × 6.6"'
                />
                <div className="rounded-lg border border-[var(--a-clr-border)] p-3 text-xs text-[var(--a-clr-text-muted)]">
                  {width}×{height}px · {slots.length} slot · warna dasar{" "}
                  <span
                    className="inline-block h-3 w-3 rounded-full align-middle"
                    style={{ background: paper }}
                  />{" "}
                  {paper}
                </div>
                {submitError && (
                  <p className="text-sm font-medium text-[var(--a-clr-danger)]">{submitError}</p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-[var(--a-clr-border)] px-7 py-5">
            <button
              onClick={() => (step === 0 ? onClose() : setStep((s) => s - 1))}
              className="admin-btn admin-btn-ghost"
            >
              {step === 0 ? "Batal" : "Kembali"}
            </button>
            {step < STEPS.length - 1 ? (
              <button
                onClick={() => canNext && setStep((s) => s + 1)}
                disabled={!canNext}
                className="admin-btn admin-btn-primary admin-btn-press"
              >
                Lanjut →
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={submitting || !name.trim()}
                className="admin-btn admin-btn-primary admin-btn-press"
              >
                {submitting && <Spinner size={14} />}
                {submitting ? "Menyimpan…" : "Simpan Bingkai"}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
