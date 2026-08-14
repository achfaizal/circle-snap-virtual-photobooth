"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CreditCard,
  FolderOpen,
  Frame,
  Image as ImageIcon,
  Images,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Menu,
  Package,
  Palette,
  Rocket,
  Tag,
  Users,
  CalendarDays,
  SlidersHorizontal,
  X,
  Plus,
} from "lucide-react";
import type { EventKind } from "@/lib/models/event";
import { eventKindMeta } from "@/lib/services/eventKind";
import { useActiveEventId } from "@/lib/activeEvent";

/** Menu KLIEN — tidak terikat event mana pun. */
const CLIENT_NAV = [
  { href: "/admin", label: "Daftar Event", icon: FolderOpen },
  { href: "/admin/frames", label: "Pustaka Bingkai", icon: ImageIcon },
  { href: "/admin/billing", label: "Paket & Billing", icon: CreditCard },
];

/**
 * Menu STAFF — menggantikan menu klien sepenuhnya, bukan menambahinya.
 *
 * Staff tidak punya acara sendiri (lihat penjaga di
 * app/api/admin/events/route.ts), jadi "Daftar Event" dan "Paket &
 * Billing" tidak ada artinya untuknya — menampilkannya cuma
 * menjanjikan sesuatu yang berujung halaman kosong atau ditolak API.
 */
const STAFF_NAV = [
  { href: "/admin/staff/clients", label: "Klien", icon: Users },
  { href: "/admin/staff/events", label: "Acara", icon: CalendarDays },
  { href: "/admin/frames", label: "Pustaka Bingkai", icon: ImageIcon },
  // Tahap 2 (Postgres) — berdampingan dengan tiga di atas (JSON), lihat
  // docs/BRD/09-DELTA-DARI-IMPLEMENTASI.md §5 dan rencana Tahap 2.
  { href: "/admin/categories", label: "Kategori Acara", icon: Tag },
  { href: "/admin/packages", label: "Paket", icon: Package },
  { href: "/admin/system-frames", label: "Bingkai Sistem", icon: Frame },
];

/** Menu yang baru muncul setelah ada event aktif — `suffix` ditempel di
    belakang /admin/events/{id}. Urutannya mengikuti alur kerja nyata:
    lihat keadaan → ubah detail → atur tampilan → pilih bingkai →
    terbitkan. */
const EVENT_NAV = [
  { suffix: "", label: "Ringkasan", icon: LayoutDashboard },
  { suffix: "/info", label: "Detail Acara", icon: SlidersHorizontal },
  { suffix: "/template", label: "Template", icon: LayoutTemplate },
  { suffix: "/visual", label: "Visual Builder", icon: Palette },
  { suffix: "/frames", label: "Bingkai", icon: Frame },
  { suffix: "/moments", label: "Momen", icon: Images },
  { suffix: "/publish", label: "Publish", icon: Rocket },
];

export interface ShellEvent {
  id: string;
  name: string;
  kind?: EventKind;
  status: "draft" | "live" | "ended";
  /** Sisa kuota <= 20% — sinyal notifikasi NYATA (dari subscription
      sungguhan), dihitung sekali di layout server. Lihat §11.3
      UI-UX-DESIGN-SYSTEM.md ("Sistem Notifikasi") — bukan data bikinan. */
  quotaLow?: boolean;
  quotaLeft?: number;
}

/**
 * Identitas visual admin SENGAJA lepas dari sistem tema event
 * (lib/event.ts themeVars) — admin menampilkan banyak event dengan tema
 * berbeda-beda sekaligus, jadi tidak boleh ikut warna event mana pun.
 *
 * Palet TERANG + logo resmi Circle Snap
 * (public/logo/Circle_Snap_Brand_Guidelines_v1.0.pdf) — lewat class
 * `.admin-*` di app/globals.css, bukan token playground yang gelap.
 *
 * Struktur sidebar+drawer mengikuti referensi Glyka PartyBox
 * (docs/blueprint/08-adopsi-desain-vlass.md): sebelumnya bar mobile di
 * sini cuma judul+"Keluar" — nav "Pustaka Bingkai" SAMA SEKALI tidak
 * terjangkau dari layar sempit. Sekarang jadi hamburger yang membuka
 * sidebar penuh sebagai drawer (overlay gelap di belakangnya, klik di
 * luar untuk menutup) — gap nyata, bukan cuma kosmetik.
 *
 * Panel "Event Aktif" (referensi: "Pesta Aktif") — beda dari referensi,
 * kita TIDAK punya konsep "party" tunggal di localStorage; "aktif" di
 * sini murni diturunkan dari URL: kalau sedang membuka
 * /admin/events/{id}, event itu yang tersorot. Daftarnya datang dari
 * server (app/admin/(protected)/layout.tsx), bukan localStorage. */
export default function AdminShell({
  children,
  events,
  clientName,
  showEventSwitcher,
  isStaff = false,
}: {
  children: React.ReactNode;
  events: ShellEvent[];
  clientName: string;
  /** Akun internal Circle Snap — dapat menu Klien & Acara, dan TIDAK
      dapat menu milik klien (Daftar Event, Paket & Billing) maupun
      panel "Kelola Event", karena staff tidak punya acara sendiri. */
  isStaff?: boolean;
  /** false untuk klien "Acara Sendiri" — mereka cuma boleh punya 1
      event, jadi panel pilih/ganti-event tidak relevan sama sekali
      (bukan cuma disembunyikan kosong, memang tidak ada gunanya).
      Ditentukan di server (app/admin/(protected)/layout.tsx) dari
      Client.type, bukan ditebak dari jumlah event di sini. */
  showEventSwitcher: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  // Staff memakai menu yang BERBEDA, bukan tambahan.
  const workspaceNav = isStaff ? STAFF_NAV : CLIENT_NAV;

  const eventIdFromUrl = pathname.match(/^\/admin\/events\/([^/]+)/)?.[1] ?? null;
  const activeEventId = useActiveEventId(eventIdFromUrl);
  const known = events.find((e) => e.id === activeEventId) ?? null;

  /**
   * Kalau URL-nya JELAS halaman event tapi event itu belum ada di daftar
   * `events`, tetap tampilkan menu "Kelola Event" — pakai id dari URL dan
   * nama sementara.
   *
   * Ini bukan penambal kosmetik. `events` datang dari layout Server
   * Component, dan navigasi sisi-klien TIDAK me-render ulang layout —
   * jadi tepat setelah wizard membuat event, daftar itu masih kosong.
   * Akibatnya klien mendarat di halaman event miliknya sendiri TANPA
   * menu Publish sama sekali (dilaporkan pengguna: "di mana saya mau
   * publish"). CreateEventWizard sekarang memanggil router.refresh(),
   * tapi refresh itu asinkron dan tetap ada jeda — menu navigasi tidak
   * boleh menghilang walau sedetik, apalagi kalau refresh-nya gagal.
   */
  const activeEvent =
    known ??
    (eventIdFromUrl ? { id: eventIdFromUrl, name: "Event ini", status: "draft" as const } : null);

  // Label topbar memakai eventIdFromUrl, BUKAN activeEventId — event
  // aktif tetap tersimpan saat klien kembali ke Daftar Event (supaya
  // menu "Kelola Event" tidak hilang), tapi judul di topbar harus
  // mengikuti halaman yang benar-benar sedang dibuka.
  const eventSuffix = eventIdFromUrl ? pathname.replace(`/admin/events/${eventIdFromUrl}`, "") : "";
  const eventSectionLabel = EVENT_NAV.find((n) => n.suffix === eventSuffix)?.label;
  const onEventPage = Boolean(eventIdFromUrl);
  // Judul topbar sengaja pakai `known` (data sungguhan), BUKAN placeholder
  // di atas — lebih baik menampilkan nama bagiannya saja ("Visual Builder")
  // daripada nama tiruan "Event ini" yang menyesatkan.
  const pageLabel =
    onEventPage && known
      ? `${known.name}${eventSectionLabel ? ` · ${eventSectionLabel}` : ""}`
      : onEventPage
        ? (eventSectionLabel ?? "Event")
        : (workspaceNav.find((n) => (n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href)))
            ?.label ?? "Circle Snap");

  // Notifikasi kuota rendah — satu-satunya sinyal yang benar-benar kita
  // punya datanya (bukan bell dekoratif tanpa isi). Event berstatus
  // "ended" sengaja dikecualikan — kuota rendah di acara yang sudah
  // selesai bukan lagi hal yang perlu ditindaklanjuti.
  const lowQuotaEvents = events.filter((e) => e.quotaLow && e.status !== "ended");

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  };

  const goToEvent = (id: string) => {
    setSwitcherOpen(false);
    setDrawerOpen(false);
    router.push(`/admin/events/${id}`);
  };

  const createEvent = () => {
    setSwitcherOpen(false);
    setDrawerOpen(false);
    // Dashboard (AdminDashboard.tsx) membaca ?action=create dan langsung
    // membuka wizard "Buat Event Baru" — pola yang sama dengan tombol
    // serupa di referensi (router.push(`${locale}/dashboard?action=create`)).
    router.push("/admin?action=create");
  };

  const sidebarBody = (
    <>
      <div className="flex items-center gap-3 px-6 py-6">
        {/* eslint-disable-next-line @next/next/no-img-element -- ikon
            statis kecil, tidak butuh optimisasi next/image */}
        <img src="/logo/1.png" alt="Circle Snap" className="h-9 w-9" />
        {/* fontSize:20/fontWeight:900/letterSpacing:-0.03em — persis
            wordmark sidebar referensi, bukan text-lg/800 bawaan. */}
        <span style={{ fontWeight: 900, fontSize: 20, letterSpacing: "-0.03em", color: "var(--a-clr-primary-dark)" }}>
          Circle Snap
        </span>
        <button
          onClick={() => setDrawerOpen(false)}
          aria-label="Tutup menu"
          className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-[var(--a-clr-text-muted)] sm:hidden"
        >
          <X size={18} />
        </button>
      </div>

      {/* Event Aktif — cuma untuk klien "vendor" (boleh kelola >1 event).
          Klien "Acara Sendiri" jatahnya 1 event, jadi panel ganti-event
          ini tidak relevan sama sekali (lihat prop showEventSwitcher). */}
      {showEventSwitcher && (
      <div className="mt-4 px-4">
        <p
          className="uppercase tracking-wide"
          style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", marginBottom: 8, paddingLeft: 12 }}
        >
          Event Aktif
        </p>
        <div className="relative">
          <button
            type="button"
            onClick={() => setSwitcherOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={switcherOpen}
            className="flex w-full items-center justify-between text-left transition"
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1.5px solid var(--a-clr-border)",
              background: "var(--a-clr-bg)",
              color: "#0F172A",
              fontWeight: 800,
              fontSize: 14,
            }}
          >
            {/* Pemilih event menampilkan `known` (data sungguhan) — nama
                tiruan tidak berguna di sini, dan daftar di bawahnya juga
                cuma berisi event yang benar-benar sudah dimuat. */}
            <span className="flex min-w-0 items-center gap-1.5 truncate">
              {known ? (
                <>
                  <span>{eventKindMeta(known.kind)?.emoji ?? "🎬"}</span>
                  <span className="truncate">{known.name}</span>
                </>
              ) : (
                <span style={{ color: "var(--a-clr-text-muted)", fontWeight: 600 }}>-- Pilih Event --</span>
              )}
            </span>
            <span
              style={{
                color: "#64748B",
                fontSize: 10,
                transform: switcherOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
                flexShrink: 0,
              }}
            >
              ▼
            </span>
          </button>

          <AnimatePresence>
            {switcherOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 right-0 z-[100] overflow-hidden"
                style={{
                  top: "100%",
                  marginTop: 8,
                  background: "white",
                  border: "1px solid var(--a-clr-border)",
                  borderRadius: 12,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
                }}
              >
                <div style={{ maxHeight: 200, overflowY: "auto" }}>
                  {events.length === 0 && (
                    <p className="px-4 py-3 text-xs font-medium text-[var(--a-clr-text-muted)]">Belum ada event.</p>
                  )}
                  {events.map((e) => {
                    const selected = e.id === activeEventId;
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => goToEvent(e.id)}
                        aria-current={selected ? "true" : undefined}
                        className="flex w-full items-center gap-1.5 truncate text-left"
                        style={{
                          padding: "12px 16px",
                          fontSize: 14,
                          fontWeight: 700,
                          color: selected ? "var(--a-clr-primary)" : "#334155",
                          borderBottom: "1px solid #F1F5F9",
                          background: selected ? "var(--a-clr-primary-light)" : "white",
                        }}
                      >
                        <span>{eventKindMeta(e.kind)?.emoji ?? "🎬"}</span>
                        <span className="truncate">{e.name}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={createEvent}
                  className="flex w-full items-center gap-2"
                  style={{
                    padding: "12px 16px",
                    fontSize: 14,
                    fontWeight: 800,
                    color: "var(--a-clr-primary)",
                    background: "var(--a-clr-bg)",
                  }}
                >
                  <Plus size={15} />
                  Buat Event Baru
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      )}

      <nav className="mt-4 flex flex-1 flex-col gap-1 px-4">
        <p
          className="uppercase tracking-wide"
          style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", padding: "12px 12px 4px 12px" }}
        >
          Workspace
        </p>
        {workspaceNav.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} onClick={() => setDrawerOpen(false)}>
              <motion.div
                whileHover={active ? {} : { backgroundColor: "var(--a-clr-primary-light)" }}
                className={`admin-sidebar-link ${active ? "active" : ""}`}
              >
                <Icon size={18} />
                <span className="flex-1">{item.label}</span>
                {item.href === "/admin" && events.length > 0 && (
                  <span
                    style={{
                      background: active ? "var(--a-clr-primary)" : "var(--a-clr-border)",
                      color: active ? "white" : "#64748B",
                      fontSize: 11,
                      fontWeight: 800,
                      padding: "2px 8px",
                      borderRadius: 10,
                    }}
                  >
                    {events.length}
                  </span>
                )}
              </motion.div>
            </Link>
          );
        })}

        {/* Menu satu event — baru muncul setelah ada event aktif. Sengaja
            TIDAK ditampilkan abu-abu saat belum ada event: menu yang tidak
            bisa diklik cuma menambah kebingungan, sementara jalan masuknya
            (pilih event di Daftar Event) sudah jelas. */}
        {activeEvent && (
          <>
            <p
              className="uppercase tracking-wide"
              style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", padding: "16px 12px 4px 12px" }}
            >
              Kelola Event
            </p>
            {EVENT_NAV.map((item) => {
              const href = `/admin/events/${activeEvent.id}${item.suffix}`;
              const active = pathname === href;
              const Icon = item.icon;
              return (
                <Link key={item.suffix} href={href} onClick={() => setDrawerOpen(false)}>
                  <motion.div
                    whileHover={active ? {} : { backgroundColor: "var(--a-clr-primary-light)" }}
                    className={`admin-sidebar-link ${active ? "active" : ""}`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </motion.div>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="border-t border-[var(--a-clr-border)] p-4">
        <div className="flex items-center gap-3 px-1 py-1">
          <Link
            href="/admin/account"
            className="flex min-w-0 flex-1 items-center gap-3 rounded-lg transition hover:bg-[var(--a-clr-primary-light)]"
            style={{ margin: -6, padding: 6 }}
            title="Buka pengaturan akun"
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--a-clr-border)] text-sm font-bold text-[var(--a-clr-text-muted)]">
              {clientName.charAt(0).toUpperCase() || "C"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-[#0F172A]">{clientName}</p>
              <p className="truncate text-xs font-medium text-[var(--a-clr-text-muted)]">
                {isStaff ? "Staff Circle Snap" : showEventSwitcher ? "Vendor / EO" : "Acara Sendiri"}
              </p>
            </div>
          </Link>
          <button
            onClick={logout}
            aria-label="Keluar"
            title="Keluar"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--a-clr-text-muted)] transition hover:bg-[var(--a-clr-primary-light)] hover:text-[var(--a-clr-primary)]"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="admin-root relative z-10 flex min-h-dvh">
      {/* Sidebar desktop — statis, selalu tampil (>= sm). */}
      <aside className="hidden w-[260px] shrink-0 flex-col border-r border-[var(--a-clr-border)] bg-white sm:flex">
        {sidebarBody}
      </aside>

      {/* Drawer mobile — overlay gelap + panel slide-in, cuma dirender saat
          diminta (AnimatePresence keluar duluan sebelum di-unmount). */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-[200] bg-black/40 sm:hidden"
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="fixed inset-y-0 left-0 z-[210] flex w-[260px] flex-col overflow-y-auto bg-white sm:hidden"
            >
              {sidebarBody}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-x-hidden">
        {/* Bar mobile — tetap ada terpisah dari topbar desktop di bawah
            (beda kebutuhan: hamburger di sini, bukan label halaman). */}
        <div className="flex items-center justify-between border-b border-[var(--a-clr-border)] bg-white px-5 py-4 sm:hidden">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Buka menu"
            className="grid h-8 w-8 place-items-center rounded-lg text-[#0F172A]"
          >
            <Menu size={20} />
          </button>
          <span className="text-base font-extrabold text-[#0F172A]">Circle Snap</span>
          <button onClick={logout} className="text-xs font-semibold text-[var(--a-clr-text-muted)]">
            Keluar
          </button>
        </div>

        {/* Topbar desktop (§11.2) — sebelumnya konten langsung mulai
            tanpa chrome apa pun di layar lebar; sekarang ada label
            halaman aktif + bell notifikasi kuota, sticky di atas. */}
        <div
          className="sticky top-0 z-10 hidden items-center justify-between border-b border-[var(--a-clr-border)] bg-white/80 px-8 sm:flex"
          style={{ height: 60, backdropFilter: "blur(20px)" }}
        >
          <span className="truncate text-sm font-bold text-[#0F172A]">{pageLabel}</span>

          <div className="relative">
            <button
              onClick={() => setNotifOpen((v) => !v)}
              aria-label={`Notifikasi${lowQuotaEvents.length > 0 ? ` (${lowQuotaEvents.length} belum dibaca)` : ""}`}
              className="relative flex text-[var(--a-clr-text-muted)]"
            >
              <Bell size={20} />
              {lowQuotaEvents.length > 0 && (
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: -1,
                    right: -1,
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "var(--a-clr-danger)",
                    border: "2px solid white",
                  }}
                />
              )}
            </button>

            <AnimatePresence>
              {notifOpen && (
                <>
                  {/* Klik di luar panel menutup — dilapis di bawah panelnya
                      sendiri, transparan, cuma buat menangkap klik. */}
                  <div className="fixed inset-0 z-[90]" onClick={() => setNotifOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    className="absolute right-0 z-[100] overflow-hidden"
                    style={{
                      top: "calc(100% + 8px)",
                      width: 360,
                      maxWidth: "calc(100vw - 32px)",
                      maxHeight: 480,
                      background: "var(--a-clr-surface)",
                      borderRadius: 20,
                      boxShadow: "var(--a-shadow-lg)",
                      border: "1px solid var(--a-clr-border)",
                    }}
                  >
                    <div className="flex items-center justify-between border-b border-[var(--a-clr-border)] px-5 py-4">
                      <span className="text-[15px] font-extrabold text-[#0F172A]">Notifikasi</span>
                    </div>
                    {lowQuotaEvents.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
                        <Bell size={32} className="text-[var(--a-clr-border)]" />
                        <p className="text-sm font-medium text-[var(--a-clr-text-muted)]">Belum ada notifikasi.</p>
                      </div>
                    ) : (
                      <div style={{ maxHeight: 360, overflowY: "auto" }}>
                        {lowQuotaEvents.map((e) => (
                          <button
                            key={e.id}
                            type="button"
                            onClick={() => {
                              setNotifOpen(false);
                              router.push(`/admin/events/${e.id}?tab=publish`);
                            }}
                            className="flex w-full items-start gap-3 border-b border-[var(--a-clr-border)] px-5 py-3.5 text-left transition hover:bg-[var(--a-clr-bg)]"
                          >
                            <span
                              className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
                              style={{ background: "rgba(249, 115, 22, 0.12)" }}
                            >
                              <Bell size={16} color="var(--a-clr-warning)" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-bold text-[#0F172A]">
                                Kuota hampir habis
                              </span>
                              <span className="block text-xs leading-snug text-[var(--a-clr-text-muted)]">
                                {e.name} — sisa {e.quotaLeft} strip
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="admin-fade-in px-5 py-6 sm:px-10 sm:py-8">{children}</div>
      </div>
    </div>
  );
}
