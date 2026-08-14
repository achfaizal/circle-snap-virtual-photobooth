/**
 * REPOSITORY — jantung keputusan "belum pakai DB".
 *
 * Satu interface, banyak implementasi. Admin dan playground HANYA bicara
 * ke `getRepo()`, tidak pernah tahu datanya berasal dari file JSON atau
 * (nanti) Postgres.
 *
 * ATURAN: tidak ada satu pun komponen atau route yang boleh `import` dari
 * `./json-file` secara langsung. Semua lewat `getRepo()` di file ini.
 * Kalau aturan ini dijaga, migrasi ke database nanti murni mengganti isi
 * fungsi `getRepo()` — tidak ada pemanggil yang perlu diubah.
 *
 * Lihat docs/blueprint/04-arsitektur.md bagian 2.
 */
import type { Asset, NewAsset } from "../models/asset";
import type { Client, NewClient } from "../models/client";
import type { Event, NewEvent } from "../models/event";
import type { Frame, NewFrame } from "../models/frame";
import type { NewOrder, Order } from "../models/order";
import type { Subscription } from "../models/plan";
import { jsonFileRepo } from "./json-file";

export interface Repo {
  events: {
    /** clientId kosong = semua event (hanya untuk akun staff). */
    list(clientId?: string): Promise<Event[]>;
    getById(id: string): Promise<Event | null>;
    getBySlug(slug: string): Promise<Event | null>;
    create(input: NewEvent): Promise<Event>;
    update(id: string, patch: Partial<Event>): Promise<Event | null>;
    remove(id: string): Promise<void>;
    slugTaken(slug: string, exceptId?: string): Promise<boolean>;
  };

  frames: {
    /** null = pustaka bawaan Circle Snap. */
    list(clientId: string | null): Promise<Frame[]>;
    getById(id: string): Promise<Frame | null>;
    getMany(ids: string[]): Promise<Frame[]>;
    create(input: NewFrame): Promise<Frame>;
    update(id: string, patch: Partial<Frame>): Promise<Frame | null>;
    remove(id: string): Promise<void>;
  };

  subscriptions: {
    getByEventId(eventId: string): Promise<Subscription | null>;
    create(sub: Omit<Subscription, "id">): Promise<Subscription>;
    /**
     * Menaikkan stripUsed secara atomik SATU strip.
     * Mengembalikan null bila kuota sudah habis (stripUsed >= stripQuota)
     * — pemanggil HARUS memperlakukan null sebagai "kuota habis", bukan
     * error tak terduga. Lihat docs/blueprint/04-arsitektur.md bagian 6:
     * ini pengganti klaim via localStorage yang sekarang tidak benar-benar
     * membatasi apa pun (temuan 06-T1).
     */
    claimStrip(eventId: string): Promise<Subscription | null>;
    /** Dipakai saat `Event.startAt` diisi/diubah — masa aktif (expiresAt)
        dihitung dari startAt, bukan dari kapan Subscription ini dibuat.
        Lihat lib/services/eventLifecycle.ts & app/api/admin/events/[id]/route.ts. */
    update(id: string, patch: Partial<Subscription>): Promise<Subscription | null>;
    /** Dipanggil saat event dihapus. Tanpa ini barisnya tertinggal
        menggantung: sekali pengecekan ditemukan 11 dari 12 langganan
        sudah tidak punya event. */
    removeByEventId(eventId: string): Promise<void>;
  };

  assets: {
    list(clientId: string | null): Promise<Asset[]>;
    getById(id: string): Promise<Asset | null>;
    create(input: NewAsset): Promise<Asset>;
    /** Dipakai upload route untuk menulis `url` final setelah id ada
        (nama file di disk = id) — lihat app/api/admin/assets/route.ts. */
    update(id: string, patch: Partial<Asset>): Promise<Asset | null>;
    remove(id: string): Promise<void>;
  };

  clients: {
    getById(id: string): Promise<Client | null>;
    getByEmail(email: string): Promise<Client | null>;
    create(input: NewClient): Promise<Client>;
    /** Dipakai halaman Account: ganti nama tampilan, ganti passwordHash. */
    update(id: string, patch: Partial<Client>): Promise<Client | null>;
    /** Dipakai staff di /admin/billing untuk menampilkan nama klien di
        daftar pesanan yang perlu dikonfirmasi — bukan menu manajemen
        klien penuh (itu bagian panel Staff yang belum dikerjakan). */
    list(): Promise<Client[]>;
  };

  orders: {
    /** clientId kosong = semua klien (hanya untuk akun staff yang perlu
        mengonfirmasi pesanan siapa pun) — pola sama dengan events.list(). */
    list(clientId?: string): Promise<Order[]>;
    getById(id: string): Promise<Order | null>;
    create(input: NewOrder): Promise<Order>;
    update(id: string, patch: Partial<Order>): Promise<Order | null>;
  };
}

/**
 * Satu-satunya tempat implementasi dipilih.
 *
 * Nanti: `process.env.DATABASE_URL ? dbRepo : jsonFileRepo`. Sampai
 * lib/repo/db.ts ada, selalu JSON — lihat docs/blueprint/05-peta-jalan.md
 * Fase 7.
 */
export function getRepo(): Repo {
  return jsonFileRepo;
}

export type {
  Asset,
  NewAsset,
  Client,
  NewClient,
  Event,
  NewEvent,
  Frame,
  NewFrame,
  Order,
  NewOrder,
  Subscription,
};
