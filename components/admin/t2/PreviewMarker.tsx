"use client";

import { useEffect } from "react";

/** Menandai gerbang penerbitan poin ke-8 sekali per kunjungan halaman
    pratinjau — komponen terpisah (bukan inline di server component)
    karena butuh useEffect. */
export default function PreviewMarker({ templateId }: { templateId: string }) {
  useEffect(() => {
    fetch(`/api/admin/templates/${templateId}/preview`, { method: "POST" }).catch(() => {});
  }, [templateId]);
  return null;
}
