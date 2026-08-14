import type { Metadata, Viewport } from "next";
import {
  Cinzel,
  Cormorant_Garamond,
  Great_Vibes,
  Italianno,
  Libre_Baskerville,
  Lora,
  Marcellus,
  Montserrat,
  Parisienne,
  Playfair_Display,
  Plus_Jakarta_Sans,
  Poppins,
  Space_Mono,
} from "next/font/google";
import { Toaster } from "react-hot-toast";
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

/** Katalog font display opsional untuk event dengan tema sendiri (mis.
    pernikahan bertema klasik/floral) — diekspos sebagai variable, dipakai
    lewat override `--font-display` per-event, bukan default aplikasi.
    Daftar lengkap + id-nya: FONT_DISPLAY_CSS di lib/adapters/legacy.ts. */
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const marcellus = Marcellus({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-marcellus",
  display: "swap",
});

/* Tambahan katalog font Visual Builder — tiap font WAJIB punya
   `--font-<id>` (dipakai layar) DAN `--canvas-font-<id>` (dipakai
   compositor saat menggambar teks ke hasil unduhan). Lupa salah satunya
   = teks di layar dan di foto unduhan beda font; ini pernah kejadian
   sungguhan, lihat FONT_DISPLAY_CSS di lib/adapters/legacy.ts. */
const cinzel = Cinzel({ subsets: ["latin"], variable: "--font-cinzel", display: "swap" });
const libre = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-libre",
  display: "swap",
});
const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-greatvibes",
  display: "swap",
});
const parisienne = Parisienne({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-parisienne",
  display: "swap",
});
const italianno = Italianno({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-italianno",
  display: "swap",
});
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", display: "swap" });
const lora = Lora({ subsets: ["latin"], variable: "--font-lora", display: "swap" });

export const metadata: Metadata = {
  title: "Circle Snap Virtual Photobox — photobooth event",
  description:
    "Photobooth berbasis browser untuk pernikahan dan acara, dari Circle Snap. Pindai, potret, unduh.",
  icons: {
    icon: "/logo/1.png",
  },
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
      className={[
        jakarta.variable,
        spaceMono.variable,
        playfair.variable,
        cormorant.variable,
        marcellus.variable,
        cinzel.variable,
        libre.variable,
        greatVibes.variable,
        parisienne.variable,
        italianno.variable,
        poppins.variable,
        montserrat.variable,
        lora.variable,
      ].join(" ")}
      /* next/font memakai nama family teracak. Kanvas tidak bisa membaca
         CSS variable berlapis, jadi nama family aslinya diekspos di sini
         supaya compositor bisa menggambar teks dengan tipografi yang sama
         persis dengan yang terlihat di layar — SATU `--canvas-font-<id>`
         per font (FONT_DISPLAY_CSS di lib/adapters/legacy.ts), dipasangkan lewat
         `EventTheme.canvasFontDisplay` (lib/event.ts) tiap kali event
         mengganti `--font-display`. Lupa menambah pasangannya di sini
         kalau nambah font baru = hasil unduhan foto salah font. */
      style={
        {
          "--canvas-display": jakarta.style.fontFamily,
          "--canvas-mono": spaceMono.style.fontFamily,
          "--canvas-font-jakarta": jakarta.style.fontFamily,
          "--canvas-font-playfair": playfair.style.fontFamily,
          "--canvas-font-cormorant": cormorant.style.fontFamily,
          "--canvas-font-marcellus": marcellus.style.fontFamily,
          "--canvas-font-cinzel": cinzel.style.fontFamily,
          "--canvas-font-libre": libre.style.fontFamily,
          "--canvas-font-greatvibes": greatVibes.style.fontFamily,
          "--canvas-font-parisienne": parisienne.style.fontFamily,
          "--canvas-font-italianno": italianno.style.fontFamily,
          "--canvas-font-poppins": poppins.style.fontFamily,
          "--canvas-font-montserrat": montserrat.style.fontFamily,
          "--canvas-font-lora": lora.style.fontFamily,
        } as React.CSSProperties
      }
    >
      <body className="min-h-dvh">
        {/* Bola cahaya ambien — dekorasi merek, diam di belakang semua
            konten (z-0) dan tidak pernah menutupi teks atau kontrol. */}
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="blob floating -left-40 -top-40 h-[36rem] w-[36rem] bg-brand-purple" />
          <div className="blob floating-slow -right-32 top-1/3 h-[30rem] w-[30rem] bg-flash" />
          <div className="blob floating bottom-[-8rem] left-1/4 h-[24rem] w-[24rem] bg-brand-gold" />
        </div>
        {children}
        {/* Satu Toaster global (§7 UI-UX-DESIGN-SYSTEM.md) — dipasang
            sekali di sini, dipanggil lewat lib/utils.ts (showToast dkk)
            supaya file lain tidak perlu import react-hot-toast langsung.
            Sebelumnya tiap halaman admin (Login, Daftar, dashboard, ...)
            punya toast lokal sendiri-sendiri dengan gaya beda-beda. */}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: "var(--font-jakarta)",
              borderRadius: "16px",
              background: "#0A1F44",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 600,
              padding: "12px 16px",
            },
            success: { iconTheme: { primary: "#10B981", secondary: "#fff" } },
            error: { iconTheme: { primary: "#EF4444", secondary: "#fff" } },
          }}
        />
      </body>
    </html>
  );
}
