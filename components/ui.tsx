import type { BandLabel } from "@/lib/engine/constants";
import { MAX_SCORE } from "@/lib/engine/constants";

const BAND_STYLES: Record<BandLabel, { text: string; fill: string; chip: string }> = {
  "Strong fit": { text: "text-emerald-700", fill: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
  "Good fit": { text: "text-sky-700", fill: "bg-sky-500", chip: "bg-sky-50 text-sky-700 ring-1 ring-sky-200" },
  Stretch: { text: "text-amber-700", fill: "bg-amber-500", chip: "bg-amber-50 text-amber-800 ring-1 ring-amber-200" },
  "Weak fit": { text: "text-rose-700", fill: "bg-rose-500", chip: "bg-rose-50 text-rose-700 ring-1 ring-rose-200" },
};

export function bandStyle(band: BandLabel) {
  return BAND_STYLES[band];
}

/** Five segments, each filled proportionally, so 3.4 shows three full and one 40% segment. */
export function ScoreMeter({ score, band, size = "md" }: { score: number; band: BandLabel; size?: "sm" | "md" | "lg" }) {
  const h = size === "lg" ? "h-3" : size === "sm" ? "h-1.5" : "h-2";
  const w = size === "lg" ? "w-12" : size === "sm" ? "w-5" : "w-8";
  return (
    <div className="flex gap-1" role="img" aria-label={`${score} out of ${MAX_SCORE}`}>
      {Array.from({ length: MAX_SCORE }, (_, i) => {
        const fill = Math.max(0, Math.min(1, score - i));
        return (
          <div key={i} className={`${h} ${w} overflow-hidden rounded-full bg-slate-200`}>
            <div className={`h-full ${bandStyle(band).fill}`} style={{ width: `${fill * 100}%` }} />
          </div>
        );
      })}
    </div>
  );
}

export function ScoreBadge({ score, band }: { score: number; band: BandLabel }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <span className={`text-lg font-semibold tabular-nums ${bandStyle(band).text}`}>
        {score.toFixed(1)}
        <span className="text-xs font-normal text-slate-400"> / {MAX_SCORE}</span>
      </span>
      <ScoreMeter score={score} band={band} size="sm" />
    </div>
  );
}

export function BandChip({ band }: { band: BandLabel }) {
  return <span className={`chip ${bandStyle(band).chip}`}>{band}</span>;
}

export function Alert({ error, message }: { error?: string; message?: string }) {
  if (!error && !message) return null;
  return (
    <div
      role={error ? "alert" : "status"}
      className={`mb-4 rounded-lg px-4 py-3 text-sm ${error ? "bg-rose-50 text-rose-800 ring-1 ring-rose-200" : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"}`}
    >
      {error ?? message}
    </div>
  );
}
