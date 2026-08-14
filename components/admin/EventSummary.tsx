"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarDays, Copy, ExternalLink, Frame, MapPin, Palette, Rocket, Ticket } from "lucide-react";
import type { Event } from "@/lib/models/event";
import type { Subscription } from "@/lib/models/plan";
import { eventKindMeta } from "@/lib/services/eventKind";
import { effectiveStatus } from "@/lib/services/eventLifecycle";
import { showSuccessToast, showErrorToast } from "@/lib/utils";

const STATUS_META: Record<Event["status"], { label: string; badge: string }> = {
  draft: { label: "Draft", badge: "admin-badge-neutral" },
  live: { label: "Live", badge: "admin-badge-success" },
  ended: { label: "Selesai", badge: "admin-badge-neutral" },
};

/** Kartu putih standar Ringkasan — radius 24, padding 20, border tipis,
    bayangan lembut. Sama persis dengan kartu metadata di referensi. */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      style={{
        background: "white",
        padding: 20,
        borderRadius: 24,
        border: "1px solid #F1F5F9",
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.03)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {children}
    </motion.div>
  );
}

function CardTitle({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
      <h3
        className="uppercase"
        style={{ fontSize: 12, color: "#64748B", fontWeight: 800, letterSpacing: "0.08em" }}
      >
        {children}
      </h3>
      {icon}
    </div>
  );
}

export default function EventSummary({
  event,
  subscription,
  frameCount,
}: {
  event: Event;
  subscription: Subscription | null;
  frameCount: number;
}) {
  const kind = eventKindMeta(event.identity.kind);
  const status = STATUS_META[event.status];
  // Event.status TETAP "live" di database walau masa aktifnya sudah habis
  // (lib/services/eventLifecycle.ts — "expired" sengaja tidak pernah
  // disimpan). Dihitung terpisah di sini murni supaya staff sadar dari
  // Ringkasan tanpa harus buka halaman Publish.
  const expired = effectiveStatus(event, subscription) === "expired";
  const used = subscription?.stripUsed ?? 0;
  const quota = subscription?.stripQuota ?? 0;
  const left = Math.max(0, quota - used);
  const pct = quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;
  const low = quota > 0 && left <= quota * 0.2;

  const guestPath = `/e/${event.slug}`;
  const guestUrl = typeof window !== "undefined" ? `${window.location.origin}${guestPath}` : guestPath;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(guestUrl);
      showSuccessToast("📋 Link berhasil disalin!");
    } catch {
      showErrorToast("Tidak bisa menyalin — salin manual dari halaman Publish.");
    }
  };

  return (
    <div className="flex flex-col" style={{ gap: 24, paddingBottom: 40 }}>
      {/* ===== Header besar ===== */}
      <div
        style={{
          borderRadius: 32,
          padding: "36px 32px",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(135deg, #DCEBFF 0%, #F4F8FF 100%)",
          border: "1px solid white",
          boxShadow: "0 30px 60px rgba(25, 118, 243, 0.10)",
        }}
      >
        <motion.div
          aria-hidden
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            top: -100,
            right: -50,
            width: 300,
            height: 300,
            background: "rgba(25, 118, 243, 0.15)",
            borderRadius: "50%",
            filter: "blur(60px)",
          }}
        />

        <div className="relative flex flex-wrap items-start justify-between" style={{ gap: 24, zIndex: 10 }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div className="flex flex-wrap" style={{ gap: 10, marginBottom: 16 }}>
              <span className={`admin-badge ${status.badge}`}>{status.label}</span>
              {kind && (
                <span
                  className="inline-flex items-center"
                  style={{
                    gap: 6,
                    padding: "6px 14px",
                    borderRadius: 100,
                    fontSize: 12,
                    fontWeight: 800,
                    background: "rgba(255,255,255,0.75)",
                    color: "var(--a-clr-primary)",
                  }}
                >
                  {kind.emoji} {kind.label}
                </span>
              )}
            </div>

            <h1
              style={{
                fontSize: 40,
                fontWeight: 900,
                color: "#0F172A",
                marginBottom: 16,
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
              }}
            >
              {event.identity.internalName}
            </h1>

            <div className="flex flex-wrap" style={{ gap: 24 }}>
              <div className="flex items-center" style={{ gap: 12 }}>
                <span
                  className="grid place-items-center rounded-full"
                  style={{ width: 40, height: 40, background: "white", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
                >
                  <CalendarDays size={18} color="var(--a-clr-primary)" />
                </span>
                <div>
                  <p
                    className="uppercase"
                    style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.05em" }}
                  >
                    Waktu Pelaksanaan
                  </p>
                  <p style={{ fontSize: 15, color: "#334155", fontWeight: 700 }}>
                    {event.identity.dateDisplay || "Belum diisi"}
                  </p>
                </div>
              </div>

              <div className="flex items-center" style={{ gap: 12 }}>
                <span
                  className="grid place-items-center rounded-full"
                  style={{ width: 40, height: 40, background: "white", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
                >
                  <MapPin size={18} color="var(--a-clr-primary)" />
                </span>
                <div>
                  <p
                    className="uppercase"
                    style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.05em" }}
                  >
                    Lokasi
                  </p>
                  <p style={{ fontSize: 15, color: "#334155", fontWeight: 700 }}>
                    {event.identity.venue || "Belum diisi"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col" style={{ gap: 10, minWidth: 200 }}>
            <Link
              href={`/admin/events/${event.id}/visual`}
              className="flex items-center justify-center text-white"
              style={{
                gap: 8,
                padding: "14px 24px",
                borderRadius: 16,
                fontWeight: 800,
                fontSize: 14,
                background: "linear-gradient(135deg, var(--a-clr-brand-1), var(--a-clr-brand-2))",
                boxShadow: "0 10px 25px rgba(25, 118, 243, 0.3)",
              }}
            >
              <Palette size={18} /> Buka Visual Builder
            </Link>
            <div className="grid grid-cols-2" style={{ gap: 10 }}>
              <a
                href={guestPath}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center"
                style={{
                  gap: 6,
                  padding: "12px 16px",
                  borderRadius: 12,
                  border: "1px solid var(--a-clr-border)",
                  background: "white",
                  fontWeight: 800,
                  fontSize: 13,
                  color: "#0F172A",
                }}
              >
                <ExternalLink size={15} /> Buka
              </a>
              <button
                onClick={copyLink}
                className="flex items-center justify-center"
                style={{
                  gap: 6,
                  padding: "12px 16px",
                  borderRadius: 12,
                  border: "1px solid var(--a-clr-border)",
                  background: "white",
                  fontWeight: 800,
                  fontSize: 13,
                  color: "#0F172A",
                  cursor: "pointer",
                }}
              >
                <Copy size={15} /> Salin
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Kartu-kartu ringkasan ===== */}
      <div
        className="grid"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}
      >
        {/* Kuota strip — angka paling penting di halaman ini */}
        <Card>
          <CardTitle
            icon={
              <span
                className="grid place-items-center"
                style={{ padding: 6, borderRadius: 10, background: "var(--a-clr-primary-light)" }}
              >
                <Ticket size={16} color="var(--a-clr-primary)" />
              </span>
            }
          >
            Kuota Strip
          </CardTitle>
          <div className="flex items-end" style={{ gap: 8 }}>
            <span style={{ fontSize: 36, fontWeight: 900, color: "#0F172A", lineHeight: 0.9 }}>{left}</span>
            <span style={{ fontSize: 13, color: "#64748B", fontWeight: 600, paddingBottom: 2 }}>
              strip tersisa
            </span>
          </div>
          <div
            style={{ width: "100%", height: 6, background: "#F1F5F9", borderRadius: 8, marginTop: 10, overflow: "hidden" }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: "100%",
                borderRadius: 8,
                background: low
                  ? "linear-gradient(90deg, #F97316, #FBBF24)"
                  : "linear-gradient(90deg, var(--a-clr-brand-1), var(--a-clr-brand-2))",
              }}
            />
          </div>
          <div className="flex justify-between" style={{ marginTop: 6 }}>
            <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600 }}>
              {used} dari {quota || "?"} terpakai
            </span>
            {low && (
              <span style={{ fontSize: 11, color: "var(--a-clr-warning)", fontWeight: 700 }}>
                Hampir habis
              </span>
            )}
          </div>
        </Card>

        {/* Bingkai */}
        <Card>
          <CardTitle
            icon={
              <span
                className="grid place-items-center"
                style={{ padding: 6, borderRadius: 10, background: "#EEF2FF" }}
              >
                <Frame size={16} color="#4338CA" />
              </span>
            }
          >
            Bingkai Terpasang
          </CardTitle>
          <div className="flex items-end" style={{ gap: 8 }}>
            <span style={{ fontSize: 36, fontWeight: 900, color: "#0F172A", lineHeight: 0.9 }}>
              {frameCount}
            </span>
            <span style={{ fontSize: 13, color: "#64748B", fontWeight: 600, paddingBottom: 2 }}>
              bingkai
            </span>
          </div>
          <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 8, lineHeight: 1.5 }}>
            {frameCount === 0
              ? "Tamu belum bisa memotret — pasang minimal satu bingkai dulu."
              : "Urutannya menentukan urutan pilihan yang dilihat tamu."}
          </p>
          <Link
            href={`/admin/events/${event.id}/frames`}
            style={{ fontSize: 12, fontWeight: 700, color: "var(--a-clr-primary)", marginTop: 10, display: "inline-block" }}
          >
            Atur bingkai →
          </Link>
        </Card>

        {/* Kesiapan publikasi */}
        <Card>
          <CardTitle
            icon={
              <span
                className="grid place-items-center"
                style={{
                  padding: 6,
                  borderRadius: 10,
                  background: expired ? "#FEE2E2" : event.status === "live" ? "#DCFCE7" : "#FEF3C7",
                }}
              >
                <Rocket size={16} color={expired ? "var(--a-clr-danger)" : event.status === "live" ? "#15803D" : "#D97706"} />
              </span>
            }
          >
            Status Publikasi
          </CardTitle>
          <p style={{ fontSize: 20, fontWeight: 900, color: "#0F172A" }}>
            {expired ? "Masa aktif habis" : status.label}
          </p>
          <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 6, lineHeight: 1.5 }}>
            {expired
              ? "Paket 7 hari sudah lewat — sesi foto & galeri momen terkunci untuk tamu."
              : event.status === "live"
                ? "Tamu bisa memindai QR dan langsung mulai sesi foto."
                : event.status === "draft"
                  ? "Belum bisa diakses tamu. Publikasikan kalau sudah siap."
                  : "Sesi foto baru ditolak, galeri momen tetap terbuka."}
          </p>
          <Link
            href={`/admin/events/${event.id}/publish`}
            style={{ fontSize: 12, fontWeight: 700, color: "var(--a-clr-primary)", marginTop: 10, display: "inline-block" }}
          >
            Buka halaman Publish →
          </Link>
        </Card>
      </div>

      {/* Detail acara */}
      <Card>
        <CardTitle>Detail Acara</CardTitle>
        <div className="flex flex-col" style={{ gap: 10 }}>
          {[
            { label: "Nama yang ditampilkan", value: event.identity.names },
            { label: "Sapaan besar", value: event.identity.brandLabel },
            { label: "Tagar", value: event.identity.hashtag || "—" },
            { label: "Kode acara", value: `/e/${event.slug}` },
          ].map((row, i, arr) => (
            <div
              key={row.label}
              className="flex justify-between"
              style={{
                borderBottom: i === arr.length - 1 ? "none" : "1px dashed #E2E8F0",
                paddingBottom: i === arr.length - 1 ? 0 : 8,
              }}
            >
              <span style={{ fontSize: 13, color: "#64748B", fontWeight: 500 }}>{row.label}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#0F172A" }}>{row.value}</span>
            </div>
          ))}
        </div>
        <Link
          href={`/admin/events/${event.id}/info`}
          style={{ fontSize: 12, fontWeight: 700, color: "var(--a-clr-primary)", marginTop: 14, display: "inline-block" }}
        >
          Ubah detail acara →
        </Link>
      </Card>
    </div>
  );
}
