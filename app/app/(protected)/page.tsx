import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Mail } from "lucide-react";
import { getSessionAccount } from "@/lib/clientAuth";
import { listEventsByAccountId } from "@/lib/db/queries/events";
import { getAccountById, getUserById } from "@/lib/db/queries/accounts";

/**
 * Dashboard /app — isi bercabang per dok 05 §2:
 * - Operator: cuma acara yang DITUGASKAN, tanpa angka rupiah. Belum ada
 *   `event_assignments` (D-08/D-09, Tahap 5) — jadi selalu kosong untuk
 *   sekarang, BUKAN menampilkan semua acara akun (itu akan salah begitu
 *   penugasan sungguhan ada).
 * - Personal: "buat acara pertama" kalau kosong, daftar acara kalau
 *   sudah ada — TIDAK ada lagi batas 1 acara (D-01 tercabut, Langkah 4).
 * - Vendor (owner/manager): saldo dompet + acara dikelompokkan per waktu.
 *   Pembagian "Minggu ini" vs "Akan datang" (dok 05 §2 cuma menyebut
 *   nama bucket, bukan aturan persis) — INTERPRETASI: startsAt ≤7 hari
 *   dari sekarang = Minggu ini, lebih jauh = Akan datang, catat di sini
 *   supaya jelas ini bukan kutipan literal.
 */
export default async function AppDashboardPage() {
  const session = await getSessionAccount();
  if (!session) redirect("/app/login");

  const user = await getUserById(session.userId);
  const verifyBanner = !user?.emailVerifiedAt ? <VerifyEmailBanner /> : null;

  if (session.role === "operator") {
    return (
      <div>
        {verifyBanner}
        <EmptyState
          title="Belum ada acara yang ditugaskan"
          body="Acara yang kamu tangani akan muncul di sini begitu pemilik akun menugaskanmu."
        />
      </div>
    );
  }

  const [account, events] = await Promise.all([
    getAccountById(session.accountId),
    listEventsByAccountId(session.accountId),
  ]);
  if (!account) redirect("/app/login");

  if (account.type === "personal") {
    return (
      <div>
        {verifyBanner}
        <PageHeader title="Acaramu" />
        {events.length === 0 ? (
          <CreateFirstEventCard />
        ) : (
          <EventList events={events} />
        )}
      </div>
    );
  }

  // Vendor
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const live = events.filter((e) => e.status === "live");
  const upcomingSoon = events.filter(
    (e) => e.status === "draft" && e.startsAt && e.startsAt.getTime() - now > 0 && e.startsAt.getTime() - now <= weekMs
  );
  const upcomingLater = events.filter(
    (e) => e.status === "draft" && (!e.startsAt || e.startsAt.getTime() - now > weekMs)
  );
  const archived = events.filter((e) => ["ended", "expired", "archived", "suspended"].includes(e.status));

  return (
    <div>
      {verifyBanner}
      <PageHeader title="Dashboard" />

      <div
        style={{
          background: "white",
          border: "1px solid #E4E4E7",
          borderRadius: 16,
          padding: 20,
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#71717A" }}>Saldo dompet</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#18181B" }}>
            {account.cachedWalletBalance.toLocaleString("id-ID")} strip
          </div>
        </div>
        <Link
          href="/app/billing"
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: "var(--a-clr-primary)",
            textDecoration: "none",
          }}
        >
          Kelola dompet →
        </Link>
      </div>

      {events.length === 0 ? (
        <CreateFirstEventCard />
      ) : (
        <>
          <EventSection title="Berlangsung sekarang" events={live} />
          <EventSection title="Minggu ini" events={upcomingSoon} />
          <EventSection title="Akan datang" events={upcomingLater} />
          <EventSection title="Arsip" events={archived} />
        </>
      )}
    </div>
  );
}

function VerifyEmailBanner() {
  return (
    <Link
      href="/app/verify-email"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 14px",
        borderRadius: 10,
        background: "#FEF3C7",
        border: "1px solid #FDE68A",
        marginBottom: 16,
        textDecoration: "none",
      }}
    >
      <Mail size={15} color="#92400E" />
      <span style={{ fontSize: 12.5, color: "#92400E", fontWeight: 700 }}>
        Email belum diverifikasi — wajib sebelum acara bisa diterbitkan (gerbang poin 10). Verifikasi sekarang →
      </span>
    </Link>
  );
}

function PageHeader({ title }: { title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: "#18181B", letterSpacing: "-0.02em" }}>{title}</h1>
      <Link
        href="/app/events/new"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "10px 16px",
          borderRadius: 100,
          background: "linear-gradient(135deg, var(--a-clr-brand-1), var(--a-clr-brand-2))",
          color: "white",
          fontWeight: 800,
          fontSize: 13,
          textDecoration: "none",
        }}
      >
        <Plus size={15} /> Buat Acara
      </Link>
    </div>
  );
}

function CreateFirstEventCard() {
  return (
    <div
      style={{
        background: "white",
        border: "1.5px dashed #D4D4D8",
        borderRadius: 16,
        padding: 40,
        textAlign: "center",
      }}
    >
      <p style={{ fontSize: 15, fontWeight: 700, color: "#18181B", marginBottom: 6 }}>Belum ada acara</p>
      <p style={{ fontSize: 13, color: "#71717A", marginBottom: 16 }}>
        Buat acara pertamamu untuk mulai pakai photobooth virtual.
      </p>
      <Link
        href="/app/events/new"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "10px 18px",
          borderRadius: 100,
          background: "linear-gradient(135deg, var(--a-clr-brand-1), var(--a-clr-brand-2))",
          color: "white",
          fontWeight: 800,
          fontSize: 13,
          textDecoration: "none",
        }}
      >
        <Plus size={15} /> Buat Acara Pertama
      </Link>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ background: "white", border: "1px solid #E4E4E7", borderRadius: 16, padding: 40, textAlign: "center" }}>
      <p style={{ fontSize: 15, fontWeight: 700, color: "#18181B", marginBottom: 6 }}>{title}</p>
      <p style={{ fontSize: 13, color: "#71717A" }}>{body}</p>
    </div>
  );
}

interface EventRow {
  id: string;
  internalName: string;
  slug: string;
  status: string;
}

function EventList({ events }: { events: EventRow[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {events.map((e) => (
        <EventCard key={e.id} event={e} />
      ))}
    </div>
  );
}

function EventSection({ title, events }: { title: string; events: EventRow[] }) {
  if (events.length === 0) return null;
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 13, fontWeight: 800, color: "#71717A", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.03em" }}>
        {title}
      </h2>
      <EventList events={events} />
    </div>
  );
}

function EventCard({ event }: { event: EventRow }) {
  return (
    <Link
      href={`/app/events/${event.id}`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "white",
        border: "1px solid #E4E4E7",
        borderRadius: 12,
        padding: "14px 16px",
        textDecoration: "none",
      }}
    >
      <span style={{ fontWeight: 700, fontSize: 14, color: "#18181B" }}>{event.internalName}</span>
      <span style={{ fontSize: 11, fontWeight: 800, color: "#71717A", textTransform: "uppercase" }}>{event.status}</span>
    </Link>
  );
}
