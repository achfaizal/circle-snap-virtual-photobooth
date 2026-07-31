import Link from "next/link";
import { EVENTS } from "@/lib/event";

export default function Home() {
  return (
    <main className="step-enter relative z-10 mx-auto w-full max-w-3xl px-5 pb-10 pt-6 sm:px-8 sm:pt-16">
      <header className="flex items-center justify-between">
        <span className="font-display text-sm font-bold tracking-tight">
          <span className="text-brand-gradient">Glyka</span>{" "}
          <span className="text-paper">Photobooth Virtual</span>
        </span>
        <span className="tracked rounded-full px-2.5 py-1 font-mono text-[10px] text-smoke ring-1 ring-edge">
          playground
        </span>
      </header>

      <section className="mt-8 sm:mt-16">
        <p className="tracked font-mono text-[11px] text-flash">
          Yang dilihat tamu setelah memindai
        </p>
        <h1 className="mt-4 font-display text-[12vw] leading-[0.88] tracking-[-0.04em] sm:text-6xl">
          Satu kode,
          <br />
          <span className="text-brand-gradient">satu pesta.</span>
        </h1>
        <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-smoke">
          Di lokasi, tamu memindai QR di meja dan langsung masuk ke salah satu
          sesi di bawah. Tidak ada login, tidak ada aplikasi. Halaman ini hanya
          ada di playground — sebagai pengganti pemindai.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="tracked border-b border-edge pb-3 font-mono text-[10px] text-smoke">
          Event contoh
        </h2>
        <ul className="mt-5 space-y-2.5">
          {EVENTS.map((ev) => (
            <li key={ev.code}>
              <Link
                href={`/e/${ev.code}`}
                className="group relative flex items-center justify-between gap-6 overflow-hidden rounded-2xl p-4 ring-1 ring-edge transition hover:-translate-y-0.5 hover:ring-flash"
              >
                <span className="brand-gradient pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-[0.08]" />
                <div className="min-w-0">
                  <h3 className="font-display text-xl leading-tight tracking-tight">
                    {ev.names}
                  </h3>
                  <p className="mt-1.5 truncate font-mono text-[11px] text-smoke">
                    {ev.date} · {ev.venue}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-2xl leading-none text-flash">
                    {ev.quota}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-smoke">strip</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-10 border-t border-edge pt-5">
        <p className="font-mono text-[11px] leading-relaxed text-smoke">
          Kamera dan mikrofon butuh konteks aman. Jalankan di{" "}
          <span className="text-paper">localhost</span> atau lewat tunnel HTTPS —
          alamat IP jaringan lokal akan ditolak browser.
        </p>
      </footer>
    </main>
  );
}
