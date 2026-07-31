export type Facing = "user" | "environment";

export type CameraError =
  | "denied"
  | "notfound"
  | "insecure"
  | "unsupported"
  | "unknown";

export interface CameraFailure {
  kind: CameraError;
  message: string;
}

/**
 * Pesan error ditulis untuk tamu event, bukan untuk developer. Setiap pesan
 * menyebut apa yang terjadi dan langkah berikutnya yang bisa mereka lakukan.
 */
export function describe(kind: CameraError): string {
  switch (kind) {
    case "denied":
      return "Akses kamera ditolak. Buka ikon gembok di address bar, izinkan kamera, lalu muat ulang halaman.";
    case "notfound":
      return "Tidak ada kamera yang terdeteksi di perangkat ini.";
    case "insecure":
      return "Kamera hanya bisa dibuka lewat HTTPS atau localhost. Alamat halaman ini belum aman.";
    case "unsupported":
      return "Browser ini belum mendukung akses kamera. Coba Chrome atau Safari versi terbaru.";
    default:
      return "Kamera gagal dibuka. Tutup aplikasi lain yang sedang memakai kamera, lalu coba lagi.";
  }
}

function classify(err: unknown): CameraError {
  if (!(err instanceof Error)) return "unknown";
  if (err.name === "NotAllowedError" || err.name === "SecurityError") return "denied";
  if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") return "notfound";
  return "unknown";
}

export async function openCamera(facing: Facing): Promise<MediaStream> {
  if (typeof window === "undefined") throw { kind: "unsupported" } as CameraFailure;

  if (!window.isSecureContext) {
    throw { kind: "insecure", message: describe("insecure") } as CameraFailure;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw { kind: "unsupported", message: describe("unsupported") } as CameraFailure;
  }

  // Minta resolusi tinggi sebagai "ideal", bukan "exact". Perangkat kelas bawah
  // akan menurunkan sendiri ketimbang menolak permintaan sepenuhnya.
  const tiers: MediaStreamConstraints[] = [
    {
      video: {
        facingMode: facing,
        width: { ideal: 1920 },
        height: { ideal: 1440 },
      },
      audio: false,
    },
    { video: { facingMode: facing }, audio: false },
    { video: true, audio: false },
  ];

  let last: unknown;
  for (const constraints of tiers) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      last = err;
      if (classify(err) === "denied") break; // Menolak izin tidak akan berubah dengan retry.
    }
  }

  const kind = classify(last);
  throw { kind, message: describe(kind) } as CameraFailure;
}

export function closeCamera(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

export async function hasMultipleCameras(): Promise<boolean> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === "videoinput").length > 1;
  } catch {
    return false;
  }
}
