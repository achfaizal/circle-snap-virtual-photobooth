/**
 * Implementasi Repo untuk fase "belum pakai DB" — lihat lib/repo/index.ts
 * untuk kontraknya dan docs/blueprint/04-arsitektur.md untuk rancangannya.
 *
 * ⚠️ Jangan diimpor langsung di luar lib/repo/. Selalu lewat getRepo().
 *
 * ⚠️ Batas jujur pendekatan ini: filesystem Vercel bersifat sementara dan
 * tidak bisa ditulis di luar request yang sedang berjalan. Implementasi
 * ini HANYA bekerja benar di lokal (`next dev`) / server yang persisten.
 * Admin baru bisa di-deploy setelah lib/repo/db.ts ada (Fase 7).
 */
import type { Asset, NewAsset } from "../models/asset";
import type { Client, NewClient } from "../models/client";
import type { Event, NewEvent } from "../models/event";
import type { Frame, NewFrame } from "../models/frame";
import type { NewOrder, Order } from "../models/order";
import type { Subscription } from "../models/plan";
import type { Repo } from "./index";
import { JsonCollection, makeId } from "./json-store";

const events = new JsonCollection<Event>("events.json", "events.seed.json");
const frames = new JsonCollection<Frame>("frames.json", "frames.seed.json");
const clients = new JsonCollection<Client>("clients.json", "clients.seed.json");
const subscriptions = new JsonCollection<Subscription>(
  "subscriptions.json",
  "subscriptions.seed.json"
);
const assets = new JsonCollection<Asset>("assets.json", "assets.seed.json");
const orders = new JsonCollection<Order>("orders.json");

function now(): string {
  return new Date().toISOString();
}

export const jsonFileRepo: Repo = {
  events: {
    async list(clientId) {
      const all = await events.readAll();
      return clientId ? all.filter((e) => e.clientId === clientId) : all;
    },

    async getById(id) {
      return events.getById(id);
    },

    async getBySlug(slug) {
      const all = await events.readAll();
      const wanted = slug.toLowerCase();
      return all.find((e) => e.slug.toLowerCase() === wanted) ?? null;
    },

    async create(input) {
      const record: Event = {
        ...input,
        id: makeId("evt"),
        createdAt: now(),
        updatedAt: now(),
      };
      return events.insert(record);
    },

    async update(id, patch) {
      // updatedAt selalu ditimpa dari sini — pemanggil tidak bisa
      // mengaturnya lewat patch, sengaja dijaga di satu tempat.
      return events.patch(id, { ...patch, updatedAt: now() });
    },

    async remove(id) {
      await events.remove(id);
    },

    async slugTaken(slug, exceptId) {
      const all = await events.readAll();
      const wanted = slug.toLowerCase();
      return all.some((e) => e.slug.toLowerCase() === wanted && e.id !== exceptId);
    },
  },

  frames: {
    async list(clientId) {
      const all = await frames.readAll();
      return all.filter((f) => f.clientId === clientId);
    },

    async getById(id) {
      return frames.getById(id);
    },

    async getMany(ids) {
      const all = await frames.readAll();
      const byId = new Map(all.map((f) => [f.id, f]));
      // Urutan mengikuti `ids` (= urutan carousel yang diatur klien),
      // bukan urutan penyimpanan.
      return ids.map((id) => byId.get(id)).filter((f): f is Frame => !!f);
    },

    async create(input) {
      const record: Frame = {
        ...input,
        id: makeId("frm"),
        createdAt: now(),
        updatedAt: now(),
      };
      return frames.insert(record);
    },

    async update(id, patch) {
      return frames.patch(id, { ...patch, updatedAt: now() });
    },

    async remove(id) {
      await frames.remove(id);
    },
  },

  subscriptions: {
    async getByEventId(eventId) {
      const all = await subscriptions.readAll();
      return all.find((s) => s.eventId === eventId) ?? null;
    },

    async create(sub) {
      const record: Subscription = { ...sub, id: makeId("sub") };
      return subscriptions.insert(record);
    },

    async claimStrip(eventId) {
      const all = await subscriptions.readAll();
      const existing = all.find((s) => s.eventId === eventId);
      if (!existing) return null;

      // mutateOne membaca-ubah-tulis dalam satu langkah terserialkan —
      // dua klaim yang datang nyaris bersamaan tidak bisa lolos berdua
      // saat kuota tinggal 1. Ini yang membedakan dari localStorage lama:
      // pemeriksaan dan penulisan sekarang satu operasi atomik di server,
      // bukan dua langkah terpisah yang bisa diselingi tamu lain.
      return subscriptions.mutateOne(existing.id, (s) => {
        if (s.stripUsed >= s.stripQuota) return null; // kuota habis, tolak
        return { ...s, stripUsed: s.stripUsed + 1 };
      });
    },

    async update(id, patch) {
      return subscriptions.patch(id, patch);
    },

    async removeByEventId(eventId) {
      const all = await subscriptions.readAll();
      // Satu event = satu langganan, tapi tetap dilakukan berulang kalau
      // ternyata ada duplikat — lebih baik bersih daripada menyisakan
      // separuh.
      for (const s of all.filter((x) => x.eventId === eventId)) {
        await subscriptions.remove(s.id);
      }
    },
  },

  assets: {
    async list(clientId) {
      const all = await assets.readAll();
      return all.filter((a) => a.clientId === clientId);
    },

    async getById(id) {
      return assets.getById(id);
    },

    async create(input) {
      const record: Asset = { ...input, id: makeId("ast"), createdAt: now() };
      return assets.insert(record);
    },

    async update(id, patch) {
      return assets.patch(id, patch);
    },

    async remove(id) {
      await assets.remove(id);
    },
  },

  clients: {
    async getById(id) {
      return clients.getById(id);
    },

    async getByEmail(email) {
      const all = await clients.readAll();
      const wanted = email.toLowerCase();
      return all.find((c) => c.email.toLowerCase() === wanted) ?? null;
    },

    async create(input) {
      const record: Client = { ...input, id: makeId("cli"), createdAt: now() };
      return clients.insert(record);
    },

    async update(id, patch) {
      return clients.patch(id, patch);
    },

    async list() {
      return clients.readAll();
    },
  },

  orders: {
    async list(clientId) {
      const all = await orders.readAll();
      const sorted = all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      return clientId ? sorted.filter((o) => o.clientId === clientId) : sorted;
    },

    async getById(id) {
      return orders.getById(id);
    },

    async create(input) {
      const record: Order = { ...input, id: makeId("ord"), status: input.status ?? "pending", createdAt: now() };
      return orders.insert(record);
    },

    async update(id, patch) {
      return orders.patch(id, patch);
    },
  },
};
