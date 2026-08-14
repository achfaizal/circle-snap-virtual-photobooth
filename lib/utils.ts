/**
 * Helper umum lintas admin — mengikuti §16 UI-UX-DESIGN-SYSTEM.md.
 *
 * `showToast()` ada supaya pemanggil tidak perlu import react-hot-toast
 * langsung di tiap berkas (satu titik yang tahu detail library toast-nya).
 *
 * Catatan: `cn()` (clsx + tailwind-merge) pernah ada di sini tapi tidak
 * pernah dipakai satu kali pun — admin ini memakai inline style, bukan
 * className dinamis. Dihapus bersama kedua dependensinya.
 */
import toast from "react-hot-toast";

/** Dipakai untuk konfirmasi netral (bukan sukses/gagal eksplisit) — mis.
    "belum tersedia" pada tombol Google/Lupa Password. */
export function showToast(message: string): void {
  toast(message);
}

export function showSuccessToast(message: string): void {
  toast.success(message);
}

export function showErrorToast(message: string): void {
  toast.error(message);
}

/**
 * Nama event DOM untuk "data event baru saja disimpan".
 *
 * Dipakai memberi tahu pratinjau (PlaygroundPreview) supaya memuat ulang
 * iframe-nya — iframe menunjuk rute publik dan tidak punya cara tahu data
 * server berubah. Lewat window event, bukan prop, karena penyimpan dan
 * pratinjau sekarang berada di cabang pohon komponen yang berbeda:
 * halaman event mengirim editornya sebagai `children` ke EventPageShell,
 * jadi tidak ada jalur prop di antara keduanya. Pola custom window event
 * ini yang dianjurkan §9 UI-UX-DESIGN-SYSTEM.md.
 */
export const EVENT_SAVED = "circlesnap:event-saved";

export function notifyEventSaved(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT_SAVED));
}
