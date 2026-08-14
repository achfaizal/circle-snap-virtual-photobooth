"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Check,
  Eye,
  EyeOff,
  Lock,
  Plus,
  Save,
  Trash2,
  Type,
  Unlock,
} from "lucide-react";
import type { Frame, TextLayer } from "@/lib/models/frame";
import type { Template } from "@/lib/templates";
import { composeBase, drawTextLayers, measureTextLayers, type TextLayerBounds } from "@/lib/compositor";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { ChoiceRow, ColorField, InfoBox, NumberField, Section, TextField, Toggle } from "../builder/fields";
import Spinner from "../Spinner";

const TOKENS = [
  { key: "names", label: "Nama" },
  { key: "date", label: "Tanggal" },
  { key: "venue", label: "Lokasi" },
  { key: "hashtag", label: "Tagar" },
  { key: "code", label: "Kode" },
] as const;

const PREVIEW_WIDTH = 380;

/** Pilih hitam/putih yang paling terbaca di atas warna dasar — dipakai
    sebagai warna awal layer baru supaya tidak lahir tak terlihat di atas
    kertas gelap atau terang. Rumus luminans standar WCAG, disederhanakan. */
function readableOn(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "#0F172A";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.55 ? "#0F172A" : "#FFFFFF";
}

function makePlaceholder(w: number, h: number): Promise<ImageBitmap> {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const ctx = c.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#64748b";
    ctx.font = `${Math.max(10, Math.round(c.width / 9))}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Contoh foto", c.width / 2, c.height / 2);
  }
  return createImageBitmap(c);
}

function layerLabel(layer: TextLayer, index: number): string {
  if (layer.label?.trim()) return layer.label.trim();
  const firstLine = layer.text.split("\n")[0]?.trim();
  return firstLine ? firstLine.slice(0, 24) : `Layer ${index + 1}`;
}

export default function TextLayerEditor({ frame, assetUrl }: { frame: Frame; assetUrl: string }) {
  const [layers, setLayers] = useState<TextLayer[]>(() => frame.textLayers.map((l) => ({ ...l })));
  const [selected, setSelected] = useState<number | null>(layers.length > 0 ? 0 : null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [zoom, setZoom] = useState<"fit" | 1>("fit");

  const [sample, setSample] = useState({
    names: "Nama Panjang Pengantin & Pasangannya",
    date: "8 Agustus 2026",
    venue: "Grand Ballroom Hotel",
    hashtag: "#NamaAcara2026",
  });
  const tokens = useMemo(
    () => ({ ...sample, code: frame.id.slice(0, 6).toUpperCase() }),
    [sample, frame.id]
  );

  const wrapRef = useRef<HTMLDivElement>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const textCanvasRef = useRef<HTMLCanvasElement>(null);
  const measureCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const rafRef = useRef<number | null>(null);
  const layersRef = useRef(layers);
  layersRef.current = layers;

  const fitScale = PREVIEW_WIDTH / frame.width;
  const scale = zoom === "fit" ? fitScale : zoom;
  const canvasW = Math.round(frame.width * scale);
  const canvasH = Math.round(frame.height * scale);

  const [bounds, setBounds] = useState<TextLayerBounds[]>([]);

  // Lapisan dasar (kertas + foto contoh + overlay) — digambar SEKALI per
  // bingkai/zoom, bukan tiap gerakan drag. Ini alasan drag terasa ringan
  // walau bingkainya beresolusi tinggi (lihat docs/blueprint/07 §3).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const placeholders = await Promise.all(frame.slots.map((s) => makePlaceholder(s.w, s.h)));
        if (cancelled) return;
        const tpl: Template = {
          id: frame.id,
          name: frame.name,
          blurb: frame.blurb,
          width: frame.width,
          height: frame.height,
          printSize: frame.printSize,
          slots: frame.slots,
          overlay: assetUrl,
          paper: frame.paper,
          textLayers: [],
        };
        const base = await composeBase({ template: tpl, frames: placeholders, filterCss: "none", mirror: false, scale });
        if (cancelled) return;
        baseCanvasRef.current = base;
        scheduleRedraw();
      } catch {
        // Overlay gagal dimuat — composeBase sudah gagal-pelan (isi kertas
        // polos), jadi editor tetap bisa dipakai tanpa gambar latar.
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame.id, assetUrl, scale]);

  function scheduleRedraw() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(async () => {
      const canvas = textCanvasRef.current;
      const base = baseCanvasRef.current;
      if (!canvas || !base) return;
      canvas.width = base.width;
      canvas.height = base.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(base, 0, 0);
      await drawTextLayers(canvas, layersRef.current, tokens, scale);

      if (!measureCtxRef.current) {
        measureCtxRef.current = document.createElement("canvas").getContext("2d");
      }
      if (measureCtxRef.current) {
        setBounds(measureTextLayers(measureCtxRef.current, layersRef.current, tokens, scale));
      }
    });
  }

  useEffect(() => {
    scheduleRedraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers, tokens, scale]);

  const touch = () => {
    setDirty(true);
    setJustSaved(false);
  };

  const patchLayer = (index: number, patch: Partial<TextLayer>) => {
    setLayers((ls) => ls.map((l, i) => (i === index ? { ...l, ...patch } : l)));
    touch();
  };

  const addLayer = () => {
    const size = Math.round(frame.width * 0.055);
    const next: TextLayer = {
      text: "{{names}}",
      x: Math.round(frame.width / 2),
      y: Math.round(frame.height / 2),
      size,
      align: "center",
      color: readableOn(frame.paper),
      face: "display",
      weight: 600,
      tracking: 0,
      uppercase: false,
      maxWidth: Math.round(frame.width * 0.8),
      lineHeight: 1.2,
    };
    setLayers((ls) => [...ls, next]);
    setSelected(layers.length);
    touch();
  };

  const removeLayer = (index: number) => {
    setLayers((ls) => ls.filter((_, i) => i !== index));
    setSelected((s) => (s === null ? null : s === index ? null : s > index ? s - 1 : s));
    touch();
  };

  const moveLayer = (index: number, dir: -1 | 1) => {
    setLayers((ls) => {
      const to = index + dir;
      if (to < 0 || to >= ls.length) return ls;
      const copy = [...ls];
      [copy[index], copy[to]] = [copy[to], copy[index]];
      return copy;
    });
    setSelected((s) => (s === index ? index + dir : s === index + dir ? index : s));
    touch();
  };

  // --- Drag: geser layer terpilih dengan pointer -------------------------
  const dragRef = useRef<{ index: number; startX: number; startY: number; layerX: number; layerY: number } | null>(
    null
  );

  const onHandlePointerDown = (index: number, e: React.PointerEvent) => {
    if (layers[index].locked) {
      setSelected(index);
      return;
    }
    setSelected(index);
    dragRef.current = { index, startX: e.clientX, startY: e.clientY, layerX: layers[index].x, layerY: layers[index].y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onHandlePointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / scale;
    const dy = (e.clientY - d.startY) / scale;
    patchLayer(d.index, { x: Math.round(d.layerX + dx), y: Math.round(d.layerY + dy) });
  };
  const onHandlePointerUp = () => {
    dragRef.current = null;
  };

  // Panah keyboard menggeser layer terpilih — dimatikan otomatis kalau
  // fokus sedang di kolom teks, supaya tidak bentrok dengan menulis.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (selected === null) return;
      if (layers[selected]?.locked) return;
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      const step = e.shiftKey ? 10 : 1;
      let dx = 0;
      let dy = 0;
      if (e.key === "ArrowLeft") dx = -step;
      else if (e.key === "ArrowRight") dx = step;
      else if (e.key === "ArrowUp") dy = -step;
      else if (e.key === "ArrowDown") dy = step;
      else return;
      e.preventDefault();
      const l = layers[selected];
      patchLayer(selected, { x: l.x + dx, y: l.y + dy });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, layers]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/frames/${frame.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textLayers: layers }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        showErrorToast(data?.error ?? "Gagal menyimpan.");
        return;
      }
      setDirty(false);
      setJustSaved(true);
      showSuccessToast("Layer teks tersimpan.");
      setTimeout(() => setJustSaved(false), 2500);
    } catch {
      showErrorToast("Tidak bisa menghubungi server.");
    } finally {
      setSaving(false);
    }
  };

  const insertToken = (index: number, token: string) => {
    patchLayer(index, { text: `${layers[index].text}{{${token}}}` });
  };

  const active = selected !== null ? layers[selected] : null;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/admin/frames"
            className="inline-flex items-center gap-1.5 text-xs font-bold"
            style={{ color: "var(--a-clr-text-muted)" }}
          >
            <ArrowLeft size={13} /> Pustaka Bingkai
          </Link>
          <h1 className="mt-1 truncate" style={{ fontSize: 26, fontWeight: 900, color: "#0F172A" }}>
            {frame.name} · Atur Teks
          </h1>
          <p style={{ fontSize: 13, color: "var(--a-clr-text-muted)", fontWeight: 500 }}>
            Posisi nama & tanggal di sini berlaku untuk SEMUA acara yang memakai bingkai ini.
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="flex shrink-0 items-center gap-2 text-white disabled:opacity-50"
          style={{
            padding: "11px 20px",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 800,
            border: "none",
            cursor: saving || !dirty ? "not-allowed" : "pointer",
            background: justSaved
              ? "var(--a-clr-success)"
              : "linear-gradient(135deg, var(--a-clr-brand-1), var(--a-clr-brand-2))",
          }}
        >
          {saving ? <Spinner size={15} /> : justSaved ? <Check size={16} /> : <Save size={16} />}
          {saving ? "Menyimpan…" : justSaved ? "Tersimpan!" : "Simpan"}
        </button>
      </div>

      <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
        {/* ---------- KIRI: daftar layer ---------- */}
        <div
          className="w-full shrink-0 xl:w-[260px]"
          style={{ background: "white", borderRadius: 16, border: "1px solid var(--a-clr-border)", padding: 14 }}
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="uppercase" style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: "#94A3B8" }}>
              Layer teks
            </p>
            <button
              onClick={addLayer}
              className="flex items-center gap-1"
              style={{ fontSize: 11, fontWeight: 800, color: "var(--a-clr-primary)", background: "none", border: "none", cursor: "pointer" }}
            >
              <Plus size={13} /> Tambah
            </button>
          </div>

          {layers.length === 0 ? (
            <InfoBox>
              Belum ada layer teks. Bingkai ini murni desain — tambah layer untuk menaruh nama,
              tanggal, atau tagar yang otomatis terisi tiap acara.
            </InfoBox>
          ) : (
            <div className="flex flex-col" style={{ gap: 6 }}>
              {layers.map((l, i) => {
                const isSel = i === selected;
                return (
                  <div
                    key={i}
                    onClick={() => setSelected(i)}
                    role="button"
                    tabIndex={0}
                    className="flex cursor-pointer items-center"
                    style={{
                      gap: 8,
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: `1.5px solid ${isSel ? "var(--a-clr-primary)" : "var(--a-clr-border)"}`,
                      background: isSel ? "var(--a-clr-primary-light)" : "white",
                      opacity: l.hidden ? 0.55 : 1,
                    }}
                  >
                    <Type size={13} color={isSel ? "var(--a-clr-primary)" : "#94A3B8"} className="shrink-0" />
                    <span
                      className="min-w-0 flex-1 truncate"
                      style={{ fontSize: 12.5, fontWeight: 700, color: isSel ? "var(--a-clr-primary)" : "#0F172A" }}
                    >
                      {layerLabel(l, i)}
                    </span>
                    {l.locked && <Lock size={11} color="#94A3B8" className="shrink-0" />}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveLayer(i, -1);
                      }}
                      disabled={i === 0}
                      aria-label="Naikkan urutan"
                      className="shrink-0 disabled:opacity-30"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8" }}
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveLayer(i, 1);
                      }}
                      disabled={i === layers.length - 1}
                      aria-label="Turunkan urutan"
                      className="shrink-0 disabled:opacity-30"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8" }}
                    >
                      <ArrowDown size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <p style={{ fontSize: 10.5, color: "var(--a-clr-text-muted)", marginTop: 10, lineHeight: 1.5 }}>
            Urutan = urutan gambar. Paling bawah di daftar = paling depan di kanvas.
          </p>

          <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--a-clr-border)" }}>
            <p className="uppercase" style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: "#94A3B8", marginBottom: 8 }}>
              Data contoh di pratinjau
            </p>
            <div className="flex flex-col" style={{ gap: 6 }}>
              <TextField label="Nama" value={sample.names} onChange={(v) => setSample((s) => ({ ...s, names: v }))} />
              <TextField label="Tanggal" value={sample.date} onChange={(v) => setSample((s) => ({ ...s, date: v }))} />
              <TextField label="Lokasi" value={sample.venue} onChange={(v) => setSample((s) => ({ ...s, venue: v }))} />
              <TextField label="Tagar" value={sample.hashtag} onChange={(v) => setSample((s) => ({ ...s, hashtag: v }))} />
            </div>
          </div>
        </div>

        {/* ---------- TENGAH: kanvas ---------- */}
        <div className="flex flex-1 flex-col items-center">
          <div className="mb-3 flex items-center gap-2">
            {(["fit", 1] as const).map((z) => (
              <button
                key={String(z)}
                onClick={() => setZoom(z)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 8,
                  fontSize: 11.5,
                  fontWeight: 700,
                  border: `1px solid ${zoom === z ? "var(--a-clr-primary)" : "var(--a-clr-border)"}`,
                  background: zoom === z ? "var(--a-clr-primary-light)" : "white",
                  color: zoom === z ? "var(--a-clr-primary)" : "var(--a-clr-text-muted)",
                  cursor: "pointer",
                }}
              >
                {z === "fit" ? "Pas layar" : "100%"}
              </button>
            ))}
          </div>

          <div
            className="flex justify-center overflow-auto rounded-2xl"
            style={{ maxHeight: "75vh", padding: 16, background: "#EEF2F7", border: "1px solid var(--a-clr-border)" }}
          >
            <div ref={wrapRef} className="relative shrink-0" style={{ width: canvasW, height: canvasH }}>
              <canvas ref={textCanvasRef} width={canvasW} height={canvasH} style={{ display: "block", width: canvasW, height: canvasH, borderRadius: 4 }} />
              {bounds.map((b) => {
                const layer = layers[b.index];
                if (!layer) return null;
                const isSel = b.index === selected;
                return (
                  <div
                    key={b.index}
                    onPointerDown={(e) => onHandlePointerDown(b.index, e)}
                    onPointerMove={onHandlePointerMove}
                    onPointerUp={onHandlePointerUp}
                    role="button"
                    tabIndex={-1}
                    title={layer.locked ? "Terkunci — tidak bisa digeser" : "Seret untuk memindahkan"}
                    className="absolute"
                    style={{
                      left: b.x - 6,
                      top: b.y - 6,
                      width: b.w + 12,
                      height: b.h + 12,
                      border: `1.5px ${isSel ? "solid" : "dashed"} ${isSel ? "var(--a-clr-primary)" : "rgba(148,163,184,0.7)"}`,
                      borderRadius: 6,
                      background: isSel ? "rgba(25,118,243,0.06)" : "transparent",
                      cursor: layer.locked ? "not-allowed" : "grab",
                      touchAction: "none",
                    }}
                  />
                );
              })}
            </div>
          </div>
          <p style={{ fontSize: 11, color: "var(--a-clr-text-muted)", marginTop: 10, textAlign: "center", maxWidth: 420 }}>
            Seret kotak putus-putus untuk memindah teks, atau pakai panah keyboard (+ Shift = 10px).
            Foto abu-abu hanya contoh — tidak ikut tersimpan.
          </p>
        </div>

        {/* ---------- KANAN: properti layer terpilih ---------- */}
        <div
          className="w-full shrink-0 xl:w-[320px]"
          style={{ background: "white", borderRadius: 16, border: "1px solid var(--a-clr-border)", padding: 16 }}
        >
          {!active || selected === null ? (
            <InfoBox>Pilih atau tambah layer teks untuk mengatur propertinya di sini.</InfoBox>
          ) : (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="uppercase" style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: "#94A3B8" }}>
                  Properti layer
                </p>
                <button
                  onClick={() => removeLayer(selected)}
                  aria-label="Hapus layer"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--a-clr-danger)" }}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <Section label="Isi">
                <TextField
                  label="Nama layer (opsional)"
                  value={active.label ?? ""}
                  onChange={(v) => patchLayer(selected, { label: v })}
                  placeholder={`Layer ${selected + 1}`}
                />
                <TextField
                  label="Teks"
                  value={active.text}
                  onChange={(v) => patchLayer(selected, { text: v })}
                  multiline
                  hint="Enter untuk baris baru. Token diisi otomatis dari data acara sungguhan saat dipakai."
                />
                <div className="flex flex-wrap" style={{ gap: 6 }}>
                  {TOKENS.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => insertToken(selected, t.key)}
                      style={{
                        padding: "4px 9px",
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 700,
                        border: "1px solid var(--a-clr-border)",
                        background: "var(--a-clr-bg)",
                        color: "var(--a-clr-text-muted)",
                        cursor: "pointer",
                      }}
                    >
                      + {t.label}
                    </button>
                  ))}
                </div>
                <Toggle
                  label="HURUF BESAR semua"
                  checked={active.uppercase ?? false}
                  onChange={(v) => patchLayer(selected, { uppercase: v })}
                />
              </Section>

              <Section label="Font & warna">
                <ChoiceRow
                  label="Jenis huruf"
                  value={active.face}
                  options={[
                    { value: "display", label: "Judul" },
                    { value: "mono", label: "Monospace" },
                  ]}
                  onChange={(v) => patchLayer(selected, { face: v as TextLayer["face"] })}
                />
                <NumberField
                  label="Ukuran"
                  value={active.size}
                  min={8}
                  max={400}
                  suffix="px"
                  onChange={(v) => patchLayer(selected, { size: Math.max(8, v) })}
                />
                <ChoiceRow
                  label="Ketebalan"
                  value={active.weight ?? 400}
                  options={[
                    { value: 400, label: "Reguler" },
                    { value: 600, label: "Semi-tebal" },
                    { value: 800, label: "Tebal" },
                  ]}
                  onChange={(v) => patchLayer(selected, { weight: v as number })}
                />
                <ColorField label="Warna teks" value={active.color} onChange={(hex) => patchLayer(selected, { color: hex })} />
              </Section>

              <Section label="Tata letak">
                <ChoiceRow
                  label="Perataan"
                  value={active.align}
                  options={[
                    { value: "left", label: "Kiri" },
                    { value: "center", label: "Tengah" },
                    { value: "right", label: "Kanan" },
                  ]}
                  onChange={(v) => patchLayer(selected, { align: v as CanvasTextAlign })}
                />
                <NumberField
                  label="Jarak antar huruf"
                  value={active.tracking ?? 0}
                  min={-5}
                  max={40}
                  suffix="px"
                  onChange={(v) => patchLayer(selected, { tracking: v })}
                />
                <NumberField
                  label="Jarak antar baris"
                  value={active.lineHeight ?? 1.2}
                  min={0.8}
                  max={2.5}
                  suffix="× ukuran font"
                  onChange={(v) => patchLayer(selected, { lineHeight: v })}
                  hint="Berlaku kalau teksnya lebih dari satu baris."
                />
                <NumberField
                  label="Lebar maksimal"
                  value={active.maxWidth ?? 0}
                  min={0}
                  max={frame.width}
                  suffix="px · 0 = tanpa batas"
                  onChange={(v) => patchLayer(selected, { maxWidth: v > 0 ? v : undefined })}
                  hint="Font otomatis mengecil kalau teksnya melebihi lebar ini — penting untuk nama yang panjang."
                />
                <NumberField label="Posisi X" value={active.x} onChange={(v) => patchLayer(selected, { x: v })} suffix="px" />
                <NumberField label="Posisi Y" value={active.y} onChange={(v) => patchLayer(selected, { y: v })} suffix="px" />
              </Section>

              <Section label="Lainnya">
                <Toggle
                  label="Sembunyikan"
                  hint="Layer tetap tersimpan, tidak digambar."
                  checked={active.hidden ?? false}
                  onChange={(v) => patchLayer(selected, { hidden: v })}
                />
                <Toggle
                  label="Kunci posisi"
                  hint="Isi/warna masih bisa diubah, posisinya tidak bisa digeser — jaga komposisi tetap rapi."
                  checked={active.locked ?? false}
                  onChange={(v) => patchLayer(selected, { locked: v })}
                />
              </Section>

              <div className="flex items-center gap-1.5" style={{ fontSize: 10.5, color: "var(--a-clr-text-muted)" }}>
                {active.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
                {active.hidden ? "Tidak tampil di hasil." : "Tampil di hasil."}
                {active.locked ? <Lock size={12} className="ml-2" /> : <Unlock size={12} className="ml-2" />}
                {active.locked ? "Posisi terkunci." : "Bisa digeser."}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
