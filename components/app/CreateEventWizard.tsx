"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertTriangle, Check } from "lucide-react";
import Spinner from "@/components/admin/Spinner";
import { fromLocalInputValue } from "@/lib/services/indonesiaTimezone";

export interface WizardCategory {
  id: string;
  code: string;
  name: string;
  icon: string | null;
}
export interface WizardPackage {
  id: string;
  code: string;
  name: string;
  tagline: string | null;
  priceIdr: number;
  strips: number;
  activeDays: number;
}
export interface WizardActiveDaysOption {
  activeDays: number;
  packageName: string;
}

const TIMEZONES = [
  { value: "Asia/Jakarta", label: "WIB — Jakarta" },
  { value: "Asia/Makassar", label: "WITA — Makassar" },
  { value: "Asia/Jayapura", label: "WIT — Jayapura" },
];

/**
 * Wizard buat acara /app/events/new — dok 05 §4, TIGA langkah tetap
 * (beda dari components/admin/CreateEventWizard.tsx lama yang 3-4
 * langkah KONDISIONAL dan menanyakan paket di langkah 2 — D-02).
 *
 * Langkah 1: kategori + nama internal.
 * Langkah 2: jadwal mulai (wajib) + zona waktu + lokasi (opsional) +
 *   peringatan persisten (kutipan persis dok 05 §4).
 * Langkah 3: cabang kuota — Perorangan pilih paket, Vendor alokasi dari
 *   dompet + pilih masa aktif (lihat lib/db/queries/allocation.ts).
 *
 * Prinsip dok 05 §4: "wizard hanya menanyakan yang dibutuhkan untuk
 * membuat. Sisanya diisi belakangan di Detail Acara" — sapaan/tagar/
 * sambutan (field lama di wizard JSON) SENGAJA tidak ada di sini,
 * pindah ke Visual Builder (Langkah 7)/Detail Acara (Langkah 6).
 */
export default function CreateEventWizard({
  categories,
  accountType,
  packages,
  walletBalance,
  activeDaysOptions,
}: {
  categories: WizardCategory[];
  accountType: "personal" | "vendor";
  packages: WizardPackage[];
  walletBalance: number;
  activeDaysOptions: WizardActiveDaysOption[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [internalName, setInternalName] = useState("");

  const [startsAt, setStartsAt] = useState("");
  const [timezone, setTimezone] = useState("Asia/Jakarta");
  const [venue, setVenue] = useState("");

  const [packageId, setPackageId] = useState<string | null>(null);
  const [allocateStrips, setAllocateStrips] = useState<number>(Math.min(100, walletBalance || 100));
  const [activeDays, setActiveDays] = useState<number | null>(activeDaysOptions[0]?.activeDays ?? null);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const step1Valid = !!categoryId && internalName.trim().length > 0;
  const step2Valid = !!startsAt;
  const step3Valid =
    accountType === "personal"
      ? !!packageId
      : allocateStrips > 0 && allocateStrips <= walletBalance && activeDays !== null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/app/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          internalName,
          startsAt: fromLocalInputValue(startsAt, timezone).toISOString(),
          timezone,
          venue: venue || undefined,
          ...(accountType === "personal" ? { packageId } : { allocateStrips, activeDays }),
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { error?: string; event?: { id: string }; order?: { id: string } }
        | null;
      if (!res.ok) {
        setError(data?.error ?? "Gagal membuat acara.");
        return;
      }
      if (data?.order) {
        router.push(`/app/orders/${data.order.id}/payment`);
      } else if (data?.event) {
        router.push(`/app/events/${data.event.id}/details`);
      }
    } catch {
      setError("Tidak bisa menghubungi server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <StepDots step={step} />

      {step === 1 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: "#18181B", marginBottom: 4 }}>Acara apa ini?</h1>
          <p style={{ fontSize: 13, color: "#71717A", marginBottom: 20 }}>Pilih kategori dan beri nama internal.</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 20 }}>
            {categories.map((c) => {
              const active = categoryId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    border: `2px solid ${active ? "var(--a-clr-primary)" : "#E4E4E7"}`,
                    background: active ? "var(--a-clr-primary-light)" : "white",
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{c.icon ?? "🎉"}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: active ? "var(--a-clr-primary)" : "#18181B" }}>
                    {c.name}
                  </div>
                </button>
              );
            })}
          </div>

          <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 4, color: "#3F3F46" }}>
            Nama internal
          </label>
          <input
            className="admin-input"
            style={{ margin: 0 }}
            placeholder="mis. Wedding Salma & Faizal — hanya kamu yang lihat"
            value={internalName}
            onChange={(e) => setInternalName(e.target.value)}
          />

          <WizardNav onNext={() => setStep(2)} nextDisabled={!step1Valid} />
        </motion.div>
      )}

      {step === 2 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: "#18181B", marginBottom: 4 }}>Kapan acaranya?</h1>
          <p style={{ fontSize: 13, color: "#71717A", marginBottom: 20 }}>Jadwal sungguhan acara — bukan tanggal publikasi.</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 4, color: "#3F3F46" }}>
                Jadwal mulai
              </label>
              <input
                type="datetime-local"
                className="admin-input"
                style={{ margin: 0 }}
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 4, color: "#3F3F46" }}>
                Zona waktu
              </label>
              <select className="admin-input" style={{ margin: 0 }} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 4, color: "#3F3F46" }}>
                Lokasi <span style={{ fontWeight: 500, color: "#94A3B8" }}>(boleh diisi nanti)</span>
              </label>
              <input
                className="admin-input"
                style={{ margin: 0 }}
                placeholder="mis. Grand Ballroom, Jakarta"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              padding: 14,
              borderRadius: 12,
              background: "#FEF3C7",
              border: "1px solid #FDE68A",
              marginBottom: 12,
            }}
          >
            <AlertTriangle size={18} color="#B45309" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12.5, color: "#92400E", lineHeight: 1.5, fontWeight: 600 }}>
              ⏰ Masa aktif dihitung dari jadwal mulai, bukan dari kapan kamu mempublikasikan. Salah isi berarti
              acaramu kedaluwarsa sebelum waktunya.
            </p>
          </div>

          <WizardNav onBack={() => setStep(1)} onNext={() => setStep(3)} nextDisabled={!step2Valid} />
        </motion.div>
      )}

      {step === 3 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {accountType === "personal" ? (
            <>
              <h1 style={{ fontSize: 20, fontWeight: 900, color: "#18181B", marginBottom: 4 }}>Pilih paket</h1>
              <p style={{ fontSize: 13, color: "#71717A", marginBottom: 20 }}>
                Acara langsung tersimpan sebagai draft — hanya publikasi yang menunggu lunas.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                {packages.map((p) => {
                  const active = packageId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPackageId(p.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: 16,
                        borderRadius: 14,
                        border: `2px solid ${active ? "var(--a-clr-primary)" : "#E4E4E7"}`,
                        background: active ? "var(--a-clr-primary-light)" : "white",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: "#18181B" }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: "#71717A" }}>
                          {p.strips} strip · {p.activeDays} hari aktif
                        </div>
                      </div>
                      <div style={{ fontWeight: 900, fontSize: 15, color: "var(--a-clr-primary)" }}>
                        Rp{p.priceIdr.toLocaleString("id-ID")}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: 20, fontWeight: 900, color: "#18181B", marginBottom: 4 }}>Alokasikan kuota</h1>
              <p style={{ fontSize: 13, color: "#71717A", marginBottom: 16 }}>
                Sisa saldo dompet: <strong>{walletBalance.toLocaleString("id-ID")} strip</strong>
              </p>

              {walletBalance <= 0 ? (
                <div style={{ padding: 16, borderRadius: 12, background: "#FEF2F2", border: "1px solid #FECACA", marginBottom: 16 }}>
                  <p style={{ fontSize: 13, color: "#991B1B", fontWeight: 700, marginBottom: 6 }}>Saldo dompet kosong.</p>
                  <a href="/app/billing" style={{ fontSize: 13, fontWeight: 800, color: "var(--a-clr-primary)" }}>
                    Isi ulang dompet →
                  </a>
                </div>
              ) : (
                <>
                  <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 4, color: "#3F3F46" }}>
                    Jumlah strip dialokasikan
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={walletBalance}
                    className="admin-input"
                    style={{ margin: 0, marginBottom: 12 }}
                    value={allocateStrips}
                    onChange={(e) => setAllocateStrips(Number(e.target.value))}
                  />

                  <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 4, color: "#3F3F46" }}>
                    Masa aktif acara
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                    {activeDaysOptions.map((o) => (
                      <button
                        key={o.activeDays}
                        type="button"
                        onClick={() => setActiveDays(o.activeDays)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 14px",
                          borderRadius: 10,
                          border: `2px solid ${activeDays === o.activeDays ? "var(--a-clr-primary)" : "#E4E4E7"}`,
                          background: activeDays === o.activeDays ? "var(--a-clr-primary-light)" : "white",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#18181B" }}>{o.activeDays} hari</span>
                        <span style={{ fontSize: 11.5, color: "#71717A" }}>seperti {o.packageName}</span>
                        {activeDays === o.activeDays && <Check size={16} color="var(--a-clr-primary)" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {error && <p style={{ fontSize: 13, color: "#EF4444", marginBottom: 12 }}>{error}</p>}

          <WizardNav
            onBack={() => setStep(2)}
            onNext={submit}
            nextLabel={busy ? "Membuat…" : "Buat Acara"}
            nextDisabled={!step3Valid || busy}
            busy={busy}
          />
        </motion.div>
      )}
    </div>
  );
}

function StepDots({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 24, justifyContent: "center" }}>
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          style={{
            width: n === step ? 24 : 8,
            height: 8,
            borderRadius: 100,
            background: n <= step ? "var(--a-clr-primary)" : "#E4E4E7",
            transition: "all 0.2s",
          }}
        />
      ))}
    </div>
  );
}

function WizardNav({
  onBack,
  onNext,
  nextDisabled,
  nextLabel = "Lanjut",
  busy = false,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  busy?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          style={{ padding: "10px 18px", borderRadius: 100, border: "1px solid #E4E4E7", background: "white", fontWeight: 700, fontSize: 13, cursor: "pointer", color: "#3F3F46" }}
        >
          Kembali
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 20px",
          borderRadius: 100,
          border: "none",
          background: "linear-gradient(135deg, var(--a-clr-brand-1), var(--a-clr-brand-2))",
          color: "white",
          fontWeight: 800,
          fontSize: 13,
          cursor: nextDisabled ? "not-allowed" : "pointer",
          opacity: nextDisabled ? 0.5 : 1,
        }}
      >
        {busy && <Spinner size={14} />}
        {nextLabel}
      </button>
    </div>
  );
}
