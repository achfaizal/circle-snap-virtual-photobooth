"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Search, ImageOff, Images, Lock, Plus, Trash2, Type } from "lucide-react";
import type { Frame } from "@/lib/models/frame";
import CreateFrameWizard from "./CreateFrameWizard";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import Spinner from "./Spinner";
import { showSuccessToast } from "@/lib/utils";

function FrameCard({
  frame,
  assetUrl,
  canDelete,
  onDeleted,
}: {
  frame: Frame;
  assetUrl: string | undefined;
  /** false untuk bingkai bawaan Circle Snap yang dilihat klien — itu
      aset bersama, bukan miliknya. API menolaknya juga (404), ini cuma
      supaya tombolnya tidak menggoda untuk diklik. */
  canDelete: boolean;
  onDeleted: (id: string) => void;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/frames/${frame.id}`, { method: "DELETE" });
      if (res.ok) {
        onDeleted(frame.id);
        showSuccessToast(`"${frame.name}" berhasil dihapus.`);
        router.refresh();
      } else {
        setError("Gagal menghapus bingkai. Coba lagi.");
        setDeleting(false);
      }
    } catch {
      setError("Tidak bisa menghubungi server.");
      setDeleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5, boxShadow: "0 20px 40px rgba(0,0,0,0.06)" }}
      className="admin-card overflow-hidden"
      style={{ borderRadius: 24 }}
    >
      <div className="flex aspect-[4/5] items-center justify-center bg-[var(--a-clr-bg)]">
        {assetUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- pratinjau bingkai lokal
          <img src={assetUrl} alt={frame.name} className="h-full w-full object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-[var(--a-clr-text-muted)]">
            <ImageOff size={22} aria-hidden />
            <span className="text-xs font-medium">Tanpa pratinjau</span>
          </div>
        )}
      </div>
      <div style={{ padding: 16 }}>
        <p className="truncate" style={{ fontSize: 15, fontWeight: 800, color: "#0F172A" }}>
          {frame.name}
        </p>
        <p className="mt-0.5 truncate text-xs font-medium text-[var(--a-clr-text-muted)]">
          {frame.slots.length} slot · {frame.textLayers.length > 0 ? `${frame.textLayers.length} layer teks` : "tanpa teks dinamis"}
        </p>
        {canDelete ? (
          <div className="mt-3 flex gap-1.5">
            <Link
              href={`/admin/frames/${frame.id}`}
              className="flex flex-1 items-center justify-center gap-1.5"
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1.5px solid var(--a-clr-border)",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--a-clr-primary)",
              }}
            >
              <Type size={12} />
              Atur Teks
            </Link>
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={deleting}
              aria-label="Hapus bingkai"
              className="flex items-center justify-center disabled:opacity-50"
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1.5px solid #FEE2E2",
                background: "#FEF2F2",
                color: "var(--a-clr-danger)",
                cursor: deleting ? "wait" : "pointer",
              }}
            >
              {deleting ? <Spinner size={12} color="var(--a-clr-danger)" /> : <Trash2 size={12} />}
            </button>
          </div>
        ) : (
          <p
            className="mt-3 flex w-full items-center justify-center gap-1.5"
            style={{ fontSize: 12, fontWeight: 600, color: "var(--a-clr-text-muted)" }}
          >
            <Lock size={11} aria-hidden />
            Bawaan Circle Snap
          </p>
        )}
      </div>

      <ConfirmDeleteModal
        isOpen={confirmOpen}
        itemLabel="bingkai"
        itemName={frame.name}
        description="Event yang sudah memakainya akan kehilangan opsi bingkai ini. "
        deleting={deleting}
        error={error}
        onClose={() => {
          setConfirmOpen(false);
          setError(null);
        }}
        onConfirm={remove}
      />
    </motion.div>
  );
}

export default function FrameLibrary({
  frames,
  assetUrls,
  ownedIds,
  canDeleteShared,
}: {
  frames: Frame[];
  /** Map frame.overlayAssetId -> Asset.url, dihitung server-side (page.tsx)
      supaya komponen ini tidak perlu tahu soal repo/Asset sama sekali. */
  assetUrls: Record<string, string>;
  /** Id bingkai milik klien ini sendiri — sisanya bawaan Circle Snap. */
  ownedIds: string[];
  /** true untuk staff: mereka boleh menghapus pustaka bawaan juga. */
  canDeleteShared: boolean;
}) {
  const owned = useMemo(() => new Set(ownedIds), [ownedIds]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return frames.filter((f) => {
      if (removedIds.has(f.id)) return false;
      if (!q) return true;
      return f.name.toLowerCase().includes(q);
    });
  }, [frames, removedIds, query]);

  const totalCount = frames.length - removedIds.size;

  if (totalCount === 0) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: "70vh" }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            maxWidth: 500,
            width: "100%",
            textAlign: "center",
            padding: "40px 24px",
            background: "white",
            borderRadius: 32,
            boxShadow: "0 20px 60px rgba(0,0,0,0.05)",
            border: "1px solid var(--a-clr-border)",
          }}
        >
          <div
            className="grid place-items-center"
            style={{ width: 100, height: 100, background: "var(--a-clr-primary-light)", borderRadius: "50%", margin: "0 auto 24px" }}
          >
            <Images size={48} color="var(--a-clr-primary)" />
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: "#0F172A", marginBottom: 12 }}>Belum Ada Bingkai</h2>
          <p style={{ color: "var(--a-clr-text-muted)", fontSize: 16, lineHeight: 1.6, marginBottom: 32, fontWeight: 500 }}>
            Unggah PNG bingkai pertamamu — sistem otomatis mendeteksi slot foto di dalamnya.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setWizardOpen(true)}
            className="inline-flex items-center text-white"
            style={{
              gap: 12,
              padding: "16px 32px",
              borderRadius: 100,
              fontSize: 16,
              fontWeight: 800,
              background: "linear-gradient(135deg, var(--a-clr-brand-1), var(--a-clr-brand-2))",
              boxShadow: "0 10px 20px rgba(25, 118, 243, 0.3)",
            }}
          >
            <Plus size={20} /> Buat Bingkai Baru
          </motion.button>
        </motion.div>
        {wizardOpen && <CreateFrameWizard onClose={() => setWizardOpen(false)} />}
      </div>
    );
  }

  return (
    <div>
      <div>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: "#0F172A", marginBottom: 8, letterSpacing: "-0.02em" }}>
          Pustaka Bingkai
        </h1>
        <p style={{ fontSize: 16, color: "var(--a-clr-text-muted)", fontWeight: 500, marginBottom: 16 }}>
          {totalCount} bingkai tersedia untuk semua event.
        </p>

        <div style={{ position: "relative", maxWidth: 400 }}>
          <Search size={18} color="var(--a-clr-text-muted)" style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama bingkai..."
            className="admin-input"
            style={{ margin: 0, padding: "12px 16px 12px 44px" }}
          />
        </div>
      </div>

      <div
        className="grid"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 20, marginTop: 24 }}
      >
        {visible.map((frame) => (
          <FrameCard
            key={frame.id}
            frame={frame}
            assetUrl={assetUrls[frame.overlayAssetId]}
            canDelete={canDeleteShared || owned.has(frame.id)}
            onDeleted={(id) => setRemovedIds((s) => new Set(s).add(id))}
          />
        ))}

        <button
          onClick={() => setWizardOpen(true)}
          className="flex aspect-[4/5] flex-col items-center justify-center transition hover:border-[var(--a-clr-primary)]"
          style={{ gap: 12, borderRadius: 24, border: "2px dashed var(--a-clr-border)", background: "rgba(255,255,255,0.5)" }}
        >
          <span
            className="grid place-items-center rounded-full"
            style={{ width: 40, height: 40, background: "var(--a-clr-primary-light)" }}
          >
            <Plus size={18} color="var(--a-clr-primary)" />
          </span>
          <span style={{ fontWeight: 800, fontSize: 14, color: "var(--a-clr-primary)" }}>Buat Bingkai Baru</span>
        </button>
      </div>

      {wizardOpen && <CreateFrameWizard onClose={() => setWizardOpen(false)} />}
    </div>
  );
}
