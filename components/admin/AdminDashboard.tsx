"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Check, Search, ExternalLink, Trash2, Plus, PartyPopper } from "lucide-react";
import type { Event } from "@/lib/models/event";
import type { Subscription } from "@/lib/models/plan";
import { eventKindMeta } from "@/lib/services/eventKind";
import CreateEventWizard from "./CreateEventWizard";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import { showSuccessToast } from "@/lib/utils";
import { clearActiveEventId, useActiveEventId } from "@/lib/activeEvent";

const STATUS_LABEL: Record<Event["status"], string> = {
  draft: "Draft",
  live: "Live",
  ended: "Selesai",
};

const STATUS_BADGE: Record<Event["status"], string> = {
  draft: "admin-badge-neutral",
  live: "admin-badge-success",
  ended: "admin-badge-neutral",
};

function EventCard({
  event,
  subscription,
  isActive,
  onDeleted,
}: {
  event: Event;
  subscription: Subscription | null;
  /** Event yang terakhir dibuka — kartunya disorot & tombolnya berubah
      jadi "Terpilih", meniru pola "Pesta Aktif" di referensi. */
  isActive: boolean;
  onDeleted: (id: string) => void;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const kindMeta = eventKindMeta(event.identity.kind);
  const used = subscription?.stripUsed ?? 0;
  const quota = subscription?.stripQuota ?? 0;
  const pct = quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;
  const low = quota > 0 && quota - used <= quota * 0.2;

  const remove = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/events/${event.id}`, { method: "DELETE" });
      if (res.ok) {
        onDeleted(event.id);
        // Kalau yang dihapus kebetulan event aktif, lupakan — tanpa ini
        // menu "Kelola Event" di sidebar tetap menunjuk event yang sudah
        // tidak ada dan semua tautannya berujung 404.
        if (isActive) clearActiveEventId();
        showSuccessToast(`"${event.identity.internalName}" berhasil dihapus.`);
        router.refresh();
      } else {
        setDeleteError("Gagal menghapus event. Coba lagi.");
        setDeleting(false);
      }
    } catch {
      setDeleteError("Tidak bisa menghubungi server.");
      setDeleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5, boxShadow: "0 20px 40px rgba(0,0,0,0.06)" }}
      className="admin-card relative flex flex-col"
      style={{
        padding: 24,
        minHeight: 200,
        borderRadius: 24,
        border: isActive ? "2px solid var(--a-clr-primary)" : undefined,
        background: isActive ? "var(--a-clr-primary-light)" : undefined,
      }}
    >
      {isActive && (
        <span
          className="absolute inline-flex items-center text-white"
          style={{
            top: -10,
            right: 24,
            gap: 4,
            background: "var(--a-clr-primary)",
            fontSize: 11,
            fontWeight: 800,
            padding: "4px 12px",
            borderRadius: 100,
          }}
        >
          <Check size={12} /> AKTIF
        </span>
      )}
      <div className="flex items-center justify-between gap-2">
        {kindMeta ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--a-clr-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--a-clr-text-muted)]">
            <span>{kindMeta.emoji}</span>
            {kindMeta.label}
          </span>
        ) : (
          <span />
        )}
        <span className={`admin-badge ${STATUS_BADGE[event.status]}`}>
          {STATUS_LABEL[event.status]}
        </span>
      </div>

      {/* Judul & meta — ukuran disamakan ke kartu referensi
          (fontSize:20/fontWeight:800/marginBottom:8 untuk judul,
          fontSize:13 untuk meta), bukan text-base/text-sm bawaan. */}
      <h2 className="truncate" style={{ marginTop: 12, marginBottom: 8, fontSize: 20, fontWeight: 800, color: "#0F172A" }}>
        {event.identity.internalName}
      </h2>
      <p className="flex items-center gap-1.5" style={{ fontSize: 13, color: "var(--a-clr-text-muted)" }}>
        {event.identity.names} · {event.identity.dateDisplay || "Tanggal belum diisi"}
      </p>
      <p className="mt-0.5 font-mono text-xs text-[var(--a-clr-text-muted)]">/e/{event.slug}</p>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className={low ? "text-[var(--a-clr-warning)]" : "text-[var(--a-clr-text-muted)]"}>
            {used} / {quota || "?"} strip terpakai
          </span>
          <span className="text-[var(--a-clr-text-muted)]">{pct}%</span>
        </div>
        <div className="admin-progress-bar mt-1">
          <div
            className={`admin-progress-fill ${low ? "admin-progress-fill-warn" : ""}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Pemisah + tombol aksi — meniru struktur kartu referensi
          (borderTop 1px + paddingTop/marginTop 16, tombol utama
          padding:'10px 16px' radius:10, bukan gaya .admin-btn-primary
          yang dipakai buat CTA berdiri sendiri). */}
      <div
        className="flex flex-col"
        style={{ borderTop: "1px solid var(--a-clr-bg)", paddingTop: 16, marginTop: 16, gap: 8 }}
      >
        <Link
          href={`/admin/events/${event.id}`}
          className="flex items-center justify-center text-white"
          style={{
            gap: 6,
            padding: "10px 16px",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 800,
            background: isActive
              ? "var(--a-clr-success)"
              : "linear-gradient(135deg, var(--a-clr-brand-1), var(--a-clr-brand-2))",
            boxShadow: isActive ? "none" : "0 4px 12px rgba(25, 118, 243, 0.15)",
          }}
        >
          {isActive ? (
            <>
              <Check size={14} /> Terpilih
            </>
          ) : (
            <>
              Pilih Event <ArrowRight size={14} />
            </>
          )}
        </Link>
        <div className="flex gap-2">
          <a
            href={`/e/${event.slug}`}
            target="_blank"
            rel="noreferrer"
            className="flex flex-1 items-center justify-center gap-1"
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "1.5px solid var(--a-clr-border)",
              fontSize: 12,
              fontWeight: 700,
              color: "#0F172A",
            }}
          >
            <ExternalLink size={12} />
            Playground
          </a>
          <button
            onClick={() => setConfirmOpen(true)}
            className="flex flex-1 items-center justify-center gap-1"
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "1.5px solid #FEE2E2",
              background: "#FEF2F2",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--a-clr-danger)",
            }}
          >
            <Trash2 size={12} />
            Hapus
          </button>
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={confirmOpen}
        itemLabel="event"
        itemName={event.identity.internalName}
        description="Semua data untuk event ini — termasuk momen & struk yang sudah diambil tamu — "
        deleting={deleting}
        error={deleteError}
        onClose={() => {
          setConfirmOpen(false);
          setDeleteError(null);
        }}
        onConfirm={remove}
      />
    </motion.div>
  );
}

export default function AdminDashboard({
  events,
  subscriptions,
  canCreateMore,
  needsPlan,
  clientType,
}: {
  events: Event[];
  subscriptions: (Subscription | null)[];
  /** false kalau jatah event klien ini sudah habis (Acara Sendiri yang
      1 event-nya terpakai, ATAU Vendor/EO yang eventSlotsTotal-nya
      habis) — dihitung di server (app/admin/(protected)/page.tsx),
      penegakan SUNGGUHAN ada di app/api/admin/events/route.ts (bukan
      cuma tombol ini yang disembunyikan). */
  canCreateMore: boolean;
  /** true = klien belum pernah memilih paket — wizard WAJIB menanyakan
      paket dulu. Diteruskan apa adanya ke CreateEventWizard. */
  needsPlan: boolean;
  clientType: "personal" | "vendor";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  // Halaman ini tidak punya id event di URL — event aktif dibaca dari
  // penyimpanan lokal (lihat catatan di lib/activeEvent.ts).
  const activeEventId = useActiveEventId(null);

  // Dipicu dari panel "Event Aktif" di sidebar (AdminShell) —
  // "+ Buat Event Baru" di sana push ke /admin?action=create supaya
  // wizard langsung terbuka meski sebelumnya sedang di halaman lain.
  // Pola sama seperti referensi (?action=create di dashboard/page.tsx).
  useEffect(() => {
    if (searchParams.get("action") === "create") {
      setWizardOpen(true);
      router.replace("/admin");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const rows = useMemo(
    () => events.map((event, i) => ({ event, subscription: subscriptions[i] ?? null })),
    [events, subscriptions]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(({ event }) => {
      if (removedIds.has(event.id)) return false;
      if (!q) return true;
      return (
        event.identity.internalName.toLowerCase().includes(q) ||
        event.identity.names.toLowerCase().includes(q) ||
        event.slug.toLowerCase().includes(q)
      );
    });
  }, [rows, query, removedIds]);

  const totalCount = rows.length - removedIds.size;

  // Kosong sungguhan (belum pernah buat event sama sekali) — kartu besar
  // terpusat menggantikan header+grid, meniru "Belum Ada Pesta" di
  // referensi. Beda dari "hasil pencarian kosong" (query mengetik tapi
  // tidak ketemu) — itu tetap tampilkan header+search, cuma grid-nya
  // cuma berisi kartu "Buat Event Baru".
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
            style={{
              width: 100,
              height: 100,
              background: "var(--a-clr-primary-light)",
              borderRadius: "50%",
              margin: "0 auto 24px",
            }}
          >
            <PartyPopper size={48} color="var(--a-clr-primary)" />
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: "#0F172A", marginBottom: 12 }}>Belum Ada Event</h2>
          <p style={{ color: "var(--a-clr-text-muted)", fontSize: 16, lineHeight: 1.6, marginBottom: 32, fontWeight: 500 }}>
            Ruang kerja kamu masih kosong. Mulai buat acara photobox pertamamu sekarang.
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
            <PartyPopper size={20} /> Buat Event Baru
          </motion.button>
        </motion.div>
        {wizardOpen && (
          <CreateEventWizard onClose={() => setWizardOpen(false)} needsPlan={needsPlan} clientType={clientType} />
        )}
      </div>
    );
  }

  return (
    <div>
      <div>
        {/* fontSize:32/fontWeight:900/letterSpacing:-0.02em — samakan ke
            "Pilih Pesta Anda" di referensi, bukan text-2xl/800 bawaan. */}
        <h1 style={{ fontSize: 32, fontWeight: 900, color: "#0F172A", marginBottom: 8, letterSpacing: "-0.02em" }}>
          Pilih Event Anda
        </h1>
        <p style={{ fontSize: 16, color: "var(--a-clr-text-muted)", fontWeight: 500, marginBottom: 16 }}>
          Anda memiliki {totalCount} event yang terencana.
        </p>

        <div style={{ position: "relative", maxWidth: 400 }}>
          <Search size={18} color="var(--a-clr-text-muted)" style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama event..."
            className="admin-input"
            style={{ margin: 0, padding: "12px 16px 12px 44px" }}
          />
        </div>
      </div>

      <div
        className="grid"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24, marginTop: 24 }}
      >
        {filtered.map(({ event, subscription }) => (
          <EventCard
            key={event.id}
            event={event}
            subscription={subscription}
            isActive={event.id === activeEventId}
            onDeleted={(id) => setRemovedIds((s) => new Set(s).add(id))}
          />
        ))}

        {canCreateMore && (
          <button
            onClick={() => setWizardOpen(true)}
            className="flex flex-col items-center justify-center transition hover:border-[var(--a-clr-primary)]"
            style={{
              minHeight: 200,
              gap: 12,
              borderRadius: 24,
              border: "2px dashed var(--a-clr-border)",
              background: "rgba(255,255,255,0.5)",
            }}
          >
            <span
              className="grid place-items-center rounded-full"
              style={{ width: 48, height: 48, background: "var(--a-clr-primary-light)" }}
            >
              <Plus size={22} color="var(--a-clr-primary)" />
            </span>
            <span style={{ fontWeight: 800, fontSize: 16, color: "var(--a-clr-primary)" }}>Buat Event Baru</span>
          </button>
        )}
      </div>

      {!canCreateMore && (
        <p className="mt-4 text-center text-xs font-medium text-[var(--a-clr-text-muted)]">
          {clientType === "personal"
            ? "Akun Acara Sendiri cuma bisa punya 1 event. Hapus event yang ada dulu kalau mau buat yang baru."
            : "Jatah event sudah habis. Beli \"Tambah Jatah Event\" di halaman Paket & Billing dulu."}
        </p>
      )}

      {wizardOpen && (
        <CreateEventWizard onClose={() => setWizardOpen(false)} needsPlan={needsPlan} clientType={clientType} />
      )}
    </div>
  );
}
