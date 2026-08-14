"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle, X } from "lucide-react";
import { ADDON_CATALOG, MANUAL_TRANSFER_INSTRUCTIONS, formatIdr, type AddonOption } from "@/lib/services/addons";
import type { OrderKind } from "@/lib/models/order";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import Spinner from "./Spinner";

/**
 * Beli add-on — konfirmasi manual (BRD §7.1). Alur: pilih add-on → lihat
 * instruksi transfer → submit (bikin Order "pending") → tampilkan status
 * "menunggu konfirmasi staff", BUKAN langsung aktif. Efeknya (nambah
 * kuota/masa aktif/jatah event) baru terjadi setelah staff menekan
 * "Tandai Lunas" di panel Pesanan — lihat app/api/admin/orders/[id]/confirm.
 */
export default function AddonPurchaseModal({
  kinds,
  eventId,
  eventLabel,
  onClose,
  onCreated,
}: {
  /** Add-on mana saja yang relevan di konteks ini — event row cuma
      tawarkan topup_strip/extend_days, panel klien cuma add_event_slot. */
  kinds: OrderKind[];
  eventId?: string;
  eventLabel?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const options = ADDON_CATALOG.filter((a) => kinds.includes(a.kind));
  const [selected, setSelected] = useState<AddonOption>(options[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);
  const [copied, setCopied] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addonId: selected.id, eventId }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Gagal membuat pesanan.");
        return;
      }
      setCreated(true);
      showSuccessToast("Pesanan dibuat — menunggu konfirmasi.");
    } catch {
      setError("Tidak bisa menghubungi server.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyAccount = async () => {
    try {
      await navigator.clipboard.writeText(MANUAL_TRANSFER_INSTRUCTIONS.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showErrorToast("Tidak bisa menyalin — salin manual.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[130] grid place-items-center p-4"
      style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white"
        style={{ maxHeight: "85vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b p-5" style={{ borderColor: "var(--a-clr-border)" }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 900, color: "#0F172A" }}>
              {created ? "Menunggu Konfirmasi" : "Beli Add-on"}
            </p>
            {eventLabel && !created && (
              <p style={{ fontSize: 12, color: "var(--a-clr-text-muted)" }}>untuk {eventLabel}</p>
            )}
          </div>
          <button onClick={onClose} aria-label="Tutup" className="grid h-8 w-8 place-items-center rounded-full text-[var(--a-clr-text-muted)] hover:bg-[var(--a-clr-bg)]">
            <X size={16} />
          </button>
        </div>

        {!created ? (
          <div style={{ padding: 20 }}>
            <div className="flex flex-col" style={{ gap: 8, marginBottom: 20 }}>
              {options.map((o) => {
                const active = o.id === selected.id;
                return (
                  <button
                    key={o.id}
                    onClick={() => setSelected(o)}
                    className="flex items-center justify-between text-left"
                    style={{
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: `1.5px solid ${active ? "var(--a-clr-primary)" : "var(--a-clr-border)"}`,
                      background: active ? "var(--a-clr-primary-light)" : "white",
                    }}
                  >
                    <div>
                      <p style={{ fontSize: 13.5, fontWeight: 800, color: active ? "var(--a-clr-primary)" : "#0F172A" }}>
                        {o.label}
                      </p>
                      <p style={{ fontSize: 11.5, color: "var(--a-clr-text-muted)", marginTop: 2 }}>{o.hint}</p>
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 900, color: "#0F172A", whiteSpace: "nowrap", marginLeft: 12 }}>
                      {formatIdr(o.priceIdr)}
                    </p>
                  </button>
                );
              })}
            </div>

            <div
              style={{ borderRadius: 12, border: "1px solid var(--a-clr-border)", padding: 14, marginBottom: 16, background: "var(--a-clr-bg)" }}
            >
              <p style={{ fontSize: 11, fontWeight: 800, color: "#94A3B8", marginBottom: 8 }}>
                CARA BAYAR (TRANSFER MANUAL)
              </p>
              <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                <p style={{ fontSize: 13, color: "#334155" }}>
                  {MANUAL_TRANSFER_INSTRUCTIONS.bank} — {MANUAL_TRANSFER_INSTRUCTIONS.accountNumber}
                </p>
                <button onClick={copyAccount} className="admin-btn admin-btn-outline admin-btn-sm">
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </div>
              <p style={{ fontSize: 12, color: "var(--a-clr-text-muted)" }}>
                a.n. {MANUAL_TRANSFER_INSTRUCTIONS.accountName}
              </p>
              <p style={{ fontSize: 11.5, color: "var(--a-clr-text-muted)", marginTop: 8, lineHeight: 1.5 }}>
                Setelah transfer sejumlah <strong>{formatIdr(selected.priceIdr)}</strong>, kirim bukti ke WhatsApp{" "}
                <strong>{MANUAL_TRANSFER_INSTRUCTIONS.whatsapp}</strong> supaya staff bisa konfirmasi lebih cepat.
              </p>
            </div>

            {error && <p style={{ fontSize: 12, color: "var(--a-clr-danger)", marginBottom: 12 }}>{error}</p>}

            <button
              onClick={submit}
              disabled={submitting}
              className="admin-btn admin-btn-primary admin-btn-press w-full justify-center disabled:opacity-50"
            >
              {submitting && <Spinner size={14} />}
              {submitting ? "Membuat pesanan…" : `Pesan — ${formatIdr(selected.priceIdr)}`}
            </button>
          </div>
        ) : (
          <div style={{ padding: 20, textAlign: "center" }}>
            <div
              className="mx-auto grid place-items-center rounded-full"
              style={{ width: 56, height: 56, background: "var(--a-clr-primary-light)", marginBottom: 14 }}
            >
              <MessageCircle size={24} color="var(--a-clr-primary)" />
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 6 }}>
              Pesanan tersimpan, belum aktif.
            </p>
            <p style={{ fontSize: 12.5, color: "var(--a-clr-text-muted)", lineHeight: 1.6, marginBottom: 20 }}>
              {selected.label} akan berlaku setelah staff mengonfirmasi transfermu. Cek statusnya di bagian
              "Pesanan" halaman ini kapan saja.
            </p>
            <button
              onClick={() => {
                onCreated();
                onClose();
              }}
              className="admin-btn admin-btn-primary admin-btn-press w-full justify-center"
            >
              Selesai
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
