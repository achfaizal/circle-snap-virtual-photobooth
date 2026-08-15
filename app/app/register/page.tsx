"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, ArrowLeft, Camera, Briefcase } from "lucide-react";
import Spinner from "@/components/admin/Spinner";

type ClientMode = "personal" | "vendor";

const MODES: { key: ClientMode; icon: React.ReactNode; label: string; sub: string; color: string; bg: string }[] = [
  {
    key: "personal",
    icon: <Camera size={20} />,
    label: "Acara Sendiri",
    sub: "mis. nikahan kamu",
    color: "var(--a-clr-primary)",
    bg: "var(--a-clr-primary-light)",
  },
  {
    key: "vendor",
    icon: <Briefcase size={20} />,
    label: "Vendor / EO",
    sub: "Kelola banyak acara klien",
    color: "#4338CA",
    bg: "#EEF2FF",
  },
];

/**
 * Pendaftaran KLIEN (/app/*, Tahap 3) — diadaptasi dari
 * app/admin/register/page.tsx, endpoint baru /api/app/register (Postgres
 * users/accounts/account_members, bukan Client JSON). D-01 tercabut:
 * teks "1 acara" pada mode Perorangan SUDAH dihapus dari sini (lihat
 * lib/services/planCatalog.ts / dok 09 §1) — batas acara sekarang per
 * pembelian paket (packages.max_events), bukan per akun.
 */
export default function AppRegisterPage() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [mode, setMode] = useState<ClientMode | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", whatsapp: "", businessName: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/app/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, mode }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Gagal mendaftar.");
        return;
      }
      router.replace("/app");
      router.refresh();
    } catch {
      setError("Tidak bisa menghubungi server.");
    } finally {
      setBusy(false);
    }
  };

  const disabled =
    busy ||
    !mode ||
    !form.name ||
    !form.email ||
    !form.password ||
    !form.whatsapp ||
    (mode === "vendor" && !form.businessName);

  return (
    <div className="admin-login-bg relative z-10 grid min-h-dvh place-items-center px-6 py-10">
      <motion.form
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        onSubmit={submit}
        style={{
          background: "white",
          borderRadius: 28,
          padding: "32px 24px",
          boxShadow: "0 20px 60px rgba(25, 118, 243, 0.15)",
          width: "100%",
          maxWidth: 480,
          border: "1px solid rgba(25, 118, 243, 0.1)",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ikon
              statis kecil, tidak butuh optimisasi next/image */}
          <img src="/logo/1.png" alt="Circle Snap" style={{ width: 40, height: 40, flexShrink: 0 }} />
          <span style={{ fontWeight: 900, fontSize: 24, lineHeight: 1.15, letterSpacing: "-0.03em" }}>
            <span style={{ color: "#000000" }}>Circle Snap</span> <span style={{ color: "#1976f3" }}>Virtual Booth</span>
          </span>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 4, letterSpacing: "-0.03em", color: "#18181B" }}>
          Buat akun baru 🚀
        </h1>
        <p style={{ color: "#71717A", fontSize: 14, marginBottom: 20, fontWeight: 500 }}>
          Daftar untuk mulai kelola photobooth acaramu.
        </p>

        <p style={{ fontSize: 13, fontWeight: 800, marginBottom: 8, color: "#3f3f46" }}>Kamu daftar sebagai apa?</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          {MODES.map((m) => {
            const active = mode === m.key;
            return (
              <motion.button
                key={m.key}
                type="button"
                onClick={() => setMode(m.key)}
                whileTap={{ scale: 0.97 }}
                style={{
                  padding: 12,
                  borderRadius: 16,
                  border: `2px solid ${active ? m.color : "#e4e4e7"}`,
                  background: active ? m.bg : "white",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.2s",
                  boxShadow: active ? `0 8px 20px ${m.color}20` : "none",
                }}
              >
                <div style={{ display: "flex", justifyContent: "center", color: active ? m.color : "#71717A", marginBottom: 8 }}>
                  {m.icon}
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: active ? m.color : "#18181b", marginBottom: 2 }}>
                  {m.label}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: active ? m.color : "#71717A" }}>{m.sub}</div>
              </motion.button>
            );
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 4, color: "#3F3F46" }}>
              {mode === "vendor" ? "Nama penanggung jawab" : "Nama"}
            </label>
            <input
              id="name"
              type="text"
              autoFocus
              autoComplete="name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder={mode === "vendor" ? "Nama kamu (bukan nama usaha)" : "Nama kamu"}
              className="admin-input"
              style={{ margin: 0 }}
            />
          </div>

          {mode === "vendor" && (
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 4, color: "#3F3F46" }}>
                Nama usaha / EO
              </label>
              <input
                id="businessName"
                type="text"
                autoComplete="organization"
                value={form.businessName}
                onChange={(e) => setForm((p) => ({ ...p, businessName: e.target.value }))}
                placeholder="mis. Kirana Organizer"
                className="admin-input"
                style={{ margin: 0 }}
              />
            </div>
          )}

          <div>
            <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 4, color: "#3F3F46" }}>
              Nomor WhatsApp
            </label>
            <input
              id="whatsapp"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={form.whatsapp}
              onChange={(e) => setForm((p) => ({ ...p, whatsapp: e.target.value }))}
              placeholder="0812-3456-7890"
              className="admin-input"
              style={{ margin: 0 }}
            />
            <p style={{ fontSize: 11.5, color: "#71717A", marginTop: 4, lineHeight: 1.45 }}>
              Dipakai untuk konfirmasi pembayaran dan kabar soal acaramu.
            </p>
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 4, color: "#3F3F46" }}>
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="nama@email.com"
              className="admin-input"
              style={{ margin: 0 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 4, color: "#3F3F46" }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="password"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                className="admin-input"
                style={{ margin: 0, paddingRight: 48 }}
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
                aria-pressed={show}
                style={{
                  position: "absolute",
                  right: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#71717A",
                  display: "flex",
                }}
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <span style={{ marginTop: 4, display: "block", fontSize: 12, color: "#94A3B8" }}>Minimal 8 karakter</span>
          </div>
        </div>

        {error && <p style={{ marginTop: 12, fontSize: 14, fontWeight: 500, color: "#EF4444" }}>{error}</p>}

        <motion.button
          type="submit"
          disabled={disabled}
          whileHover={disabled ? {} : { y: -2 }}
          whileTap={disabled ? {} : { scale: 0.98 }}
          style={{
            width: "100%",
            marginTop: 20,
            padding: "12px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            background: "linear-gradient(135deg, var(--a-clr-brand-1), var(--a-clr-brand-2))",
            color: "white",
            border: "none",
            borderRadius: 100,
            fontWeight: 800,
            fontSize: 15,
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.6 : 1,
            boxShadow: "0 8px 20px rgba(25, 118, 243, 0.3)",
          }}
        >
          {busy && <Spinner size={15} />}
          {busy ? "Mendaftarkan…" : "Daftar Sekarang"}
        </motion.button>

        <p style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#71717A", fontWeight: 500 }}>
          Sudah punya akun?{" "}
          <Link href="/app/login" style={{ color: "var(--a-clr-primary)", fontWeight: 800, textDecoration: "none" }}>
            Masuk
          </Link>
        </p>
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#71717A", textDecoration: "none", fontWeight: 600 }}>
            <ArrowLeft size={14} /> Kembali ke beranda
          </Link>
        </div>
      </motion.form>
    </div>
  );
}
