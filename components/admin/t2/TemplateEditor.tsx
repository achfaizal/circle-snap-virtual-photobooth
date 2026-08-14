"use client";

import { useRef, useState } from "react";
import type { templates } from "@/lib/db/schema";
// Dari lib/services/fontCatalog.ts (client-safe), BUKAN
// lib/db/queries/templates.ts — file itu mengimpor lib/db/client.ts
// (driver `pg`), yang gagal di-bundle untuk browser (butuh modul inti
// Node seperti `dns`). Lihat komentar di fontCatalog.ts.
import { FONT_CATALOG } from "@/lib/services/fontCatalog";

type TemplateRow = typeof templates.$inferSelect;
type ThemeColorsForm = Record<string, string>;
type VideoCardForm = { bg: string; ink: string; smoke: string; waveActive: string; waveTrack: string; heading1: string; heading2: string; heading3: string };

const COLOR_TOKENS = ["ink", "film", "edge", "smoke", "paper", "flash", "live", "brandPurple", "brandGold"] as const;
const DEFAULT_COLOR = "#000000";

interface Category {
  id: string;
  name: string;
  code: string;
}

const TABS = ["identitas", "tema", "video", "variabel", "bingkai"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  identitas: "Identitas",
  tema: "Tema",
  video: "Kartu Video",
  variabel: "Variabel",
  bingkai: "Bingkai",
};

interface TemplateVariableRow {
  id: string;
  key: string;
  label: string;
  inputType: string;
  isRequired: boolean;
  usedIn: string[];
  sortOrder: number;
}
interface AttachedFrameRow {
  id: string; // baris template_frames
  frameId: string;
  sortOrder: number;
  frameName: string;
  frameTextLayers: unknown;
}
interface AvailableFrame {
  id: string;
  name: string;
  slotCount: number;
}

const INPUT_TYPES = ["text", "textarea", "date", "time", "datetime", "image", "select", "toggle"] as const;
const USED_IN_OPTIONS = ["welcome", "frame", "video_card", "share"] as const;

/** Kutip token {{x}} dari layer teks bingkai — dipakai peringatan
    "token tanpa variabel padanan" (dok 04 §4.2 tab 4). */
function extractTokens(textLayers: unknown): string[] {
  if (!Array.isArray(textLayers)) return [];
  const tokens = new Set<string>();
  for (const layer of textLayers) {
    const text = typeof layer === "object" && layer && "text" in layer ? String((layer as { text: unknown }).text) : "";
    for (const match of text.matchAll(/\{\{(\w+)\}\}/g)) tokens.add(match[1]);
  }
  return [...tokens];
}

export default function TemplateEditor({
  template,
  allCategories,
  selectedCategoryIds,
  primaryCategoryId,
  initialVariables,
  initialAttachedFrames,
  availableFrames,
}: {
  template: TemplateRow;
  allCategories: Category[];
  selectedCategoryIds: string[];
  primaryCategoryId: string | null;
  initialVariables: TemplateVariableRow[];
  initialAttachedFrames: AttachedFrameRow[];
  availableFrames: AvailableFrame[];
}) {
  const [tab, setTab] = useState<Tab>("identitas");
  const [saved, setSaved] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Identitas ---
  const [name, setName] = useState(template.name);
  const [tagline, setTagline] = useState(template.tagline ?? "");
  const [description, setDescription] = useState(template.description ?? "");
  const [brandLabel, setBrandLabel] = useState(template.brandLabel);
  const [categoryIds, setCategoryIds] = useState<string[]>(selectedCategoryIds);
  const [primaryId, setPrimaryId] = useState<string | null>(primaryCategoryId);
  const [coverAssetId, setCoverAssetId] = useState<string | null>(template.coverAssetId);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverFileRef = useRef<HTMLInputElement>(null);

  // --- Tema ---
  const initialColors = (template.themeColors as ThemeColorsForm) ?? {};
  const [colors, setColors] = useState<ThemeColorsForm>(
    Object.fromEntries(COLOR_TOKENS.map((t) => [t, initialColors[t] ?? DEFAULT_COLOR]))
  );
  const [fontDisplayId, setFontDisplayId] = useState(template.fontDisplayId);
  const initialEffects = (template.themeEffects as { petals?: { enabled: boolean; count: number }; blobs?: boolean; confetti?: boolean; bokeh?: boolean; sparkle?: boolean } | null) ?? {};
  const [petalsEnabled, setPetalsEnabled] = useState(initialEffects.petals?.enabled ?? false);
  const [petalsCount, setPetalsCount] = useState(initialEffects.petals?.count ?? 7);
  const [blobs, setBlobs] = useState(initialEffects.blobs ?? false);
  const [confetti, setConfetti] = useState(initialEffects.confetti ?? false);
  const [bokeh, setBokeh] = useState(initialEffects.bokeh ?? false);
  const [sparkle, setSparkle] = useState(initialEffects.sparkle ?? false);

  // --- Kartu Video ---
  const initialVideo = (template.videoCardTheme as Partial<VideoCardForm> & { headingGradient?: [string, string, string] }) ?? {};
  const [video, setVideo] = useState<VideoCardForm>({
    bg: initialVideo.bg ?? "#FFFFFF",
    ink: initialVideo.ink ?? "#000000",
    smoke: initialVideo.smoke ?? "#888888",
    waveActive: initialVideo.waveActive ?? "#EC4899",
    waveTrack: initialVideo.waveTrack ?? "#E7E2D8",
    heading1: initialVideo.headingGradient?.[0] ?? "#7C3AED",
    heading2: initialVideo.headingGradient?.[1] ?? "#EC4899",
    heading3: initialVideo.headingGradient?.[2] ?? "#F59E0B",
  });

  // --- Variabel ---
  const [variables, setVariables] = useState<TemplateVariableRow[]>(initialVariables);
  const [varKey, setVarKey] = useState("");
  const [varLabel, setVarLabel] = useState("");
  const [varInputType, setVarInputType] = useState<(typeof INPUT_TYPES)[number]>("text");
  const [varRequired, setVarRequired] = useState(false);
  const [varUsedIn, setVarUsedIn] = useState<string[]>([]);
  const [varError, setVarError] = useState<string | null>(null);

  async function addVariable() {
    setVarError(null);
    try {
      const res = await fetch(`/api/admin/templates/${template.id}/variables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: varKey,
          label: varLabel,
          inputType: varInputType,
          isRequired: varRequired,
          usedIn: varUsedIn,
          sortOrder: variables.length,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal menambah variabel.");
      setVariables((prev) => [...prev, data.variable]);
      setVarKey("");
      setVarLabel("");
      setVarRequired(false);
      setVarUsedIn([]);
    } catch (e) {
      setVarError(e instanceof Error ? e.message : "Terjadi kesalahan.");
    }
  }

  async function removeVariable(id: string) {
    await fetch(`/api/admin/templates/${template.id}/variables/${id}`, { method: "DELETE" });
    setVariables((prev) => prev.filter((v) => v.id !== id));
  }

  // --- Bingkai ---
  const [attachedFrames, setAttachedFrames] = useState<AttachedFrameRow[]>(initialAttachedFrames);
  const [pickFrameId, setPickFrameId] = useState<string>(availableFrames[0]?.id ?? "");
  const [frameError, setFrameError] = useState<string | null>(null);

  const attachedFrameIds = new Set(attachedFrames.map((f) => f.frameId));
  const unmatchedTokens = attachedFrames
    .flatMap((f) => extractTokens(f.frameTextLayers))
    .filter((token) => !["names", "date", "venue", "hashtag", "code"].includes(token))
    .filter((token) => !variables.some((v) => v.key === token));
  const uniqueUnmatchedTokens = [...new Set(unmatchedTokens)];

  async function attachFrameToTemplate() {
    setFrameError(null);
    if (!pickFrameId) return;
    const res = await fetch(`/api/admin/templates/${template.id}/frames`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frameId: pickFrameId, sortOrder: attachedFrames.length }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFrameError(data.error ?? "Gagal memasang bingkai.");
      return;
    }
    const picked = availableFrames.find((f) => f.id === pickFrameId);
    if (picked) {
      setAttachedFrames((prev) => [
        ...prev,
        { id: `temp-${picked.id}`, frameId: picked.id, sortOrder: prev.length, frameName: picked.name, frameTextLayers: [] },
      ]);
    }
  }

  async function detachFrameFromTemplate(templateFrameRowId: string) {
    await fetch(`/api/admin/templates/${template.id}/frames/${templateFrameRowId}`, { method: "DELETE" });
    setAttachedFrames((prev) => prev.filter((f) => f.id !== templateFrameRowId));
  }

  // --- Penerbitan (Langkah 7) ---
  const [status, setStatus] = useState(template.status);
  const [version, setVersion] = useState(template.version);
  const [publishFailed, setPublishFailed] = useState<{ point: number; label: string }[] | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  async function publish() {
    setPublishing(true);
    setPublishFailed(null);
    try {
      const res = await fetch(`/api/admin/templates/${template.id}/publish`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setPublishFailed(data.failed ?? [{ point: 0, label: data.error ?? "Gagal menerbitkan." }]);
        return;
      }
      setStatus(data.template.status);
      setVersion(data.template.version);
    } finally {
      setPublishing(false);
    }
  }

  async function duplicate() {
    setDuplicating(true);
    try {
      const res = await fetch(`/api/admin/templates/${template.id}/duplicate`, { method: "POST" });
      const data = await res.json();
      if (res.ok) window.location.href = `/admin/templates/${data.template.id}`;
    } finally {
      setDuplicating(false);
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          tagline: tagline || null,
          description: description || null,
          brandLabel,
          categoryIds,
          primaryCategoryId: primaryId,
          themeColors: colors,
          fontDisplayId,
          themeEffects: { petals: { enabled: petalsEnabled, count: petalsCount }, blobs, confetti, bokeh, sparkle },
          videoCardTheme: {
            bg: video.bg,
            ink: video.ink,
            smoke: video.smoke,
            waveActive: video.waveActive,
            waveTrack: video.waveTrack,
            headingGradient: [video.heading1, video.heading2, video.heading3],
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal menyimpan.");
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadCover() {
    const file = coverFileRef.current?.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    setError(null);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch(`/api/admin/templates/${template.id}/cover`, { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal mengunggah sampul.");
      setCoverAssetId(data.asset.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan.");
    } finally {
      setUploadingCover(false);
    }
  }

  function markDirty() {
    setSaved(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--a-clr-text)" }}>{template.name}</h1>
          <p className="t2-mono" style={{ fontSize: 12, color: "var(--a-clr-text-muted)" }}>
            {template.code} · v{version} · <span className={`t2-badge ${status === "published" ? "t2-badge-active" : "t2-badge-archived"}`}>{status}</span>
          </p>
        </div>
        <div className="flex" style={{ gap: 8 }}>
          <a href={`/admin/templates/${template.id}/preview`} target="_blank" rel="noreferrer" className="t2-btn t2-btn-secondary">
            Pratinjau sebagai tamu
          </a>
          <button className="t2-btn t2-btn-secondary" onClick={duplicate} disabled={duplicating} type="button">
            {duplicating ? "Menduplikat…" : "Duplikat"}
          </button>
          <button className="t2-btn t2-btn-secondary" onClick={publish} disabled={publishing} type="button">
            {publishing ? "Menerbitkan…" : "Terbitkan"}
          </button>
          <button className="t2-btn t2-btn-primary" onClick={save} disabled={saving} type="button">
            {saving ? "Menyimpan…" : saved ? "Tersimpan" : "Simpan perubahan"}
          </button>
        </div>
      </div>

      {error && <p style={{ fontSize: 13, color: "var(--a-clr-danger)", margin: "8px 0" }}>{error}</p>}
      {publishFailed && (
        <div className="t2-sheet" style={{ margin: "8px 0", background: "#fef2f2" }}>
          <div className="t2-sheet-section">
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--a-clr-danger)", marginBottom: 6 }}>
              Belum bisa diterbitkan — gerbang yang belum lolos:
            </p>
            {publishFailed.map((f) => (
              <p key={f.point} className="t2-mono" style={{ fontSize: 12, color: "var(--a-clr-danger)" }}>
                {f.point > 0 ? `${f.point}. ` : ""}{f.label}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="flex" style={{ gap: 4, marginBottom: 20, marginTop: 20, borderBottom: "1px solid var(--a-clr-border)" }}>
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className="t2-mono"
            style={{
              padding: "10px 16px",
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              background: "none",
              border: "none",
              borderBottom: tab === t ? "2px solid var(--a-clr-primary-dark)" : "2px solid transparent",
              color: tab === t ? "var(--a-clr-text)" : "var(--a-clr-text-muted)",
              cursor: "pointer",
            }}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {tab === "identitas" && (
        <div className="t2-sheet">
          <div className="t2-sheet-section" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label className="t2-label" htmlFor="e-name">Nama</label>
              <input id="e-name" className="t2-input" value={name} onChange={(e) => { setName(e.target.value); markDirty(); }} />
            </div>
            <div>
              <label className="t2-label" htmlFor="e-brand">Sapaan besar</label>
              <input id="e-brand" className="t2-input" value={brandLabel} onChange={(e) => { setBrandLabel(e.target.value); markDirty(); }} maxLength={40} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="t2-label" htmlFor="e-tagline">Tagline</label>
              <input id="e-tagline" className="t2-input" value={tagline} onChange={(e) => { setTagline(e.target.value); markDirty(); }} maxLength={140} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="t2-label" htmlFor="e-desc">Deskripsi</label>
              <input id="e-desc" className="t2-input" value={description} onChange={(e) => { setDescription(e.target.value); markDirty(); }} />
            </div>
          </div>

          <div className="t2-sheet-section">
            <label className="t2-label">Sampul etalase</label>
            {coverAssetId ? (
              <p className="t2-mono" style={{ fontSize: 12, color: "var(--a-clr-text-muted)", marginBottom: 8 }}>
                Terpasang (asset {coverAssetId.slice(0, 8)}…)
              </p>
            ) : (
              <p style={{ fontSize: 13, color: "var(--a-clr-danger)", marginBottom: 8 }}>
                Belum ada sampul — wajib sebelum terbit.
              </p>
            )}
            <div className="flex" style={{ gap: 8 }}>
              <input type="file" accept="image/*" ref={coverFileRef} className="t2-input" style={{ maxWidth: 280 }} />
              <button className="t2-btn t2-btn-secondary t2-btn-sm" onClick={uploadCover} disabled={uploadingCover} type="button">
                {uploadingCover ? "Mengunggah…" : "Unggah"}
              </button>
            </div>
          </div>

          <div className="t2-sheet-section">
            <label className="t2-label">Kategori (pilih minimal 1, tandai satu utama)</label>
            <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
              {allCategories.map((cat) => (
                <label key={cat.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={categoryIds.includes(cat.id)}
                    onChange={(e) => {
                      markDirty();
                      if (e.target.checked) {
                        setCategoryIds((prev) => [...prev, cat.id]);
                        if (!primaryId) setPrimaryId(cat.id);
                      } else {
                        setCategoryIds((prev) => prev.filter((id) => id !== cat.id));
                        if (primaryId === cat.id) setPrimaryId(null);
                      }
                    }}
                  />
                  {cat.name}
                  {categoryIds.includes(cat.id) && (
                    <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--a-clr-text-muted)" }}>
                      <input
                        type="radio"
                        name="primaryCategory"
                        checked={primaryId === cat.id}
                        onChange={() => { setPrimaryId(cat.id); markDirty(); }}
                      />
                      utama
                    </label>
                  )}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "tema" && (
        <div className="t2-sheet">
          <div className="t2-sheet-section">
            <label className="t2-label">9 token warna (wajib semua sebelum terbit)</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 8 }}>
              {COLOR_TOKENS.map((token) => (
                <div key={token} className="flex items-center" style={{ gap: 8 }}>
                  <input
                    type="color"
                    value={colors[token]}
                    onChange={(e) => { setColors((c) => ({ ...c, [token]: e.target.value })); markDirty(); }}
                    style={{ width: 32, height: 32, border: "none", padding: 0, cursor: "pointer" }}
                  />
                  <span className="t2-mono" style={{ fontSize: 12 }}>{token}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="t2-sheet-section">
            <label className="t2-label" htmlFor="e-font">Font display</label>
            <select
              id="e-font"
              className="t2-input"
              value={fontDisplayId}
              onChange={(e) => { setFontDisplayId(e.target.value); markDirty(); }}
              style={{ maxWidth: 240 }}
            >
              {FONT_CATALOG.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div className="t2-sheet-section">
            <label className="t2-label">Efek</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                <input type="checkbox" checked={petalsEnabled} onChange={(e) => { setPetalsEnabled(e.target.checked); markDirty(); }} /> Kelopak
              </label>
              {petalsEnabled && (
                <input
                  type="number"
                  className="t2-input t2-mono"
                  style={{ width: 70 }}
                  value={petalsCount}
                  onChange={(e) => { setPetalsCount(Number(e.target.value) || 0); markDirty(); }}
                />
              )}
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                <input type="checkbox" checked={blobs} onChange={(e) => { setBlobs(e.target.checked); markDirty(); }} /> Blob
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                <input type="checkbox" checked={confetti} onChange={(e) => { setConfetti(e.target.checked); markDirty(); }} /> Konfeti
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                <input type="checkbox" checked={bokeh} onChange={(e) => { setBokeh(e.target.checked); markDirty(); }} /> Bokeh
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                <input type="checkbox" checked={sparkle} onChange={(e) => { setSparkle(e.target.checked); markDirty(); }} /> Kilau
              </label>
            </div>
          </div>
        </div>
      )}

      {tab === "video" && (
        <div className="t2-sheet">
          <div className="t2-sheet-section">
            <label className="t2-label">Warna kartu video</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 8 }}>
              {(["bg", "ink", "smoke", "waveActive", "waveTrack"] as const).map((key) => (
                <div key={key} className="flex items-center" style={{ gap: 8 }}>
                  <input
                    type="color"
                    value={video[key]}
                    onChange={(e) => { setVideo((v) => ({ ...v, [key]: e.target.value })); markDirty(); }}
                    style={{ width: 32, height: 32, border: "none", padding: 0, cursor: "pointer" }}
                  />
                  <span className="t2-mono" style={{ fontSize: 12 }}>{key}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="t2-sheet-section">
            <label className="t2-label">Gradasi judul (awal → tengah → akhir)</label>
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              {(["heading1", "heading2", "heading3"] as const).map((key) => (
                <input
                  key={key}
                  type="color"
                  value={video[key]}
                  onChange={(e) => { setVideo((v) => ({ ...v, [key]: e.target.value })); markDirty(); }}
                  style={{ width: 32, height: 32, border: "none", padding: 0, cursor: "pointer" }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "variabel" && (
        <div className="t2-sheet">
          {uniqueUnmatchedTokens.length > 0 && (
            <div className="t2-sheet-section" style={{ background: "#fffbeb" }}>
              <p style={{ fontSize: 13, color: "#b45309", fontWeight: 600 }}>
                Ada token di layer teks bingkai terpasang tanpa variabel padanan:
              </p>
              <p className="t2-mono" style={{ fontSize: 12, color: "#b45309", marginTop: 4 }}>
                {uniqueUnmatchedTokens.map((t) => `{{${t}}}`).join(", ")}
              </p>
            </div>
          )}
          <div className="t2-sheet-section">
            {varError && <p style={{ fontSize: 13, color: "var(--a-clr-danger)", marginBottom: 12 }}>{varError}</p>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div>
                <label className="t2-label" htmlFor="v-key">Key</label>
                <input id="v-key" className="t2-input t2-mono" value={varKey} onChange={(e) => setVarKey(e.target.value)} placeholder="venue" />
              </div>
              <div>
                <label className="t2-label" htmlFor="v-label">Label</label>
                <input id="v-label" className="t2-input" value={varLabel} onChange={(e) => setVarLabel(e.target.value)} placeholder="Lokasi" />
              </div>
              <div>
                <label className="t2-label" htmlFor="v-type">Tipe input</label>
                <select id="v-type" className="t2-input" value={varInputType} onChange={(e) => setVarInputType(e.target.value as (typeof INPUT_TYPES)[number])}>
                  {INPUT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center" style={{ gap: 16, marginTop: 12, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                <input type="checkbox" checked={varRequired} onChange={(e) => setVarRequired(e.target.checked)} /> Wajib diisi
              </label>
              {USED_IN_OPTIONS.map((u) => (
                <label key={u} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={varUsedIn.includes(u)}
                    onChange={(e) =>
                      setVarUsedIn((prev) => (e.target.checked ? [...prev, u] : prev.filter((x) => x !== u)))
                    }
                  />
                  {u}
                </label>
              ))}
            </div>
            <button className="t2-btn t2-btn-primary t2-btn-sm" onClick={addVariable} disabled={!varKey || !varLabel} type="button" style={{ marginTop: 12 }}>
              Tambah variabel
            </button>
          </div>

          {variables.map((v) => (
            <div key={v.id} className="t2-sheet-section flex items-center justify-between">
              <div>
                <span className="t2-mono" style={{ fontSize: 13, fontWeight: 600 }}>{`{{${v.key}}}`}</span>
                <span style={{ fontSize: 13, color: "var(--a-clr-text-muted)", marginLeft: 8 }}>
                  {v.label} · {v.inputType} {v.isRequired && "· wajib"}
                </span>
              </div>
              <button className="t2-btn t2-btn-danger t2-btn-sm" onClick={() => removeVariable(v.id)} type="button">
                Hapus
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "bingkai" && (
        <div className="t2-sheet">
          <div className="t2-sheet-section">
            {frameError && <p style={{ fontSize: 13, color: "var(--a-clr-danger)", marginBottom: 12 }}>{frameError}</p>}
            <label className="t2-label">Pasang bingkai sistem</label>
            <div className="flex" style={{ gap: 8, marginTop: 8 }}>
              <select className="t2-input" value={pickFrameId} onChange={(e) => setPickFrameId(e.target.value)} style={{ maxWidth: 320 }}>
                {availableFrames
                  .filter((f) => !attachedFrameIds.has(f.id))
                  .map((f) => (
                    <option key={f.id} value={f.id}>{f.name} ({f.slotCount} slot)</option>
                  ))}
              </select>
              <button className="t2-btn t2-btn-secondary t2-btn-sm" onClick={attachFrameToTemplate} type="button">
                Pasang
              </button>
            </div>
          </div>

          {attachedFrames.length === 0 ? (
            <div className="t2-sheet-section" style={{ textAlign: "center", padding: "40px 20px" }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--a-clr-text)" }}>Belum ada bingkai terpasang.</p>
              <p style={{ fontSize: 13, color: "var(--a-clr-text-muted)", marginTop: 4 }}>
                Minimal 1 bingkai wajib sebelum template ini bisa diterbitkan (AB-17).
              </p>
            </div>
          ) : (
            attachedFrames.map((f, i) => (
              <div key={f.id} className="t2-sheet-section flex items-center justify-between">
                <span className="t2-mono" style={{ fontSize: 13 }}>
                  {i + 1}. {f.frameName}
                </span>
                <button className="t2-btn t2-btn-danger t2-btn-sm" onClick={() => detachFrameFromTemplate(f.id)} type="button">
                  Lepas
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
