"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import Spinner from "./Spinner";

/**
 * Modal konfirmasi hapus generik — dipakai untuk Event (AdminDashboard)
 * dan Bingkai (FrameLibrary). Sebelumnya masing-masing punya salinan
 * sendiri (DeleteEventModal) atau malah masih window.confirm() polos
 * (FrameLibrary) — disatukan di sini supaya kedua tempat benar-benar
 * konsisten, bukan cuma "kelihatan mirip".
 *
 * Diterjemahkan dari DeleteModal referensi (components/DashboardModals.tsx,
 * §5.6 UI-UX-DESIGN-SYSTEM.md) — bedanya: referensi minta ketik PASSWORD
 * STATIS ("glyka123", gimmick, gampang ditebak siapa saja yang baca kode).
 * Di sini diganti ketik ULANG NAMA ITEM-nya sendiri (pola umum di produk
 * nyata, mis. GitHub "type repo name to confirm") — gesekan yang sama,
 * tapi jujur (bukan pura-pura jadi pengaman password). */
export default function ConfirmDeleteModal({
  isOpen,
  itemLabel,
  itemName,
  description,
  deleting,
  error,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  /** "event" / "bingkai" — dipakai di judul & label tombol, huruf kecil. */
  itemLabel: string;
  itemName: string;
  /** Kalimat tambahan spesifik konteks (mis. sebut "momen & struk tamu"
      untuk event, atau "dipakai di N event" untuk bingkai). Opsional. */
  description?: string;
  deleting: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [typed, setTyped] = useState("");
  const matches = typed.trim() === itemName.trim();

  // Reset teks ketikan tiap kali modal dibuka ulang untuk item lain —
  // tanpa ini, sisa ketikan dari item sebelumnya bisa kebawa dan
  // kebetulan cocok dengan nama item baru (mis. dua event nama sama).
  useEffect(() => {
    if (isOpen) setTyped("");
  }, [isOpen]);

  const close = () => {
    setTyped("");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(8px)" }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-delete-title"
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            style={{
              background: "white",
              width: "100%",
              maxWidth: 480,
              borderRadius: 28,
              position: "relative",
              zIndex: 130,
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
              padding: 32,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  background: "#FEF2F2",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 20,
                }}
              >
                <Trash2 size={32} color="#EF4444" aria-hidden />
              </div>
              <h3 id="confirm-delete-title" style={{ fontSize: 22, fontWeight: 900, color: "#0F172A", marginBottom: 12 }}>
                Hapus {itemLabel}?
              </h3>
              <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.6, marginBottom: 24, fontWeight: 500 }}>
                Tindakan ini <strong>tidak dapat dibatalkan</strong>. {description ?? `Semua data ${itemLabel} `}
                <strong>{itemName}</strong> akan dihapus permanen.
              </p>
              <div style={{ width: "100%", textAlign: "left", marginBottom: 24 }}>
                <label style={{ fontSize: 12, fontWeight: 800, color: "#475569", display: "block", marginBottom: 8 }}>
                  Ketik nama {itemLabel} untuk konfirmasi:{" "}
                  <span style={{ color: "#EF4444", fontFamily: "monospace", fontWeight: 900 }}>{itemName}</span>
                </label>
                <input
                  type="text"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder={itemName}
                  className="admin-input"
                  style={{ margin: 0, padding: "14px 16px", fontSize: 15 }}
                />
                {error && (
                  <span style={{ fontSize: 12, color: "#EF4444", fontWeight: 600, marginTop: 6, display: "block" }}>
                    {error}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 12, width: "100%" }}>
                <button
                  onClick={close}
                  style={{
                    flex: 1,
                    padding: "14px 20px",
                    borderRadius: 100,
                    border: "1.5px solid var(--a-clr-border)",
                    background: "white",
                    color: "#64748B",
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  Batal
                </button>
                <button
                  onClick={onConfirm}
                  disabled={!matches || deleting}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "14px 20px",
                    borderRadius: 100,
                    border: "none",
                    background: "#EF4444",
                    color: "white",
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: !matches || deleting ? "not-allowed" : "pointer",
                    opacity: !matches || deleting ? 0.5 : 1,
                    boxShadow: "0 8px 16px rgba(239,68,68,0.2)",
                  }}
                >
                  {deleting && <Spinner size={14} />}
                  {deleting ? "Menghapus…" : "Hapus Permanen"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
