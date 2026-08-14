"use client";

import { useState } from "react";
import { Check, KeyRound, Save, ShieldCheck, User } from "lucide-react";
import type { Client } from "@/lib/models/client";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import Spinner from "./Spinner";

const TYPE_LABEL: Record<"personal" | "vendor", { label: string; hint: string }> = {
  personal: { label: "Acara Sendiri", hint: "Satu akun untuk satu acara seumur hidup akun." },
  vendor: { label: "Vendor / EO", hint: "Bisa mengelola banyak acara sekaligus." },
};

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      className="admin-card"
      style={{ padding: 24, borderRadius: 20, maxWidth: 520, marginBottom: 20 }}
    >
      <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
        {icon}
        <h2 style={{ fontSize: 15, fontWeight: 800, color: "#0F172A" }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function AccountEditor({ client }: { client: Omit<Client, "passwordHash"> }) {
  const [name, setName] = useState(client.name);
  // Baseline pembanding tombol Simpan — MULAI dari prop, tapi diperbarui
  // sendiri setelah simpan berhasil. `client.name` adalah prop statis dari
  // render server pertama dan TIDAK PERNAH berubah lagi di sesi ini; kalau
  // baseline-nya tetap prop itu, mengetik ulang PERSIS nilai awal setelah
  // sempat menyimpan perubahan lain membuat tombol terlihat "tidak ada
  // yang berubah" dan diam (disabled) — padahal di server nilainya masih
  // yang barusan disimpan, bukan nilai awal. Ditemukan nyata saat menguji
  // alur "ubah nama lalu kembalikan ke semula".
  const [savedName, setSavedName] = useState(client.name);
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const type = client.type ?? "vendor";
  const meta = TYPE_LABEL[type];

  const saveName = async () => {
    if (!name.trim() || name.trim() === savedName) return;
    setSavingName(true);
    try {
      const res = await fetch("/api/admin/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        showErrorToast(data?.error ?? "Gagal menyimpan.");
        return;
      }
      setSavedName(name.trim());
      setNameSaved(true);
      showSuccessToast("Nama tersimpan.");
      setTimeout(() => setNameSaved(false), 2000);
    } catch {
      showErrorToast("Tidak bisa menghubungi server.");
    } finally {
      setSavingName(false);
    }
  };

  const changePassword = async () => {
    setPasswordError(null);
    if (newPassword.length < 8) {
      setPasswordError("Password baru minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Konfirmasi password tidak cocok.");
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/admin/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setPasswordError(data?.error ?? "Gagal mengganti password.");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showSuccessToast("Password berhasil diganti.");
    } catch {
      setPasswordError("Tidak bisa menghubungi server.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div>
      <Card title="Profil" icon={<User size={16} color="var(--a-clr-primary)" />}>
        <label className="block" style={{ marginBottom: 12 }}>
          <span className="admin-label">Nama</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="admin-input" />
        </label>
        <label className="block" style={{ marginBottom: 16 }}>
          <span className="admin-label">Email</span>
          <input value={client.email} disabled className="admin-input" style={{ opacity: 0.6, cursor: "not-allowed" }} />
          <span className="mt-1 block text-xs text-[var(--a-clr-text-muted)]">
            Belum bisa diganti sendiri — hubungi dukungan kalau email berubah.
          </span>
        </label>

        <div
          className="flex items-center justify-between"
          style={{ borderRadius: 12, border: "1px solid var(--a-clr-border)", padding: "10px 14px", marginBottom: 16 }}
        >
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{meta.label}</p>
            <p style={{ fontSize: 11, color: "var(--a-clr-text-muted)" }}>{meta.hint}</p>
          </div>
          {client.isStaff && (
            <span
              className="inline-flex items-center gap-1"
              style={{ fontSize: 11, fontWeight: 800, color: "var(--a-clr-primary)", background: "var(--a-clr-primary-light)", borderRadius: 100, padding: "4px 10px" }}
            >
              <ShieldCheck size={11} /> Staff
            </span>
          )}
        </div>

        <p style={{ fontSize: 11, color: "var(--a-clr-text-muted)", marginBottom: 16 }}>
          Bergabung {new Date(client.createdAt).toLocaleDateString("id-ID", { dateStyle: "long" })}
        </p>

        <button
          onClick={saveName}
          disabled={savingName || !name.trim() || name.trim() === savedName}
          className="admin-btn admin-btn-primary admin-btn-press disabled:opacity-50"
        >
          {savingName ? <Spinner size={14} /> : nameSaved ? <Check size={14} /> : <Save size={14} />}
          {savingName ? "Menyimpan…" : nameSaved ? "Tersimpan!" : "Simpan Nama"}
        </button>
      </Card>

      <Card title="Ganti Password" icon={<KeyRound size={16} color="var(--a-clr-primary)" />}>
        <label className="block" style={{ marginBottom: 12 }}>
          <span className="admin-label">Password saat ini</span>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="admin-input"
            autoComplete="current-password"
          />
        </label>
        <label className="block" style={{ marginBottom: 12 }}>
          <span className="admin-label">Password baru</span>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="admin-input"
            autoComplete="new-password"
            placeholder="Minimal 8 karakter"
          />
        </label>
        <label className="block" style={{ marginBottom: 12 }}>
          <span className="admin-label">Ulangi password baru</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="admin-input"
            autoComplete="new-password"
          />
        </label>

        {passwordError && (
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--a-clr-danger)", marginBottom: 12 }}>
            {passwordError}
          </p>
        )}

        <button
          onClick={changePassword}
          disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
          className="admin-btn admin-btn-primary admin-btn-press disabled:opacity-50"
        >
          {savingPassword && <Spinner size={14} />}
          {savingPassword ? "Mengganti…" : "Ganti Password"}
        </button>
      </Card>
    </div>
  );
}
