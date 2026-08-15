"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/admin/Spinner";

export default function PaymentProofForm({ orderId, alreadyUploaded }: { orderId: string; alreadyUploaded: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Pilih berkas dulu.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch(`/api/app/orders/${orderId}/proof`, { method: "POST", body: form });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Gagal mengunggah bukti transfer.");
        return;
      }
      router.refresh();
    } catch {
      setError("Tidak bisa menghubungi server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ background: "white", border: "1px solid #E4E4E7", borderRadius: 14, padding: 18 }}>
      <p style={{ fontSize: 13, fontWeight: 800, color: "#18181B", marginBottom: 8 }}>
        {alreadyUploaded ? "Ganti bukti transfer" : "Unggah bukti transfer"}
      </p>
      <input ref={inputRef} type="file" accept="image/*" style={{ fontSize: 12, marginBottom: 10 }} />
      {error && <p style={{ fontSize: 12, color: "#EF4444", marginBottom: 10 }}>{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={busy}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "9px 16px",
          borderRadius: 100,
          border: "none",
          background: "linear-gradient(135deg, var(--a-clr-brand-1), var(--a-clr-brand-2))",
          color: "white",
          fontWeight: 800,
          fontSize: 13,
          cursor: busy ? "not-allowed" : "pointer",
          opacity: busy ? 0.7 : 1,
        }}
      >
        {busy && <Spinner size={14} />}
        {busy ? "Mengunggah…" : "Unggah"}
      </button>
    </div>
  );
}
