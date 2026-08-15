"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import GoogleIcon from "@/components/admin/GoogleIcon";
import Spinner from "@/components/admin/Spinner";
import { showToast } from "@/lib/utils";

/**
 * Diterjemahkan LANGSUNG dari source referensi Glyka PartyBox
 * (docs/blueprint/08-adopsi-desain-vlass.md), nilai demi nilai lewat
 * inline style — bukan lewat class bersama `.admin-btn`/`.admin-card`
 * yang punya default sendiri (itu penyebab beberapa selisih px/gap yang
 * ketahuan pas dibandingkan langsung lewat DevTools). Satu-satunya yang
 * sengaja diganti: warna brand (pink/oranye → biru/navy Circle Snap,
 * public/logo/Circle_Snap_Brand_Guidelines_v1.0.pdf) dan logo (PNG asli,
 * bukan ikon PartyPopper di kotak gradien).
 *
 * Elemen yang sistem kita BELUM benar-benar dukung (OAuth Google, reset
 * password lewat email, pendaftaran mandiri) tetap bisa diklik tapi
 * menampilkan pesan jujur lewat toast kecil — bukan diam saja (menyesatkan,
 * terasa rusak) dan bukan disembunyikan (tidak sama dengan referensi). Yang
 * benar-benar jalan: Email + Password (verifyEmail/verifyPassword,
 * lib/adminAuth.ts). */
export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Gagal masuk.");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Tidak bisa menghubungi server.");
    } finally {
      setBusy(false);
    }
  };

  const disabled = busy || !email || !password;

  return (
    <div className="admin-login-bg relative z-10 grid min-h-dvh place-items-center px-6">
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
          maxWidth: 440,
          border: "1px solid rgba(25, 118, 243, 0.1)",
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ikon
              statis kecil, tidak butuh optimisasi next/image */}
          <img src="/logo/1.png" alt="Circle Snap" style={{ width: 40, height: 40, flexShrink: 0 }} />
          <span
            style={{
              fontWeight: 900,
              fontSize: 24,
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
            }}
          >
            <span style={{ color: "#000000" }}>Circle Snap</span>{" "}
            <span style={{ color: "#1976f3" }}>Virtual Booth</span>
          </span>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 4, letterSpacing: "-0.03em", color: "#18181B" }}>
          Selamat datang kembali! 🎉
        </h1>
        <p style={{ color: "#71717A", fontSize: 14, marginBottom: 24, fontWeight: 500 }}>
          Masuk untuk melanjutkan kelola photobox kamu.
        </p>

        {/* Google */}
        <motion.button
          type="button"
          onClick={() => showToast("Masuk dengan Google belum tersedia — pakai email & password dulu ya.")}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          style={{
            width: "100%",
            padding: "12px",
            border: "1.5px solid #e4e4e7",
            borderRadius: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            background: "white",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 14,
            color: "#18181b",
            marginBottom: 16,
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          }}
        >
          <GoogleIcon />
          Lanjutkan dengan Google
        </motion.button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: "#e4e4e7" }} />
          <span style={{ fontSize: 13, color: "#71717A", fontWeight: 600 }}>atau</span>
          <div style={{ flex: 1, height: 1, background: "#e4e4e7" }} />
        </div>

        {/* Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 4, color: "#3F3F46" }}>
              Email
            </label>
            <input
              id="email"
              type="email"
              autoFocus
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@circlesnap.app"
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
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="admin-input"
                style={{ margin: 0, paddingRight: 48 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                aria-pressed={showPassword}
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
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => showToast("Lupa password? Hubungi admin Circle Snap untuk direset.")}
              style={{
                fontSize: 13,
                color: "var(--a-clr-primary)",
                fontWeight: 700,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Lupa password?
            </button>
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
          {busy ? "Memeriksa…" : "Masuk ke Circle Snap"}
        </motion.button>

        {/* D-25 — /admin/* sekarang staf-saja (Langkah 1/11 Tahap 3),
            tidak ada lagi "Daftar" mandiri di sini. Klien daftar di
            /app/register. */}
        <p style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#71717A", fontWeight: 500 }}>
          Klien acara?{" "}
          <Link href="/app/login" style={{ color: "var(--a-clr-primary)", fontWeight: 800, textDecoration: "none" }}>
            Masuk di sini
          </Link>
        </p>

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              color: "#71717A",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={14} /> Kembali ke beranda
          </Link>
        </div>
      </motion.form>
    </div>
  );
}
