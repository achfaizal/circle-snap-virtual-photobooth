"use client";

/**
 * Bingkai ponsel untuk pratinjau — §15.27 UI-UX-DESIGN-SYSTEM.md
 * ("Device Mockup Wrapper").
 *
 * Isinya dirender pada ukuran layar HP SUNGGUHAN (390×844, viewport
 * iPhone 12/13/14) lalu dikecilkan lewat `transform: scale()`, bukan
 * dibuat versi mini terpisah — supaya proporsi font, spacing, dan tata
 * letaknya persis sama dengan yang dilihat tamu.
 *
 * Catatan penyimpangan dari §15.27: dokumen mencontohkan konten React
 * biasa yang di-scale. Di sini isinya <iframe> ke rute publik `/e/{slug}`.
 * Alasannya justru memperkuat maksud dokumen ("pratinjau 100% akurat"):
 * iframe punya viewport sendiri seukuran 390×844, jadi media query
 * responsif halaman benar-benar aktif. `transform: scale()` saja TIDAK
 * mengubah viewport — tata letaknya akan tetap versi desktop, cuma
 * mengecil. Jadi iframe + scale = akurat dua-duanya.
 */
export const PHONE_VIEWPORT = { width: 390, height: 844 };

export default function DeviceMockup({
  children,
  scale = 0.66,
}: {
  children: React.ReactNode;
  scale?: number;
}) {
  const screenW = Math.round(PHONE_VIEWPORT.width * scale);
  const screenH = Math.round(PHONE_VIEWPORT.height * scale);

  return (
    <div
      style={{
        width: screenW,
        height: screenH,
        background: "#0F172A",
        borderRadius: 44,
        padding: 10,
        border: "4px solid #1E293B",
        boxShadow: "0 28px 60px rgba(0,0,0,0.38)",
        position: "relative",
        flexShrink: 0,
        boxSizing: "content-box",
      }}
    >
      {/* Notch */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 10,
          left: "50%",
          transform: "translateX(-50%)",
          width: 92,
          height: 22,
          background: "#0F172A",
          borderRadius: "0 0 16px 16px",
          zIndex: 10,
        }}
      />

      {/* Layar */}
      <div
        style={{
          width: screenW,
          height: screenH,
          background: "white",
          borderRadius: 36,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: PHONE_VIEWPORT.width,
            height: PHONE_VIEWPORT.height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>

      {/* Home indicator */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          width: 96,
          height: 5,
          background: "rgba(255,255,255,0.5)",
          borderRadius: 10,
          zIndex: 10,
        }}
      />
    </div>
  );
}
