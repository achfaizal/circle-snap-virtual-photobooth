"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

function formatWaktu(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

/** Langkah 15 Tahap 4 — lonceng notifikasi in-app (dok 05, D-15). Poll
    ringan tiap 60 detik (bukan realtime/websocket — di luar cakupan,
    lihat rencana Tahap 4) supaya badge tidak basi kalau tab dibiarkan
    terbuka lama, mis. saat kuota acara turun ke ambang di tab lain. */
export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const refresh = async () => {
    const res = await fetch("/api/app/notifications");
    if (!res.ok) return;
    const data = (await res.json()) as { notifications: NotificationRow[]; unreadCount: number };
    setItems(data.notifications);
    setUnreadCount(data.unreadCount);
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const openItem = async (item: NotificationRow) => {
    if (!item.readAt) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, readAt: new Date().toISOString() } : i)));
      setUnreadCount((c) => Math.max(0, c - 1));
      fetch(`/api/app/notifications/${item.id}`, { method: "PATCH" }).catch(() => {});
    }
    setOpen(false);
    if (item.linkUrl) router.push(item.linkUrl);
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifikasi"
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 34,
          height: 34,
          borderRadius: 100,
          border: "1px solid #E4E4E7",
          background: "white",
          cursor: "pointer",
          color: "#3F3F46",
        }}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              minWidth: 16,
              height: 16,
              padding: "0 3px",
              borderRadius: 100,
              background: "#EF4444",
              color: "white",
              fontSize: 10,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 42,
            width: 320,
            maxHeight: 400,
            overflowY: "auto",
            background: "white",
            border: "1px solid #E4E4E7",
            borderRadius: 12,
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            zIndex: 50,
          }}
        >
          <p style={{ fontSize: 12, fontWeight: 800, color: "#71717A", padding: "12px 14px 8px", textTransform: "uppercase" }}>
            Notifikasi
          </p>
          {items.length === 0 ? (
            <p style={{ fontSize: 13, color: "#71717A", padding: "8px 14px 16px" }}>Belum ada notifikasi.</p>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openItem(item)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 14px",
                  border: "none",
                  borderTop: "1px solid #F4F4F5",
                  background: item.readAt ? "white" : "#F0F9FF",
                  cursor: "pointer",
                }}
              >
                <p style={{ fontSize: 13, fontWeight: 700, color: "#18181B", marginBottom: 2 }}>{item.title}</p>
                {item.body && <p style={{ fontSize: 12, color: "#52525B", marginBottom: 4 }}>{item.body}</p>}
                <p style={{ fontSize: 11, color: "#A1A1AA" }}>{formatWaktu(item.createdAt)}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
