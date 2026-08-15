/**
 * Konversi jam lokal ↔ UTC untuk TIGA zona waktu Indonesia (dok 05 §4:
 * WIB/WITA/WIT) — bukan util timezone generik. Aman dihardcode: ketiga
 * zona ini offset TETAP sepanjang tahun (tidak ada DST di Indonesia),
 * beda dari kebanyakan util timezone yang harus menangani pergantian
 * musim. Ditulis sendiri (bukan menambah dependency date-fns-tz/luxon
 * yang belum ada di package.json) karena cakupannya sengaja sempit.
 */
const OFFSET_HOURS: Record<string, number> = {
  "Asia/Jakarta": 7,
  "Asia/Makassar": 8,
  "Asia/Jayapura": 9,
};

function offsetFor(timezone: string): number {
  return OFFSET_HOURS[timezone] ?? 7; // WIB sebagai jatuh balik yang masuk akal
}

/** Date (instan UTC) -> string "YYYY-MM-DDTHH:mm" untuk <input
    type="datetime-local">, menampilkan jam DI ZONA tsb (bukan zona
    browser). */
export function toLocalInputValue(date: Date, timezone: string): string {
  const shifted = new Date(date.getTime() + offsetFor(timezone) * 60 * 60 * 1000);
  const iso = shifted.toISOString();
  return iso.slice(0, 16); // "YYYY-MM-DDTHH:mm"
}

/** Kebalikannya — string dari <input type="datetime-local"> (dianggap
    jam DI ZONA tsb) -> Date (instan UTC) sungguhan untuk disimpan. */
export function fromLocalInputValue(value: string, timezone: string): Date {
  const naiveUtc = new Date(`${value}:00Z`);
  return new Date(naiveUtc.getTime() - offsetFor(timezone) * 60 * 60 * 1000);
}
