"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check } from "lucide-react";
import { EVENT_KINDS, eventKindMeta } from "@/lib/services/eventKind";
import { plansFor, planById } from "@/lib/services/planCatalog";
import { formatIdr } from "@/lib/services/addons";
import Spinner from "./Spinner";
import { slugify } from "@/lib/slug";
import type { EventKind } from "@/lib/models/event";

/** "2026-08-20" -> "20 Agustus 2026" — saran awal untuk dateDisplay,
    klien tetap bebas menulis ulang bebas di tab Info nanti. */
function formatDateDisplay(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

interface FormState {
  kind: EventKind | null;
  internalName: string;
  names: string;
  date: string;
  dateDisplay: string;
  dateDisplayTouched: boolean;
  venue: string;
  hashtag: string;
  greeting: string;
  greetingTouched: boolean;
  brandLabel: string;
  brandLabelTouched: boolean;
  slug: string;
  slugTouched: boolean;
  planId: string | null;
}

const EMPTY_FORM: FormState = {
  kind: null,
  internalName: "",
  names: "",
  date: "",
  dateDisplay: "",
  dateDisplayTouched: false,
  venue: "",
  hashtag: "",
  greeting: "",
  greetingTouched: false,
  brandLabel: "",
  brandLabelTouched: false,
  slug: "",
  slugTouched: false,
  planId: null,
};

function Field({
  label,
  value,
  onChange,
  hint,
  placeholder,
  multiline,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  placeholder?: string;
  multiline?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="admin-label">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder={placeholder}
          className="admin-input resize-none"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="admin-input"
        />
      )}
      {hint && <span className="mt-1 block text-xs text-[var(--a-clr-text-muted)]">{hint}</span>}
    </label>
  );
}

/** Kartu pilih paket — dipakai di langkah "Pilih Paket" saja (cuma
    tampil untuk klien yang belum pernah punya Client.planId, lihat
    catatan panjang di app/api/admin/events/route.ts kenapa itu BUKAN
    sekadar "event pertama"). */
function PlanCard({
  id,
  name,
  priceIdr,
  stripQuota,
  activeDays,
  eventSlots,
  active,
  onSelect,
}: {
  id: string;
  name: string;
  priceIdr: number;
  stripQuota: number;
  activeDays: number;
  eventSlots: number;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="relative w-full rounded-2xl border-2 px-4 py-3.5 text-left transition"
      style={{
        borderColor: active ? "var(--a-clr-primary)" : "var(--a-clr-border)",
        background: active ? "var(--a-clr-primary-light)" : "white",
      }}
    >
      {active && (
        <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-[var(--a-clr-primary)] text-white">
          <Check size={12} />
        </span>
      )}
      <div className="flex items-baseline justify-between gap-3 pr-6">
        <p className="text-sm font-extrabold text-[#0F172A]">{name}</p>
        <p className="text-sm font-black text-[#0F172A]">{formatIdr(priceIdr)}</p>
      </div>
      <p className="mt-1 text-xs text-[var(--a-clr-text-muted)]">
        {stripQuota} strip · {activeDays} hari aktif{eventSlots > 1 ? ` · ${eventSlots} jatah event` : ""}
      </p>
      <p className="text-[10px] text-[var(--a-clr-text-muted)]" data-id={id} />
    </button>
  );
}

export default function CreateEventWizard({
  onClose,
  needsPlan,
  clientType,
}: {
  onClose: () => void;
  /** true = klien ini belum pernah memilih paket (Client.planId kosong)
      — wizard WAJIB menampilkan langkah "Pilih Paket". Dihitung server
      (app/admin/(protected)/page.tsx), bukan ditebak di sini. */
  needsPlan: boolean;
  clientType: "personal" | "vendor";
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Langkah bernama, bukan indeks mentah — supaya menyisipkan "Pilih
  // Paket" secara kondisional tidak menggeser arti step===1/2/3 di
  // tempat lain dan gampang salah hitung.
  const STEP_IDS = ["kind", ...(needsPlan ? (["plan"] as const) : []), "detail", "summary"] as const;
  const STEP_LABELS: Record<(typeof STEP_IDS)[number], string> = {
    kind: "Jenis & Nama",
    plan: "Pilih Paket",
    detail: "Detail Acara",
    summary: "Ringkasan",
  };
  const stepId = STEP_IDS[step];

  const goStep = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  const pickKind = (kind: EventKind) => {
    const meta = eventKindMeta(kind);
    setForm((f) => ({
      ...f,
      kind,
      brandLabel: f.brandLabelTouched ? f.brandLabel : meta?.defaultBrandLabel ?? f.brandLabel,
      greeting: f.greetingTouched ? f.greeting : meta?.defaultGreeting ?? f.greeting,
    }));
  };

  const setNames = (names: string) =>
    setForm((f) => ({ ...f, names, slug: f.slugTouched ? f.slug : slugify(names) }));

  const setDate = (date: string) =>
    setForm((f) => ({
      ...f,
      date,
      dateDisplay: f.dateDisplayTouched ? f.dateDisplay : formatDateDisplay(date),
    }));

  const step1Valid = Boolean(form.kind && form.internalName.trim() && form.names.trim() && form.date);
  const canNext = stepId === "kind" ? step1Valid : stepId === "plan" ? Boolean(form.planId) : true;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity: {
            internalName: form.internalName,
            kind: form.kind ?? undefined,
            brandLabel: form.brandLabel,
            names: form.names,
            date: form.date,
            dateDisplay: form.dateDisplay || formatDateDisplay(form.date),
            venue: form.venue,
            hashtag: form.hashtag,
            greeting: form.greeting,
          },
          slug: form.slug || slugify(form.names),
          planId: form.planId ?? undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { event?: { id: string }; error?: string }
        | null;
      if (!res.ok || !data?.event) {
        setError(data?.error ?? "Gagal membuat event.");
        return;
      }
      router.push(`/admin/events/${data.event.id}`);
      // ⚠️ WAJIB, bukan formalitas: layout admin (app/admin/(protected)/
      // layout.tsx) adalah Server Component yang mengambil daftar event
      // untuk sidebar. Navigasi sisi-klien TIDAK me-render ulang layout,
      // jadi tanpa refresh ini sidebar masih memegang daftar KOSONG —
      // grup "Kelola Event" (Ringkasan, Detail Acara, Bingkai, Momen,
      // Publish) tidak muncul sampai halaman dimuat ulang manual.
      // Ketemu nyata dari laporan pengguna: "di mana saya mau publish".
      router.refresh();
    } catch {
      setError("Tidak bisa menghubungi server.");
    } finally {
      setSubmitting(false);
    }
  };

  const kindMeta = eventKindMeta(form.kind ?? undefined);
  const chosenPlan = form.planId ? planById(form.planId) : undefined;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.55)", backdropFilter: "blur(6px)" }}
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative z-[130] flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[var(--a-radius-xl)] bg-white shadow-2xl"
        >
          <div className="flex items-start justify-between border-b border-[var(--a-clr-border)] px-7 py-6">
            <div>
              <h2 className="text-xl font-extrabold text-[#0F172A]">Buat Event Baru</h2>
              <p className="mt-0.5 text-xs font-semibold text-[var(--a-clr-text-muted)]">
                Langkah {step + 1} dari {STEP_IDS.length} — {STEP_LABELS[stepId]}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Tutup"
              className="grid h-9 w-9 place-items-center rounded-full bg-[var(--a-clr-bg)] text-[var(--a-clr-text-muted)] transition hover:text-[#0F172A]"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex gap-2 px-7 pt-5">
            {STEP_IDS.map((id, i) => (
              <div
                key={id}
                className="h-1.5 flex-1 rounded-full transition-all"
                style={{ background: i <= step ? "var(--a-clr-primary)" : "var(--a-clr-border)" }}
              />
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-7 py-6">
            <AnimatePresence mode="wait" custom={direction}>
              {stepId === "kind" && (
                <motion.div
                  key="step-kind"
                  custom={direction}
                  initial={{ opacity: 0, x: 20 * direction }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 * direction }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div>
                    <h3 className="text-lg font-extrabold text-[#0F172A]">Acara apa yang akan diadakan?</h3>
                    <p className="text-sm text-[var(--a-clr-text-muted)]">
                      Menentukan sapaan &amp; sambutan awal — bisa diganti nanti.
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {EVENT_KINDS.map((k) => (
                        <button
                          key={k.id}
                          type="button"
                          onClick={() => pickKind(k.id)}
                          className="relative rounded-2xl border-2 px-4 py-3.5 text-left transition"
                          style={{
                            borderColor: form.kind === k.id ? "var(--a-clr-primary)" : "var(--a-clr-border)",
                            background: form.kind === k.id ? "var(--a-clr-primary-light)" : "white",
                          }}
                        >
                          {form.kind === k.id && (
                            <span className="absolute right-2.5 top-2.5 grid h-5 w-5 place-items-center rounded-full bg-[var(--a-clr-primary)] text-white">
                              <Check size={12} />
                            </span>
                          )}
                          <span className="text-xl">{k.emoji}</span>
                          <p className="mt-1.5 text-sm font-bold text-[#0F172A]">{k.label}</p>
                          <p className="text-xs text-[var(--a-clr-text-muted)]">{k.hint}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Field
                    label="Nama internal (buat kamu sendiri, tamu tidak lihat)"
                    value={form.internalName}
                    onChange={(v) => setForm((f) => ({ ...f, internalName: v }))}
                    placeholder="Misal: Lamaran Salma & Faizal"
                  />
                  <Field
                    label="Nama yang ditampilkan ke tamu"
                    value={form.names}
                    onChange={setNames}
                    placeholder="Misal: Salma & Faizal"
                  />
                  <Field label="Tanggal acara" type="date" value={form.date} onChange={setDate} />
                </motion.div>
              )}

              {stepId === "plan" && (
                <motion.div
                  key="step-plan"
                  custom={direction}
                  initial={{ opacity: 0, x: 20 * direction }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 * direction }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3"
                >
                  <div>
                    <h3 className="text-lg font-extrabold text-[#0F172A]">Pilih paket</h3>
                    <p className="text-sm text-[var(--a-clr-text-muted)]">
                      {clientType === "vendor"
                        ? "Berlaku untuk akun ini, bukan cuma event ini — event berikutnya otomatis pakai paket yang sama."
                        : "Menentukan kuota strip & masa aktif acaramu."}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {plansFor(clientType).map((p) => (
                      <PlanCard
                        key={p.id}
                        id={p.id}
                        name={p.name}
                        priceIdr={p.priceIdr}
                        stripQuota={p.stripQuota}
                        activeDays={p.activeDays}
                        eventSlots={p.eventSlots}
                        active={form.planId === p.id}
                        onSelect={() => setForm((f) => ({ ...f, planId: p.id }))}
                      />
                    ))}
                  </div>
                  <p className="text-xs leading-relaxed text-[var(--a-clr-text-muted)]">
                    Fase ini pembayaran masih konfirmasi manual — setelah event dibuat, instruksi
                    transfer muncul di halaman Paket &amp; Billing. Event tetap langsung bisa diatur
                    (bingkai, Visual Builder) sambil menunggu konfirmasi.
                  </p>
                </motion.div>
              )}

              {stepId === "detail" && (
                <motion.div
                  key="step-detail"
                  custom={direction}
                  initial={{ opacity: 0, x: 20 * direction }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 * direction }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <Field
                    label="Sapaan besar"
                    value={form.brandLabel}
                    onChange={(v) => setForm((f) => ({ ...f, brandLabel: v, brandLabelTouched: true }))}
                  />
                  <Field
                    label="Lokasi"
                    value={form.venue}
                    onChange={(v) => setForm((f) => ({ ...f, venue: v }))}
                    placeholder="Misal: Gedung Pernikahan"
                  />
                  <Field
                    label="Tagar"
                    value={form.hashtag}
                    onChange={(v) => setForm((f) => ({ ...f, hashtag: v }))}
                    placeholder="Misal: #SalmaFaizal"
                  />
                  <Field
                    label="Sambutan"
                    value={form.greeting}
                    onChange={(v) => setForm((f) => ({ ...f, greeting: v, greetingTouched: true }))}
                    multiline
                    hint="Muncul di layar awal sebelum tamu mulai sesi."
                  />
                  <Field
                    label="Kode acara (slug URL)"
                    value={form.slug}
                    onChange={(v) => setForm((f) => ({ ...f, slug: slugify(v), slugTouched: true }))}
                    hint={`Playground: /e/${form.slug || "..."}`}
                  />
                </motion.div>
              )}

              {stepId === "summary" && (
                <motion.div
                  key="step-summary"
                  custom={direction}
                  initial={{ opacity: 0, x: 20 * direction }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 * direction }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="admin-card p-4">
                    <div className="flex items-center gap-2 text-sm">
                      {kindMeta && <span className="text-lg">{kindMeta.emoji}</span>}
                      <span className="font-bold text-[#0F172A]">{form.internalName || "(belum diisi)"}</span>
                    </div>
                    <dl className="mt-3 space-y-1.5 text-xs">
                      <div className="flex justify-between gap-3">
                        <dt className="text-[var(--a-clr-text-muted)]">Nama tampil</dt>
                        <dd className="text-right font-medium text-[#334155]">{form.names || "—"}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-[var(--a-clr-text-muted)]">Tanggal</dt>
                        <dd className="text-right font-medium text-[#334155]">{form.dateDisplay || "—"}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-[var(--a-clr-text-muted)]">Lokasi</dt>
                        <dd className="text-right font-medium text-[#334155]">{form.venue || "—"}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-[var(--a-clr-text-muted)]">Playground</dt>
                        <dd className="text-right font-mono font-medium text-[#334155]">
                          /e/{form.slug || slugify(form.names)}
                        </dd>
                      </div>
                      {chosenPlan && (
                        <div className="flex justify-between gap-3">
                          <dt className="text-[var(--a-clr-text-muted)]">Paket</dt>
                          <dd className="text-right font-medium text-[#334155]">
                            {chosenPlan.name} · {formatIdr(chosenPlan.priceIdr)}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                  <p className="text-xs leading-relaxed text-[var(--a-clr-text-muted)]">
                    Event dibuat berstatus <strong className="text-[#334155]">draft</strong> — belum
                    punya bingkai, jadi belum bisa dibagikan ke tamu. Tambahkan bingkai dulu setelah
                    ini, baru publikasikan lewat tab Publish.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {error && (
            <p className="px-7 pb-2 text-sm font-medium text-[var(--a-clr-danger)]">{error}</p>
          )}

          <div className="flex items-center justify-between border-t border-[var(--a-clr-border)] px-7 py-5">
            <button
              onClick={() => (step === 0 ? onClose() : goStep(step - 1))}
              className="admin-btn admin-btn-ghost"
            >
              {step === 0 ? "Batal" : "Kembali"}
            </button>
            {step < STEP_IDS.length - 1 ? (
              <button
                onClick={() => canNext && goStep(step + 1)}
                disabled={!canNext}
                className="admin-btn admin-btn-primary admin-btn-press"
              >
                Lanjut →
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={submitting}
                className="admin-btn admin-btn-primary admin-btn-press"
              >
                {submitting && <Spinner size={14} />}
                {submitting ? "Membuat…" : "Buat Event"}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
