"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Search } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  /** Isi sel. String/number dirender apa adanya; ReactNode untuk badge dll. */
  cell: (row: T) => React.ReactNode;
  /** Nilai untuk MENGURUTKAN & MENCARI — dipisah dari `cell` karena sel
      bisa berupa badge/ikon yang tidak bisa dibandingkan. Tanpa ini,
      kolom berisi elemen React akan terurut berdasarkan "[object Object]". */
  sortValue?: (row: T) => string | number;
  align?: "left" | "right";
  width?: number;
}

/**
 * Tabel data untuk panel staff: cari, urutkan, halaman.
 *
 * Sengaja tanpa pustaka tabel pihak ketiga — yang dibutuhkan cuma tiga
 * hal di atas untuk daftar puluhan-ratusan baris, sementara pustaka
 * tabel membawa bundel besar dan gaya sendiri yang harus dilawan supaya
 * cocok dengan sistem desain admin.
 *
 * Pencarian & pengurutan berjalan di KLIEN atas data yang sudah dikirim
 * server. Batas wajarnya ribuan baris; kalau nanti melewati itu,
 * pindahkan ke server lewat query param — jangan tambal dengan
 * virtualisasi, karena yang mahal transfernya, bukan render-nya.
 */
export default function DataTable<T>({
  rows,
  columns,
  getRowKey,
  searchPlaceholder = "Cari…",
  emptyTitle = "Belum ada data",
  emptyHint,
  pageSize = 15,
}: {
  rows: T[];
  columns: Column<T>[];
  getRowKey: (row: T) => string;
  searchPlaceholder?: string;
  emptyTitle?: string;
  emptyHint?: string;
  pageSize?: number;
}) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [asc, setAsc] = useState(true);
  const [page, setPage] = useState(0);

  const searchable = useMemo(
    () => columns.filter((c) => c.sortValue),
    [columns]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      searchable.some((c) => String(c.sortValue!(r)).toLowerCase().includes(q))
    );
  }, [rows, query, searchable]);

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return filtered;
    const out = [...filtered];
    out.sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (typeof av === "number" && typeof bv === "number") return asc ? av - bv : bv - av;
      return asc
        ? String(av).localeCompare(String(bv), "id")
        : String(bv).localeCompare(String(av), "id");
    });
    return out;
  }, [filtered, columns, sortKey, asc]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const visible = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const toggleSort = (key: string) => {
    if (sortKey === key) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(true);
    }
    setPage(0);
  };

  return (
    <div>
      <div className="flex items-center justify-between" style={{ gap: 12, marginBottom: 12 }}>
        <div className="relative" style={{ flex: 1, maxWidth: 340 }}>
          <Search
            size={14}
            color="#94A3B8"
            style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }}
            aria-hidden
          />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="admin-input"
            style={{ margin: 0, paddingLeft: 32 }}
          />
        </div>
        <p style={{ fontSize: 12, color: "var(--a-clr-text-muted)", whiteSpace: "nowrap" }}>
          {sorted.length} baris
          {query && rows.length !== sorted.length ? ` dari ${rows.length}` : ""}
        </p>
      </div>

      <div
        style={{
          border: "1px solid var(--a-clr-border)",
          borderRadius: 14,
          background: "white",
          overflowX: "auto",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
          <thead>
            <tr>
              {columns.map((c) => {
                const active = sortKey === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    style={{
                      textAlign: c.align ?? "left",
                      padding: "10px 14px",
                      borderBottom: "1px solid var(--a-clr-border)",
                      background: "var(--a-clr-bg)",
                      width: c.width,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className="inline-flex items-center"
                        style={{
                          gap: 4,
                          background: "none",
                          border: "none",
                          padding: 0,
                          cursor: "pointer",
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                          color: active ? "var(--a-clr-primary)" : "#64748B",
                        }}
                      >
                        {c.header}
                        {active &&
                          (asc ? <ArrowUp size={11} aria-hidden /> : <ArrowDown size={11} aria-hidden />)}
                      </button>
                    ) : (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                          color: "#64748B",
                        }}
                      >
                        {c.header}
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={getRowKey(row)}>
                {columns.map((c) => (
                  <td
                    key={c.key}
                    style={{
                      padding: "11px 14px",
                      borderBottom: "1px solid var(--a-clr-border)",
                      textAlign: c.align ?? "left",
                      fontSize: 13,
                      color: "#0F172A",
                      verticalAlign: "middle",
                    }}
                  >
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {visible.length === 0 && (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>
              {query ? "Tidak ada yang cocok" : emptyTitle}
            </p>
            {(query || emptyHint) && (
              <p style={{ fontSize: 12.5, color: "var(--a-clr-text-muted)", marginTop: 4 }}>
                {query ? `Tidak ada baris yang mengandung “${query}”.` : emptyHint}
              </p>
            )}
          </div>
        )}
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between" style={{ marginTop: 12, gap: 12 }}>
          <p style={{ fontSize: 12, color: "var(--a-clr-text-muted)" }}>
            Halaman {safePage + 1} dari {pageCount}
          </p>
          <div className="flex" style={{ gap: 8 }}>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="admin-btn admin-btn-outline admin-btn-sm disabled:opacity-40"
            >
              Sebelumnya
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={safePage >= pageCount - 1}
              className="admin-btn admin-btn-outline admin-btn-sm disabled:opacity-40"
            >
              Berikutnya
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
