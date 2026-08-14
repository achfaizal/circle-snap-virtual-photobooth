/**
 * Indikator loading tombol (§15.24 UI-UX-DESIGN-SYSTEM.md) — dipakai di
 * semua tombol async (submit Login/Daftar, Simpan tab editor, Hapus
 * Permanen, dst) supaya tombol tidak "diam saja" saat proses berjalan.
 * `color` default putih (tombol solid brand); pakai warna lain untuk
 * tombol outline/ghost. */
export default function Spinner({ size = 14, color = "white" }: { size?: number; color?: string }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2px solid ${color === "white" ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.15)"}`,
        borderTopColor: color,
        animation: "admin-spin 0.6s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}
