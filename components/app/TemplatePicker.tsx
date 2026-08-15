"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import Spinner from "@/components/admin/Spinner";

export interface PickerTemplate {
  id: string;
  name: string;
  tagline: string | null;
  brandLabel: string;
}

export default function TemplatePicker({
  eventId,
  currentTemplateId,
  templates,
}: {
  eventId: string;
  currentTemplateId: string | null;
  templates: PickerTemplate[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const select = async (templateId: string) => {
    setBusyId(templateId);
    setError(null);
    try {
      const res = await fetch(`/api/app/events/${eventId}/template`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Gagal memilih template.");
        return;
      }
      router.push(`/app/events/${eventId}/builder`);
    } catch {
      setError("Tidak bisa menghubungi server.");
    } finally {
      setBusyId(null);
    }
  };

  if (templates.length === 0) {
    return <p style={{ fontSize: 13, color: "#71717A" }}>Belum ada template untuk kategori acara ini.</p>;
  }

  return (
    <div>
      {error && <p style={{ fontSize: 13, color: "#EF4444", marginBottom: 12 }}>{error}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {templates.map((t) => {
          const active = currentTemplateId === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => select(t.id)}
              disabled={busyId === t.id}
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
                <div style={{ fontWeight: 800, fontSize: 14, color: "#18181B" }}>{t.name}</div>
                {t.tagline && <div style={{ fontSize: 12, color: "#71717A" }}>{t.tagline}</div>}
              </div>
              {busyId === t.id ? <Spinner size={16} /> : active && <Check size={18} color="var(--a-clr-primary)" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
