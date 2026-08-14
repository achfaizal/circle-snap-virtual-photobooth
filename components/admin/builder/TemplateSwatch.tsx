import type { ThemeColors } from "@/lib/models/theme";
import type { PlaygroundTemplate } from "@/lib/services/playgroundTemplates";

const SHAPE_RADIUS: Record<string, number> = { pill: 999, rounded: 12, square: 3 };

/** Pita 5 warna + contoh huruf untuk kartu template di menu Template
    (EventTemplatePicker.tsx) — klien menilai template dengan MELIHAT,
    bukan membaca nama paletnya. */
export default function TemplateSwatch({ t }: { t: PlaygroundTemplate }) {
  const strip: (keyof ThemeColors)[] = ["ink", "film", "flash", "brandGold", "paper"];
  return (
    <span className="block overflow-hidden" style={{ borderRadius: 10 }}>
      <span
        className="grid place-items-center"
        style={{ background: t.colors.ink, height: 58, position: "relative" }}
      >
        <span
          style={{
            fontFamily: `var(--font-${t.fontDisplayId})`,
            fontSize: 19,
            color: t.colors.paper,
            lineHeight: 1,
          }}
        >
          Nama Acara
        </span>
        <span
          style={{
            position: "absolute",
            bottom: 8,
            width: 46,
            height: 9,
            borderRadius: SHAPE_RADIUS[t.elements.buttonShape ?? "pill"],
            background: `linear-gradient(135deg, ${t.colors.brandPurple}, ${t.colors.brandGold})`,
          }}
        />
      </span>
      <span className="flex" style={{ height: 8 }}>
        {strip.map((k) => (
          <span key={k} style={{ background: t.colors[k], flex: 1 }} />
        ))}
      </span>
    </span>
  );
}
