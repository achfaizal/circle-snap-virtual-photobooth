import type { Metadata, Viewport } from "next";
import { Playfair_Display, Plus_Jakarta_Sans, Space_Mono } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

/** Font opsional untuk event dengan tema sendiri (mis. pernikahan bertema
    klasik/floral) — diekspos sebagai variable, dipakai lewat override
    `--font-display` per-event, bukan default aplikasi. */
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Glyka Photobooth Virtual — photobooth event",
  description:
    "Photobooth berbasis browser untuk pernikahan dan acara, dari Glyka. Pindai, potret, unduh.",
};

export const viewport: Viewport = {
  themeColor: "#1E1B4B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      className={`${jakarta.variable} ${spaceMono.variable} ${playfair.variable}`}
      /* next/font memakai nama family teracak. Kanvas tidak bisa membaca
         CSS variable berlapis, jadi nama family aslinya diekspos di sini
         supaya compositor bisa menggambar teks dengan tipografi yang sama
         persis dengan yang terlihat di layar. */
      style={
        {
          "--canvas-display": jakarta.style.fontFamily,
          "--canvas-mono": spaceMono.style.fontFamily,
        } as React.CSSProperties
      }
    >
      <body className="min-h-dvh">
        {/* Bola cahaya ambien — dekorasi merek Glyka, diam di belakang semua
            konten (z-0) dan tidak pernah menutupi teks atau kontrol. */}
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="blob floating -left-40 -top-40 h-[36rem] w-[36rem] bg-brand-purple" />
          <div className="blob floating-slow -right-32 top-1/3 h-[30rem] w-[30rem] bg-flash" />
          <div className="blob floating bottom-[-8rem] left-1/4 h-[24rem] w-[24rem] bg-brand-gold" />
        </div>
        {children}
      </body>
    </html>
  );
}
